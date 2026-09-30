import { calcOrder, type OrderResult } from './engine';
import type { Campaign, Cart, Settings, StackRules } from './types';

/** One thing to compare: a set of campaigns with its combination rules. */
export type CompareOption = { id: string; name: string; campaigns: Campaign[]; stack: StackRules };

export type Metric = 'margin' | 'profit';
export const metricOf = (r: OrderResult, m: Metric) => (m === 'margin' ? r.margin : r.profit);

export function run(settings: Settings, o: CompareOption, cart: Cart): OrderResult {
  return calcOrder(settings, cart, o.campaigns.map((c) => ({ ...c, active: true })), o.stack);
}

/** Order-size ranges that match the boxes: what fits the smallest box, the next, …, then several boxes. */
export type Segment = { key: string; from: number; to: number; boxName: string | null };

export function segments(settings: Settings, productId: string, maxQty: number): Segment[] {
  const p = settings.products.find((x) => x.id === productId);
  const size = p?.sizeUnits || 1;
  const boxes = [...settings.boxes].sort((a, b) => a.capacity - b.capacity);
  const out: Segment[] = [];
  let from = 1;
  for (const b of boxes) {
    const to = Math.min(maxQty, Math.floor(b.capacity / size + 1e-9));
    if (to >= from) { out.push({ key: b.id, from, to, boxName: b.name }); from = to + 1; }
  }
  if (from <= maxQty) out.push({ key: 'multi', from, to: maxQty, boxName: null });
  return out;
}

export type SegmentResult = {
  segment: Segment;
  averages: number[]; // per option, average metric across the segment's quantities
  winner: number; // option index
  runnerUp: number | null;
  lead: number; // winner minus runner-up
  wins: number[]; // per option, how many quantities in the segment it wins
};

export type Comparison = {
  qtys: number[];
  results: OrderResult[][]; // [option][qty index]
  best: number[]; // winning option index per qty
  segments: SegmentResult[];
};

const argmax = (xs: number[]) => xs.reduce((b, x, i) => (x > xs[b] + 1e-9 ? i : b), 0);

export function compare(settings: Settings, productId: string, options: CompareOption[], maxQty: number, metric: Metric): Comparison {
  const qtys = Array.from({ length: Math.max(1, maxQty) }, (_, i) => i + 1);
  const results = options.map((o) => qtys.map((q) => run(settings, o, { [productId]: q })));
  const best = qtys.map((_, i) => argmax(results.map((rs) => metricOf(rs[i], metric))));
  const segs = segments(settings, productId, maxQty).map((segment) => {
    const idx = qtys.map((q, i) => (q >= segment.from && q <= segment.to ? i : -1)).filter((i) => i >= 0);
    const averages = results.map((rs) => idx.reduce((s, i) => s + metricOf(rs[i], metric), 0) / idx.length);
    const winner = argmax(averages);
    const rest = averages.map((v, i) => (i === winner ? -Infinity : v));
    const runnerUp = options.length > 1 ? argmax(rest) : null;
    const wins = options.map((_, o) => idx.filter((i) => best[i] === o).length);
    return { segment, averages, winner, runnerUp, lead: runnerUp === null ? 0 : averages[winner] - averages[runnerUp], wins };
  });
  return { qtys, results, best, segments: segs };
}

/** Winner for every mix of two products (x across, y down), 0…n each. */
export function winnerMap(settings: Settings, xId: string, yId: string, options: CompareOption[], n: number, metric: Metric) {
  return Array.from({ length: n + 1 }, (_, j) => Array.from({ length: n + 1 }, (__, i) => {
    if (i === 0 && j === 0) return null;
    const rs = options.map((o) => run(settings, o, { [xId]: i, [yId]: j }));
    const w = argmax(rs.map((r) => metricOf(r, metric)));
    const sorted = rs.map((r) => metricOf(r, metric)).sort((a, b) => b - a);
    return { winner: w, results: rs, lead: sorted.length > 1 ? sorted[0] - sorted[1] : 0 };
  }));
}
