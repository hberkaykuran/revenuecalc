import { describe, expect, it } from 'vitest';
import { defaultState } from './defaults';
import { generateIdeas, insights, shelfPrice } from './ideas';

describe('ideas', () => {
  it('shelf prices end in 9.90', () => {
    expect(shelfPrice(352)).toBe(349.9);
    expect(shelfPrice(349.9)).toBe(349.9);
    expect(shelfPrice(134.9)).toBe(129.9);
  });
  it('respects margin and discount limits', () => {
    const ideas = generateIdeas(defaultState, { productId: 'A', usualQty: 1, goalQty: 3, minMargin: 20, minCustomerDiscount: 10, maxCustomerDiscount: 30 });
    expect(ideas.length).toBeGreaterThan(5);
    for (const i of ideas) {
      expect(i.atGoal.margin).toBeGreaterThanOrEqual(0.2);
      expect(i.customerDiscount).toBeGreaterThanOrEqual(0.1 - 1e-9);
      expect(i.atGoal.qty).toBe(3);
    }
  });
  it('flags the free-shipping drop for A', () => {
    expect(insights(defaultState).some((i) => i.productId === 'A' && i.kind === 'warn' && i.text.includes('free shipping'))).toBe(true);
  });
});
