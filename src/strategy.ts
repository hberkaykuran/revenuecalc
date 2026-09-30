import { calcWith, isCart, packBoxes, PRODUCT_MECHANICS, shelfPrice } from './engine';
import { presets } from './presets';
import type { Campaign, Cart, Mechanic, Settings } from './types';

/**
 * What a campaign is for. Each goal says which customers should change
 * behaviour and how, so a campaign can be judged by how many of them must
 * respond before it earns more than doing nothing.
 */
export type Goal = 'basket' | 'freeShipping' | 'crossSell' | 'conversion';

export type StrategyInput = {
  goal: Goal;
  productId: string;
  otherProductId: string; // cross-sell: the product to add
  mix: number[]; // share of orders buying 1, 2, 3 … units (sums to anything; normalised)
  goalQty: number; // basket goal
  minMargin: number; // % at the target order
  minSaving: number; // % the customer saves on the target order
  maxSaving: number;
  response: number; // % of customers you expect to respond, for the expected-profit column
  combos: boolean; // also try product campaign + cart campaign pairs
};

export type Idea = {
  campaigns: Campaign[];
  target: Cart; // the order the campaign is meant to produce
  targetProfit: number;
  targetMargin: number;
  customerPays: number;
  saving: number; // fraction the customer saves on the target order, shipping fee included
  breakEven: number | null; // share of customers that must respond; 0 = earns more even if nobody does; null = never
  expectedChange: number; // profit per order vs today at the assumed response
  lossIfIgnored: number; // profit lost per order if nobody responds
};

type Basket = { p: number; q: number; cart: Cart };

const mk = (mechanic: Mechanic, productIds: string[], i: number): Campaign =>
  ({ id: `idea${i}`, name: '', mechanic, productIds, active: true });

function baskets(s: Settings, inp: StrategyInput): Basket[] {
  const total = inp.mix.reduce((a, b) => a + b, 0) || 1;
  return inp.mix.map((share, i) => ({ p: share / total, q: i + 1, cart: { [inp.productId]: i + 1 } }));
}

/** Units of a product needed to reach the store's free-shipping threshold. */
export const freeShipQty = (s: Settings, price: number) => Math.max(1, Math.ceil(s.freeShippingThreshold / price - 1e-9));

/** How far below the free-shipping order a customer can be and still add units to reach it. */
export const FREE_SHIPPING_REACH = 2;

/** The order a basket turns into if the customer responds, or null if this goal does not move it. */
function shiftFor(inp: StrategyInput, b: Basket, targetQty: number): Cart | null {
  if (inp.goal === 'basket') return b.q < targetQty ? { [inp.productId]: targetQty } : null;
  if (inp.goal === 'freeShipping') return b.q < targetQty && b.q >= targetQty - FREE_SHIPPING_REACH ? { [inp.productId]: targetQty } : null;
  if (inp.goal === 'crossSell' && inp.otherProductId !== inp.productId) return { ...b.cart, [inp.otherProductId]: 1 };
  return null;
}

function candidates(s: Settings, inp: StrategyInput): Campaign[][] {
  const prod = s.products.find((p) => p.id === inp.productId)!;
  const other = s.products.find((p) => p.id === inp.otherProductId);
  const only = [prod.id];
  const out: Campaign[][] = [];
  let i = 0;
  const push = (...cs: [Mechanic, string[]][]) => out.push(cs.map(([m, ids]) => mk(m, ids, i++)));
  const fq = freeShipQty(s, prod.price);
  const goalQty = inp.goal === 'freeShipping' ? fq : inp.goalQty;
  const threshold = s.freeShippingThreshold;

  const productSide: [Mechanic, string[]][] = [];
  for (const type of PRODUCT_MECHANICS) {
    for (const m of presets(type, prod.price)) {
      productSide.push([m, only]);
      // quantity-triggered versions reward only the customers who buy more
      if ((m.type === 'percentOff' || m.type === 'amountOff' || m.type === 'fixedPrice') && goalQty > 1 && inp.goal !== 'conversion')
        productSide.push([{ ...m, minQty: goalQty }, only]);
    }
  }
  if (goalQty > 1) {
    // bundles sized exactly to the goal
    for (const f of [0.95, 0.9, 0.85, 0.8, 0.75]) productSide.push([{ type: 'bundlePrice', qty: goalQty, price: shelfPrice(prod.price * goalQty * f) }, only]);
    for (let pay = Math.ceil(goalQty / 2); pay < goalQty; pay++) productSide.push([{ type: 'buyXPayY', buy: goalQty, pay }, only]);
    for (const percent of [5, 10, 15, 20]) productSide.push([{ type: 'qtyTiers', tiers: [{ minQty: goalQty, percent }] }, only]);
  }
  if (inp.goal === 'freeShipping' && threshold > 0) {
    // a small reward at the free-shipping order that keeps it at or above the threshold
    const room = 1 - threshold / (fq * prod.price);
    for (const percent of [1, 2, 3, 4, 5, 7].filter((x) => x / 100 <= room + 1e-9)) productSide.push([{ type: 'percentOff', percent, minQty: fq }, only]);
    const prices = new Set([threshold, Math.round(((threshold + fq * prod.price) / 2) / 10) * 10 - 0.1].filter((x) => x >= threshold && x < fq * prod.price));
    for (const price of prices) productSide.push([{ type: 'bundlePrice', qty: fq, price }, only]);
  }
  const cartSide: [Mechanic, string[]][] = [];
  for (const type of ['cartPercent', 'cartAmount', 'freeShipping'] as const) for (const m of presets(type)) cartSide.push([m, []]);
  if (inp.goal === 'freeShipping') {
    // bring free shipping closer: from 2, 3 … pieces instead of the store's threshold
    for (let q = 2; q < fq; q++) cartSide.push([{ type: 'freeShipping', minAmount: Math.floor((q * prod.price) / 10) * 10 }, []]);
  } else {
    // thresholds placed just under the target order, so reaching the goal unlocks them
    const targetValue = inp.goal === 'crossSell' && other ? prod.price + other.price : prod.price * goalQty;
    const near = Math.floor((targetValue * 0.97) / 50) * 50;
    if (near > 0) {
      cartSide.push([{ type: 'freeShipping', minAmount: near }, []]);
      for (const percent of [5, 10]) cartSide.push([{ type: 'cartPercent', percent, minAmount: near }, []]);
      for (const amount of [50, 75, 100]) cartSide.push([{ type: 'cartAmount', amount, minAmount: near }, []]);
    }
  }
  if (inp.goal === 'crossSell' && other) {
    // only rewards the pair unlocks: a discount on the add-on alone would also go to everyone
    // who already buys it, and those orders are not in this model
    const pair = prod.price + other.price;
    const cart: [Mechanic, string[]][] = [];
    for (const f of [0.97, 0.9]) {
      const min = Math.floor((pair * f) / 10) * 10;
      if (min <= prod.price) continue;
      cart.push([{ type: 'freeShipping', minAmount: min }, []]);
      for (const percent of [5, 10, 15]) cart.push([{ type: 'cartPercent', percent, minAmount: min }, []]);
      for (const amount of [25, 50, 75, 100]) cart.push([{ type: 'cartAmount', amount, minAmount: min }, []]);
    }
    for (const c of cart) push(c);
    return out;
  }

  for (const p of productSide) push(p);
  for (const c of cartSide) push(c);
  if (inp.combos) for (const p of productSide) for (const c of cartSide) push(p, c);
  return out;
}

export function strategyIdeas(s: Settings, inp: StrategyInput): Idea[] {
  const prod = s.products.find((p) => p.id === inp.productId);
  if (!prod) return [];
  const bs = baskets(s, inp);
  const profit = (cart: Cart, cs: Campaign[]) => calcWith(s, cart, cs).profit;
  const today = bs.reduce((e, b) => e + b.p * profit(b.cart, []), 0);
  const fq = freeShipQty(s, prod.price);

  const seen = new Set<string>();
  const ideas: Idea[] = [];
  for (const cs of candidates(s, inp)) {
    // the order this campaign aims at
    let targetQty = inp.goal === 'basket' ? inp.goalQty : 1;
    if (inp.goal === 'freeShipping') {
      // the smallest order that ships free with this campaign; it must not be further away than today
      let q = 1;
      while (q <= fq && !calcWith(s, { [prod.id]: q }, cs).freeShipping) q++;
      if (q > fq) continue;
      targetQty = q;
    }
    const target: Cart = inp.goal === 'crossSell' ? { [prod.id]: 1, [inp.otherProductId]: 1 } : { [prod.id]: targetQty };
    const t = calcWith(s, target, cs);
    const before = calcWith(s, target, []);
    // what the customer saves on this order against today's price, shipping fee included
    const saving = before.customerPays > 0 ? 1 - t.customerPays / before.customerPays : 0;
    if (saving * 100 < inp.minSaving - 1e-9 || saving * 100 > inp.maxSaving + 1e-9) continue;
    if (t.margin * 100 < inp.minMargin - 1e-9) continue;
    // a campaign that does nothing to the target order is not an idea for this goal
    if (t.applied.length < cs.length) continue;
    const ignored = bs.reduce((e, b) => e + b.p * profit(b.cart, cs), 0); // nobody changes behaviour
    let gain = 0;
    for (const b of bs) {
      const to = shiftFor(inp, b, targetQty);
      if (to) gain += b.p * (profit(to, cs) - profit(b.cart, cs));
    }
    let breakEven: number | null;
    if (inp.goal === 'conversion') {
      // extra orders needed to make up the lower profit per order
      breakEven = t.profit <= 0 ? null : Math.max(0, today / ignored - 1);
    } else {
      breakEven = ignored >= today ? 0 : gain > 0 ? (today - ignored) / gain : null;
    }
    const r = inp.response / 100;
    const expected = inp.goal === 'conversion' ? ignored * (1 + r) - today : ignored + r * gain - today;
    const key = `${targetQty}|${t.profit.toFixed(2)}|${ignored.toFixed(2)}|${gain.toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ideas.push({
      campaigns: cs, target, targetProfit: t.profit, targetMargin: t.margin, customerPays: t.customerPays, saving,
      breakEven: breakEven !== null && breakEven > 1 && inp.goal !== 'conversion' ? null : breakEven,
      expectedChange: expected, lossIfIgnored: today - ignored,
    });
  }
  return ideas;
}

export type Note = { kind: 'warn' | 'info' | 'good'; text: string; vars: Record<string, string | number> };

/** Where one more unit changes the economics (no campaign running). */
export function notes(s: Settings, productId: string, maxQty = 24): Note[] {
  const p = s.products.find((x) => x.id === productId);
  if (!p) return [];
  const out: Note[] = [];
  let prev = calcWith(s, { [p.id]: 1 }, []);
  for (let q = 2; q <= maxQty; q++) {
    const r = calcWith(s, { [p.id]: q }, []);
    const d = r.profit - prev.profit;
    if (!prev.freeShipping && r.freeShipping)
      out.push({ kind: d < 0 ? 'warn' : 'info', text: d < 0
        ? 'At {q} pcs the order reaches free shipping and you stop collecting the shipping fee. Unit {q} lowers profit by {d} TL, so {prev} pcs earn more than {q}.'
        : 'At {q} pcs the order reaches free shipping and you stop collecting the shipping fee. Unit {q} still adds {d} TL.', vars: { q, prev: q - 1, d: Math.abs(d).toFixed(2) } });
    if (prev.desi !== r.desi) {
      const extra = r.shippingCost + r.packaging - prev.shippingCost - prev.packaging;
      out.push({ kind: extra > 30 ? 'warn' : 'info', text: 'Unit {q} takes the order from {a} to {b} desi. Shipping and packaging go up by {x} TL.', vars: { q, a: prev.desi, b: r.desi, x: extra.toFixed(2) } });
    }
    prev = r;
  }
  const fills = [...s.boxes].sort((a, b) => a.capacity - b.capacity).map((b) => Math.floor(b.capacity / p.sizeUnits));
  out.push({ kind: 'good', text: 'Bundles of {sizes} pcs fill a box exactly, so the last units ship at no extra cost.', vars: { sizes: fills.join(', ') } });
  const fq = freeShipQty(s, p.price);
  const box = packBoxes(fq * p.sizeUnits, s.boxes, s.overflowRemainderBestFit)[0];
  if (box) out.push({ kind: 'info', text: 'Without a discount, orders reach free shipping from {q} pcs. A discount on that order can drop it below the threshold, and the customer pays shipping again.', vars: { q: fq } });
  return out;
}

export { isCart };
