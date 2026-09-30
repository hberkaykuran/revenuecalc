import { describe, expect, it } from 'vitest';
import { calcOrder, calcWith, combinations, lineTotal, packBoxes, shelfPrice, tariffPrice } from './engine';
import { defaultState } from './defaults';
import { migrate } from './store';
import type { Campaign, Mechanic, Settings } from './types';

const s0: Settings = { ...defaultState.settings, ephRate: 0, boxes: defaultState.settings.boxes.map((b) => ({ ...b, packagingCost: 0 })) };
let n = 0;
const camp = (mechanic: Mechanic, productIds: string[] = [], active = true): Campaign => ({ id: `c${n++}`, name: '', mechanic, productIds, active });

describe('packing and tariff', () => {
  const boxes = s0.boxes;
  it('picks the smallest box that fits, then whole large boxes', () => {
    expect(packBoxes(3, boxes).map((b) => b.id)).toEqual(['small']);
    expect(packBoxes(4, boxes).map((b) => b.id)).toEqual(['medium']);
    expect(packBoxes(7, boxes).map((b) => b.id)).toEqual(['large']);
    expect(packBoxes(13, boxes).map((b) => b.id)).toEqual(['large', 'large']);
    expect(packBoxes(13, boxes, true).map((b) => b.id)).toEqual(['large', 'small']);
  });
  it('looks up by total desi', () => {
    expect(tariffPrice(1, s0.tariff, 0)).toBe(88);
    expect(tariffPrice(8, s0.tariff, 0)).toBe(120);
    expect(tariffPrice(40, s0.tariff, 0)).toBeCloseTo(959.6);
  });
});

describe('mechanics', () => {
  it('unit changes', () => {
    expect(lineTotal(2, 100, [{ type: 'percentOff', percent: 10, minQty: 0 }])).toBe(180);
    expect(lineTotal(2, 100, [{ type: 'amountOff', amount: 30, minQty: 0 }])).toBe(140);
    expect(lineTotal(2, 134.9, [{ type: 'fixedPrice', price: 109.9, minQty: 0 }])).toBeCloseTo(219.8);
    expect(lineTotal(2, 100, [{ type: 'percentOff', percent: 10, minQty: 3 }])).toBe(200);
  });
  it('line mechanics', () => {
    expect(lineTotal(9, 100, [{ type: 'buyXPayY', buy: 4, pay: 3 }])).toBe(700);
    expect(lineTotal(4, 134.9, [{ type: 'bundlePrice', qty: 3, price: 350 }])).toBeCloseTo(484.9);
    expect(lineTotal(4, 100, [{ type: 'nthOff', n: 2, percent: 50 }])).toBe(300);
    expect(lineTotal(6, 100, [{ type: 'qtyTiers', tiers: [{ minQty: 3, percent: 10 }, { minQty: 6, percent: 20 }] }])).toBe(480);
  });
  it('stacks unit change then bundle', () => {
    expect(lineTotal(4, 100, [{ type: 'buyXPayY', buy: 4, pay: 3 }, { type: 'percentOff', percent: 10, minQty: 0 }])).toBeCloseTo(270);
  });
  it('shelf prices end in 9.90', () => {
    expect(shelfPrice(352)).toBe(349.9);
    expect(shelfPrice(134.9)).toBe(129.9);
  });
});

describe('orders', () => {
  it('single A: commission on products only, VAT not deducted', () => {
    const r = calcWith(s0, { A: 1 }, []);
    expect(r.customerPays).toBeCloseTo(234.9);
    expect(r.commission).toBeCloseTo(134.9 * 0.047);
    expect(r.shippingCost).toBeCloseTo(105.6);
    expect(r.profit).toBeCloseTo(234.9 - 134.9 * 0.047 - 105.6 - 55);
    expect(r.vatPayable).toBeGreaterThan(0);
  });
  it('free shipping after discounts', () => {
    expect(calcWith(s0, { A: 6 }, []).shippingCharged).toBe(0);
    expect(calcWith(s0, { A: 6 }, [camp({ type: 'percentOff', percent: 10, minQty: 0 })]).shippingCharged).toBe(100);
  });
  it('packaging per box', () => {
    const r = calcWith(defaultState.settings, { A: 13 }, []);
    expect(r.packaging).toBe(20);
    expect(r.desi).toBe(8);
  });
  it('cart campaigns check the total after product campaigns', () => {
    const cs = [camp({ type: 'buyXPayY', buy: 4, pay: 3 }, ['A']), camp({ type: 'percentOff', percent: 10, minQty: 0 }, ['B']), camp({ type: 'cartAmount', amount: 100, minAmount: 1000 })];
    const r = calcWith(s0, { A: 4, B: 2 }, cs);
    expect(r.subtotal).toBeCloseTo(1033.8);
    expect(r.productRevenue).toBeCloseTo(933.8);
    expect(r.applied.length).toBe(3);
  });
  it('free-shipping campaign', () => {
    const fs = camp({ type: 'freeShipping', minAmount: 500 });
    expect(calcWith(s0, { A: 4 }, [fs]).shippingCharged).toBe(0);
    expect(calcWith(s0, { A: 3 }, [fs]).shippingCharged).toBe(100);
  });
  it('product-limited campaigns skip other products', () => {
    expect(calcWith(s0, { B: 1 }, [camp({ type: 'fixedPrice', price: 99.9, minQty: 0 }, ['A'])]).productRevenue).toBeCloseTo(349.5);
  });
});

describe('combination rules', () => {
  const a10 = camp({ type: 'percentOff', percent: 10, minQty: 0 }, ['A']);
  const a4p3 = camp({ type: 'buyXPayY', buy: 4, pay: 3 }, ['A']);
  const cart = camp({ type: 'cartAmount', amount: 50, minAmount: 300 });
  it('two campaigns on one product do not stack by default; the customer gets the better one', () => {
    expect(combinations([a10, a4p3], {}).length).toBe(2);
    const r = calcOrder(s0, { A: 4 }, [a10, a4p3], {});
    expect(r.productRevenue).toBeCloseTo(404.7); // 4 pay 3 beats 10%
    expect(r.skipped.map((c) => c.id)).toEqual([a10.id]);
  });
  it('an explicit rule lets them stack', () => {
    const r = calcOrder(s0, { A: 4 }, [a10, a4p3], { [[a10.id, a4p3.id].sort().join('|')]: true });
    expect(r.productRevenue).toBeCloseTo(404.7 * 0.9);
  });
  it('product and cart campaigns stack by default, unless told not to', () => {
    expect(calcOrder(s0, { A: 4 }, [a4p3, cart], {}).applied.length).toBe(2);
    const r = calcOrder(s0, { A: 4 }, [a4p3, cart], { [[a4p3.id, cart.id].sort().join('|')]: false });
    expect(r.applied.length).toBe(1);
  });
  it('inactive campaigns are ignored', () => {
    expect(calcOrder(s0, { A: 4 }, [{ ...a4p3, active: false }], {}).productRevenue).toBeCloseTo(539.6);
  });
});

describe('migration', () => {
  it('keeps settings and running campaigns from v2', () => {
    const v2 = {
      settings: { ...defaultState.settings, products: [{ id: 'A', name: 'A', cost: 60, price: 140, vatRate: 20, sizeUnits: 1 }] },
      productCampaigns: [{ id: 'b4p3', name: 'Buy 4 pay 3', unit: { type: 'none' }, minQty: 0, bundle: { type: 'buyXpayY', buy: 4, pay: 3 } }],
      cartCampaigns: [{ id: 'c', name: 'x', tiers: [{ min: 500, type: 'freeShipping', value: 0 }] }],
      active: { productCampaigns: { A: 'b4p3' }, cartCampaignId: 'c' },
    };
    const s = migrate(v2);
    expect(s.version).toBe(3);
    expect(s.settings.products[0].cost).toBe(60);
    expect(s.settings.deductVat).toBe(false);
    expect(s.campaigns.filter((c) => c.active).map((c) => c.mechanic.type).sort()).toEqual(['buyXPayY', 'freeShipping']);
  });
});
