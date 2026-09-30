import { describe, expect, it } from 'vitest';
import { calcOrder, lineTotal, packBoxes, tariffPrice } from './engine';
import { defaultState } from './defaults';
import type { Scenario, Settings } from './types';

const s0: Settings = { ...defaultState.settings, ephRate: 0, deductVat: false };
const lookup = defaultState;
const scen = (a: string | null, b: string | null, cart: string | null = null): Scenario =>
  ({ id: 'x', name: 'x', productCampaigns: { A: a, B: b }, cartCampaignId: cart });

describe('packing', () => {
  const boxes = s0.boxes;
  it('picks the smallest box that fits', () => {
    expect(packBoxes(1, boxes).map((b) => b.id)).toEqual(['small']);
    expect(packBoxes(3, boxes).map((b) => b.id)).toEqual(['small']);
    expect(packBoxes(4, boxes).map((b) => b.id)).toEqual(['medium']);
    expect(packBoxes(7, boxes).map((b) => b.id)).toEqual(['large']);
    expect(packBoxes(12, boxes).map((b) => b.id)).toEqual(['large']);
  });
  it('uses whole large boxes past 12', () => {
    expect(packBoxes(13, boxes).map((b) => b.id)).toEqual(['large', 'large']);
    expect(packBoxes(24, boxes).map((b) => b.id)).toEqual(['large', 'large']);
    expect(packBoxes(13, boxes, true).map((b) => b.id)).toEqual(['large', 'small']);
  });
});

describe('tariff', () => {
  it('looks up by total desi', () => {
    expect(tariffPrice(1, s0.tariff, 0)).toBe(88);
    expect(tariffPrice(4, s0.tariff, 0)).toBe(95);
    expect(tariffPrice(8, s0.tariff, 0)).toBe(120);
    expect(tariffPrice(2.5, s0.tariff, 0)).toBe(95);
    expect(tariffPrice(40, s0.tariff, 0)).toBeCloseTo(959.6);
  });
});

describe('campaigns', () => {
  const [b4p3, , p10, , f30, fx99, x3] = defaultState.productCampaigns;
  it('buy X pay Y', () => {
    expect(lineTotal(4, 100, b4p3)).toBe(300);
    expect(lineTotal(9, 100, b4p3)).toBe(700);
  });
  it('unit discounts', () => {
    expect(lineTotal(2, 100, p10)).toBe(180);
    expect(lineTotal(2, 100, f30)).toBe(140);
    expect(lineTotal(2, 134.9, fx99)).toBe(198);
  });
  it('X for fixed price', () => {
    expect(lineTotal(4, 134.9, x3)).toBeCloseTo(484.9);
  });
});

describe('orders', () => {
  it('single A (cash, no EPH)', () => {
    const r = calcOrder(s0, { A: 1 }, scen(null, null), lookup);
    expect(r.customerPays).toBeCloseTo(234.9);
    expect(r.commission).toBeCloseTo(6.3403); // products only
    expect(r.shippingCost).toBeCloseTo(105.6);
    expect(r.profit).toBeCloseTo(234.9 - 6.3403 - 105.6 - 55);
  });
  it('free shipping at 750 after discounts', () => {
    expect(calcOrder(s0, { A: 6 }, scen(null, null), lookup).shippingCharged).toBe(0);
    // 6 × 134.90 at 10% off = 728.46 -> below 750, pays shipping
    expect(calcOrder(s0, { A: 6 }, scen('p10', null), lookup).shippingCharged).toBe(100);
  });
  it('13 A = 2 large = 8 desi', () => {
    const r = calcOrder(s0, { A: 13 }, scen(null, null), lookup);
    expect(r.desi).toBe(8);
    expect(r.shippingCost).toBeCloseTo(144);
  });
  it('mixed campaigns + cart coupon after product discounts', () => {
    // A 4-pay-3: 404.70, B 10% ×2: 629.10 -> 1033.80 ≥ 1000 -> -100
    const r = calcOrder(s0, { A: 4, B: 2 }, scen('b4p3', 'p10', 'c100o1000'), lookup);
    expect(r.subtotal).toBeCloseTo(1033.8);
    expect(r.cartDiscount).toBe(100);
    expect(r.productRevenue).toBeCloseTo(933.8);
    expect(r.commission).toBeCloseTo(933.8 * 0.047);
  });
  it('VAT settlement', () => {
    const s = { ...s0, deductVat: true };
    const r = calcOrder(s, { A: 1 }, scen(null, null), lookup);
    const out = 134.9 / 6 + 100 / 6;
    const inp = 55 / 6 + 88 * 0.2 + (134.9 * 0.047) / 6;
    expect(r.vatPayable).toBeCloseTo(out - inp);
    expect(r.profit).toBeCloseTo(r.cashProfit - (out - inp));
  });
});
