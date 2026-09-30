import { describe, expect, it } from 'vitest';
import { defaultState } from './defaults';
import { calcWith } from './engine';
import { defaultPlan, month } from './monthly';

const s = defaultState.settings;
const calc = (cart: Record<string, number>) => calcWith(s, cart, []);

describe('monthly plan', () => {
  it('adds up the orders', () => {
    const plan = { ...defaultPlan(s), orders: [{ id: 'a', lines: [{ productId: 'A', qty: 1 }], perMonth: 10 }] };
    const m = month(s, plan, calc);
    const one = calc({ A: 1 });
    expect(m.orders).toBe(10);
    expect(m.cashProfit).toBeCloseTo(one.cashProfit * 10);
    expect(m.vatPayable).toBeCloseTo(one.vatPayable * 10);
  });
  it('takes fixed costs, ads and returns and finds break-even', () => {
    const plan = { ...defaultPlan(s), orders: [{ id: 'a', lines: [{ productId: 'A', qty: 3 }], perMonth: 100 }], fixed: [{ id: 'f', name: 'x', amount: 5000, vatRate: 20 }], adPerOrder: 20, adVatRate: 0, returnRate: 2, returnCost: 200, returnVatRate: 20 };
    const m = month(s, plan, calc);
    const one = calc({ A: 3 });
    expect(m.cashProfit).toBeCloseTo(100 * one.cashProfit - 5000 - 2000 - 400);
    expect(m.breakEvenOrders).toBeCloseTo(5000 / (one.cashProfit - 20 - 4));
    expect(m.vatInput).toBeCloseTo(100 * one.vatInput + 5000 / 6 + 400 / 6);
  });
});

describe('real order sizes', () => {
  it('turns September counts into shares for 1…5 and 6+', async () => {
    const { mixShares, ORDER_MIXES } = await import('./orderMix');
    const m = ORDER_MIXES[0];
    expect(Object.values(m.orders).reduce((a, b) => a + b, 0)).toBe(572);
    expect(mixShares(m)).toEqual([26, 32.2, 10.8, 14.7, 3.8, 12.4]);
  });
});
