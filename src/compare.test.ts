import { describe, expect, it } from 'vitest';
import { compare, segments, winnerMap, type CompareOption } from './compare';
import { defaultState } from './defaults';
import type { Campaign } from './types';

const s = defaultState.settings;
const c = (id: string, mechanic: Campaign['mechanic'], productIds: string[] = []): Campaign => ({ id, name: '', mechanic, productIds, active: true });
const none: CompareOption = { id: 'none', name: 'none', campaigns: [], stack: {} };
const b4p3: CompareOption = { id: 'b', name: '4 pay 3', campaigns: [c('b', { type: 'buyXPayY', buy: 4, pay: 3 }, ['A'])], stack: {} };
const p10from3: CompareOption = { id: 'p', name: '10% from 3', campaigns: [c('p', { type: 'percentOff', percent: 10, minQty: 3 }, ['A'])], stack: {} };

describe('compare', () => {
  it('splits order sizes by box', () => {
    expect(segments(s, 'A', 24).map((x) => [x.from, x.to])).toEqual([[1, 3], [4, 6], [7, 12], [13, 24]]);
    expect(segments(s, 'A', 5).map((x) => [x.from, x.to])).toEqual([[1, 3], [4, 5]]);
  });
  it('finds the winner in each box range', () => {
    const r = compare(s, 'A', [none, b4p3, p10from3], 12, 'margin');
    // with nothing below 3 pcs, no campaign equals the others on small orders and wins on margin in 1-2
    expect(r.segments[0].winner).toBe(0);
    expect(r.best.length).toBe(12);
    // 4 pay 3 gives away a unit: never the best margin at 4 pcs
    expect(r.best[3]).not.toBe(1);
    expect(r.segments.every((x) => x.wins.reduce((a, b) => a + b, 0) === x.segment.to - x.segment.from + 1)).toBe(true);
  });
  it('maps winners across mixed orders', () => {
    const m = winnerMap(s, 'A', 'B', [none, p10from3], 3, 'profit');
    expect(m[0][0]).toBeNull();
    expect(m[0][1]?.winner).toBe(0); // 1 A: same profit, first option kept
  });
});
