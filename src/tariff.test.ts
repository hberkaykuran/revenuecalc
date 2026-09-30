import { describe, expect, it } from 'vitest';
import { defaultState, defaultTrendyolStore } from './defaults';
import { toView } from './store';
import { evaluateOptions, parseTariff, priceOptions } from './tariff';

const header = ['ÜRÜN İSMİ', 'BARKOD', 'SATICI STOK KODU', 'BEDEN', 'MODEL KODU', 'KATEGORİ', 'MARKA', 'STOK', '1.Fiyat Alt Limit', '2.Fiyat Üst Limiti', '2.Fiyat Alt Limit', '3.Fiyat Üst Limiti', '3.Fiyat Alt Limit', '4.Fiyat Üst Limiti', 'Tarih aralığı (7 Gün)', '1.KOMİSYON', '2.KOMİSYON', '3.KOMİSYON', '4.KOMİSYON', 'KOMİSYONA ESAS FİYAT', 'GÜNCEL KOMİSYON', 'GÜNCEL TSF', 'Müşterinin Gördüğü Güncel Fiyat', 'Güncel Uygulanan Promosyonlar', 'YENİ TSF (FİYAT GÜNCELLE)'];
const rows = [
  header,
  ["Yeşil Çay 16'lı", '8680211790505', '', null, '', 'Yeşil Çay', 'Mesh Stick', 9702, 139.76, 139.75, 133.13, 133.12, 123.83, 123.82, '29 Eylül 08.00-6 Ekim 07.59', 19, 16.3, 15.6, 14.6, 149.9, 19, 149.9, 149.9, null, null],
  ['Yaseminli 2 Paket', '8683295371226', '', null, '', 'Yeşil Çay', 'Mesh Stick', 9916, 306.26, 306.25, 287.8, 287.79, 262.91, 262.9, '29 Eylül 08.00-6 Ekim 07.59', 19, 16.2, 15.3, 13.9, 276.37, 15.3, 349.9, 276.37, 'Flaş Fiyatı: 276.37₺', null],
];

describe('Trendyol tariff', () => {
  const t = parseTariff(rows);
  it('reads the bands and prices', () => {
    expect(t.period).toBe('29 Eylül 08.00-6 Ekim 07.59');
    expect(t.offers).toHaveLength(2);
    expect(t.offers[0].bands).toEqual([
      { min: 139.76, max: null, rate: 19 }, { min: 133.13, max: 139.75, rate: 16.3 },
      { min: 123.83, max: 133.12, rate: 15.6 }, { min: null, max: 123.82, rate: 14.6 },
    ]);
    expect(t.offers[1].customerPrice).toBe(276.37);
    expect(t.newPriceColumn).toBe(24);
  });
  it('offers the top price of each band', () => {
    expect(priceOptions(t.offers[0]).map((o) => o.price)).toEqual([149.9, 139.75, 133.12, 123.82]);
    expect(priceOptions(t.offers[0])[0].current).toBe(true);
  });
  it('evaluates each option with the matching commission', () => {
    const s = { ...defaultState.settings, products: [{ id: 'p', name: 'x', cost: 50, price: 149.9, vatRate: 20, sizeUnits: 1 }] };
    const r = evaluateOptions(s, 'p', t.offers[0]);
    expect(r.map((o) => o.rate)).toEqual([19, 16.3, 15.6, 14.6]);
    expect(r[1].commission).toBeCloseTo(139.75 * 0.163);
  });
  it('adds the highest price under each cargo price tier', () => {
    const o = t.offers[1]; // 276.37 TL today
    const opts = priceOptions(o, [200, 350], 1);
    expect(opts.find((x) => x.tierIndex === 0)?.price).toBe(199.99);
    expect(opts.find((x) => x.tierIndex === 1)).toBeUndefined(); // already under 350
    expect(priceOptions(o, [200, 350], 2).find((x) => x.tierIndex === 1)?.price).toBe(174.99);
  });
  it('evaluates with Trendyol cargo tiers', () => {
    const base = toView(structuredClone(defaultTrendyolStore)).settings;
    const s = { ...base, products: [{ id: 'p', name: 'x', cost: 100, price: 276.37, vatRate: 20, sizeUnits: 1 }] };
    const r = evaluateOptions(s, 'p', t.offers[1]);
    const now = r.find((x) => x.current)!, under = r.find((x) => x.tierIndex === 0)!;
    expect(now.shippingTier).toBe(1);
    expect(under.shippingTier).toBe(0);
    expect(under.rate).toBe(13.9);
    expect(now.shippingCost - under.shippingCost).toBeCloseTo((74.16 - 68.74) * 1.2);
  });
  it('rejects other files', () => {
    expect(() => parseTariff([['a', 'b'], [1, 2]])).toThrow();
  });
});
