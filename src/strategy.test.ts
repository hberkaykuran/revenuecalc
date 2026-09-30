import { describe, expect, it } from 'vitest';
import { defaultState } from './defaults';
import { calcWith } from './engine';
import { strategyIdeas, type StrategyInput } from './strategy';

const s = defaultState.settings;
const inp: StrategyInput = { goal: 'freeShipping', productId: 'A', otherProductId: 'B', mix: [55, 20, 12, 6, 4, 3], goalQty: 3, minMargin: 0, minSaving: 0, maxSaving: 60, response: 20, combos: true };

describe('free-shipping ideas', () => {
  const ideas = strategyIdeas(s, inp);
  it('every idea gets its target order free shipping', () => {
    expect(ideas.length).toBeGreaterThan(0);
    for (const i of ideas) expect(calcWith(s, i.target, i.campaigns).freeShipping).toBe(true);
  });
  it('never pushes the free-shipping order further away than today (6 pcs of A)', () => {
    for (const i of ideas) expect(i.target.A).toBeLessThanOrEqual(6);
  });
  it('includes bringing free shipping closer', () => {
    expect(ideas.some((i) => i.target.A < 6 && i.campaigns.some((c) => c.mechanic.type === 'freeShipping'))).toBe(true);
  });
  it('counts the shipping fee in what the customer saves', () => {
    const closer = ideas.find((i) => i.target.A === 4 && i.campaigns.length === 1 && i.campaigns[0].mechanic.type === 'freeShipping')!;
    expect(closer).toBeTruthy();
    expect(closer.saving).toBeCloseTo(100 / (4 * 134.9 + 100));
  });
  it('rejects discounts that drop the order below the threshold', () => {
    // 25% off from 6 pcs: 607 TL, no free shipping at 6
    expect(ideas.some((i) => i.campaigns.length === 1 && i.campaigns[0].mechanic.type === 'percentOff' && (i.campaigns[0].mechanic as { percent: number }).percent === 25)).toBe(false);
  });
});

describe('cross-sell ideas', () => {
  it('only suggests rewards that need the pair', () => {
    const ideas = strategyIdeas(s, { ...inp, goal: 'crossSell' });
    expect(ideas.length).toBeGreaterThan(0);
    for (const i of ideas) {
      for (const c of i.campaigns) expect(['cartPercent', 'cartAmount', 'freeShipping']).toContain(c.mechanic.type);
      // a single A must not unlock it
      expect(calcWith(s, { A: 1 }, i.campaigns).applied.length).toBe(0);
    }
  });
});

describe('basket ideas for 6 pieces', () => {
  const ideas = strategyIdeas(s, { ...inp, goal: 'basket', goalQty: 6, minMargin: 20, minSaving: 10, maxSaving: 40 });
  it('never take away free shipping the order had', () => {
    for (const i of ideas) expect(calcWith(s, i.target, i.campaigns).freeShipping).toBe(true);
  });
  it('include mix & match with free shipping by piece count', () => {
    const hit = ideas.find((i) => i.campaigns.length === 2 && i.campaigns.some((c) => c.mechanic.type === 'mixBuyXPayY' && c.mechanic.buy === 6 && c.mechanic.pay === 5)
      && i.campaigns.some((c) => c.mechanic.type === 'freeShipping' && c.mechanic.minItems === 6));
    expect(hit?.breakEven).toBeCloseTo(0.05, 2);
  });
});
