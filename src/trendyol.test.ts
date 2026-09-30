import { describe, expect, it } from 'vitest';
import { defaultStore, defaultTrendyolStore } from './defaults';
import { calcOrder, calcWith } from './engine';
import { fromView, migrate, migrateTrendyol, toView } from './store';
import { carrierOf, defaultTrendyolCosts, trendyolCarriers, trendyolShipping } from './trendyol';
import type { Settings, TrendyolCosts } from './types';

const costs = (patch: Partial<TrendyolCosts> = {}): TrendyolCosts => ({ ...defaultTrendyolCosts(), ...patch });
const ty = (patch: Partial<TrendyolCosts> = {}, products?: Settings['products']): Settings => {
  const s = toView(structuredClone(defaultTrendyolStore)).settings;
  return {
    ...s, trendyol: costs(patch),
    boxes: s.boxes.map((b) => ({ ...b, packagingCost: 0 })),
    products: products ?? [{ id: 'p', name: 'p', cost: 50, price: 149.9, vatRate: 20, sizeUnits: 1 }],
  };
};

describe('Trendyol price list', () => {
  it('has the 13 July 2026 prices', () => {
    const c = Object.fromEntries(trendyolCarriers().map((x) => [x.id, x]));
    expect(c.tex.desi[0]).toBe(77.54);
    expect(c.tex.desi[10]).toBe(153.47);
    expect(c.aras.desi[5]).toBe(117.85);
    expect(c.yurtici.desi[50]).toBe(819.7);
    expect(c.tex.baremFast).toEqual([34.16, 65.83]);
    expect(c.tex.baremStandard).toEqual([68.74, 74.16]);
    expect(c.dhl.baremFast).toEqual([57.08, 87.91]);
    expect(c.tex.desi).toHaveLength(51);
  });
});

describe('Trendyol shipping', () => {
  const c = costs();
  it('prices small orders by price tier', () => {
    expect(trendyolShipping(c, 1, 149.9)).toEqual({ price: 68.74, tier: 0 });
    expect(trendyolShipping(c, 1, 199.99)).toEqual({ price: 68.74, tier: 0 });
    expect(trendyolShipping(c, 1, 200)).toEqual({ price: 74.16, tier: 1 });
    expect(trendyolShipping(c, 1, 349.99)).toEqual({ price: 74.16, tier: 1 });
    expect(trendyolShipping({ ...c, fastShipping: true }, 1, 150)).toEqual({ price: 34.16, tier: 0 });
  });
  it('prices by desi from 350 TL or above 10 desi', () => {
    expect(trendyolShipping(c, 1, 350)).toEqual({ price: 77.54, tier: null });
    expect(trendyolShipping(c, 4, 500)).toEqual({ price: 101.46, tier: null });
    expect(trendyolShipping(c, 2.2, 500).price).toBe(93.63); // rounded up to 3 desi
    expect(trendyolShipping(c, 12, 150)).toEqual({ price: 170.33, tier: null });
  });
  it('goes on per desi above the table', () => {
    const tex = carrierOf(c);
    expect(trendyolShipping(c, 52, 1000).price).toBeCloseTo(tex.desi[50] + 2 * tex.perDesiAbove);
  });
  it('uses the chosen carrier', () => {
    expect(trendyolShipping({ ...c, carrierId: 'aras' }, 1, 500).price).toBe(88.96);
  });
});

describe('Trendyol orders', () => {
  it('seller pays tier cargo, service fee, commission; withholding shown apart', () => {
    const r = calcWith(ty(), { p: 1 }, []);
    expect(r.customerPays).toBeCloseTo(149.9);
    expect(r.shippingCharged).toBe(0);
    expect(r.shippingTier).toBe(0);
    expect(r.shippingCost).toBeCloseTo(68.74 * 1.2);
    expect(r.orderFee).toBeCloseTo(10.99 * 1.2);
    expect(r.commission).toBeCloseTo(149.9 * 0.19);
    expect(r.withholding).toBeCloseTo(149.9 / 1.2 * 0.01);
    expect(r.profit).toBeCloseTo(149.9 - 149.9 * 0.19 - 68.74 * 1.2 - 10.99 * 1.2 - 50);
  });
  it('can count withholding and use the same-day fee', () => {
    const base = calcWith(ty(), { p: 1 }, []);
    const r = calcWith(ty({ deductWithholding: true, sameDay: true }), { p: 1 }, []);
    expect(r.orderFee).toBeCloseTo(4.99 * 1.2);
    expect(r.profit).toBeCloseTo(base.profit + (10.99 - 4.99) * 1.2 - base.withholding);
  });
  it('commission follows the price band of the discounted unit price', () => {
    const bands = [{ min: 139.76, max: null, rate: 19 }, { min: 133.13, max: 139.75, rate: 16.3 }, { min: null, max: 133.12, rate: 14.6 }];
    const s = ty({}, [{ id: 'p', name: 'p', cost: 50, price: 149.9, vatRate: 20, sizeUnits: 1, commissionBands: bands }]);
    const r = calcOrder(s, { p: 1 }, [{ id: 'c', name: '', mechanic: { type: 'fixedPrice', price: 130, minQty: 0 }, productIds: [], active: true }], {});
    expect(r.lines[0].commissionRate).toBe(14.6);
    expect(r.commission).toBeCloseTo(130 * 0.146);
  });
  it('a discount that drops the order under a tier limit lowers cargo', () => {
    const s = ty({}, [{ id: 'p', name: 'p', cost: 50, price: 179.9, vatRate: 20, sizeUnits: 1 }]);
    expect(calcWith(s, { p: 2 }, []).shippingTier).toBe(null);
    const r = calcWith(s, { p: 2 }, [{ id: 'c', name: '', mechanic: { type: 'percentOff', percent: 10, minQty: 0 }, productIds: [], active: true }]);
    expect(r.productRevenue).toBeCloseTo(323.82);
    expect(r.shippingTier).toBe(1);
  });
  it('VAT paid on cargo and the service fee counts as input VAT', () => {
    const r = calcWith(ty(), { p: 1 }, []);
    const expected = 50 / 6 + 68.74 * 0.2 + 10.99 * 0.2 + r.commission / 6;
    expect(r.vatInput).toBeCloseTo(expected);
  });
});

describe('Shopify and Trendyol stay apart', () => {
  it('Shopify orders have no Trendyol costs', () => {
    const s = toView(structuredClone(defaultStore)).settings;
    expect(s.trendyol).toBeUndefined();
    const r = calcWith(s, { A: 1 }, []);
    expect(r.withholding).toBe(0);
    expect(r.shippingTier).toBe(null);
  });
  it('editing Trendyol changes only the Trendyol store', () => {
    const shop = structuredClone(defaultStore);
    const tyStore = structuredClone(defaultTrendyolStore);
    const v = toView(tyStore);
    const next = fromView(tyStore, { ...v, settings: { ...v.settings, products: v.settings.products.map((p) => ({ ...p, cost: 1, price: 99 })) } });
    expect(next.products.every((p) => p.cost === 1)).toBe(true);
    expect(shop).toEqual(defaultStore);
    expect(new Set(next.products.map((p) => p.id))).not.toEqual(new Set(shop.products.map((p) => p.id)));
  });
  it('Shopify data never picks up Trendyol settings', () => {
    const m = migrate({ ...structuredClone(defaultStore), channels: [{ ...defaultStore.channels[0], settings: { ...defaultStore.channels[0].settings, trendyol: defaultTrendyolCosts() } }] });
    expect(m.channels[0].settings.trendyol).toBeUndefined();
  });
  it('takes Trendyol out of data saved with both channels together', () => {
    const legacy = {
      version: 4,
      products: [{ id: 'A', name: 'A', cost: 55, vatRate: 20, sizeUnits: 1 }, { id: 'X', name: 'X', cost: 9, vatRate: 20, sizeUnits: 1, barcode: '869' }],
      channels: [
        defaultStore.channels[0],
        { id: 'trendyol', name: 'Trendyol', settings: { ...defaultStore.channels[0].settings, customerShippingFee: 100, commissionRate: 19 }, prices: { X: 120 }, bands: { X: [{ min: null, max: null, rate: 15 }] }, campaigns: [], stack: {}, scenarios: [] },
      ],
      channelId: 'shopify', tariffHistory: [{ period: 'w1', importedAt: '', offers: [] }],
    };
    const m = migrateTrendyol(legacy)!;
    expect(m.products.map((p) => p.id)).toEqual(['X']);
    expect(m.channels[0].settings.customerShippingFee).toBe(0);
    expect(m.channels[0].settings.trendyol?.carrierId).toBe('tex');
    expect(m.tariffHistory).toHaveLength(1);
    expect(toView(m).settings.products[0].commissionBands).toEqual([{ min: null, max: null, rate: 15 }]);
    expect(migrateTrendyol(structuredClone(defaultStore))).toBeNull();
  });
  it('a Trendyol export reads back the same', () => {
    const s = structuredClone(defaultTrendyolStore);
    expect(migrateTrendyol(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
});
