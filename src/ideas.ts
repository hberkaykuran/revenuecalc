import { calcOrder, packBoxes, type Lookup, type OrderResult } from './engine';
import type { AppState, Product, ProductCampaign } from './types';

export type IdeaGoal = {
  productId: string;
  usualQty: number; // what a customer buys today
  goalQty: number; // what you want them to buy
  minMargin: number; // % of what the customer pays, at goal qty
  minCustomerDiscount: number; // % the customer saves at goal qty, so it feels worth it
  maxCustomerDiscount: number;
};

export type Idea = {
  campaign: ProductCampaign;
  atGoal: OrderResult;
  atUsual: OrderResult; // same campaign, customer does not upgrade
  baseUsual: OrderResult; // no campaign, usual qty
  baseGoal: OrderResult; // no campaign, goal qty
  customerDiscount: number; // fraction saved at goal qty
  upliftVsUsual: number; // extra profit per order if the customer moves from usual to goal
  costIfNoUpgrade: number; // profit lost on customers who still buy usual qty
};

/** Round down to a shelf price ending in 9.90 (e.g. 352 -> 349.90). */
export function shelfPrice(x: number): number {
  if (x < 20) return Math.max(0.9, Math.floor(x) - 0.1);
  const p = Math.floor((x + 0.1) / 10) * 10 - 0.1;
  return Math.round(p * 100) / 100;
}

const pct = (n: number) => Math.round(n);

export function candidateCampaigns(p: Product, goal: number): ProductCampaign[] {
  const out: ProductCampaign[] = [];
  const add = (c: Omit<ProductCampaign, 'id' | 'minQty'> & { minQty?: number }) =>
    out.push({ minQty: 0, ...c, id: `idea-${out.length}` });
  const none = { type: 'none' } as const;
  const discounts = [5, 10, 15, 20, 25, 30, 35, 40];

  for (const d of discounts) {
    add({ name: `${d}% off`, unit: { type: 'percent', value: d }, bundle: none });
    if (goal > 1) add({ name: `${d}% off from ${goal} pcs`, unit: { type: 'percent', value: d }, minQty: goal, bundle: none });
    add({ name: `${p.name} fixed ${shelfPrice(p.price * (1 - d / 100)).toFixed(2)}`, unit: { type: 'fixed', value: shelfPrice(p.price * (1 - d / 100)) }, bundle: none, productIds: [p.id] });
  }
  for (let f = 10; f <= p.price * 0.4; f += 10) add({ name: `${f} TL off each`, unit: { type: 'flat', value: f }, bundle: none });
  if (goal > 1) {
    for (let pay = Math.max(1, Math.ceil(goal * 0.5)); pay < goal; pay++)
      add({ name: `Buy ${goal} pay ${pay}`, unit: none, bundle: { type: 'buyXpayY', buy: goal, pay } });
    const seen = new Set<number>();
    for (const d of discounts) {
      const price = shelfPrice(goal * p.price * (1 - d / 100));
      if (seen.has(price)) continue;
      seen.add(price);
      add({ name: `${p.name} ${goal} for ${price.toFixed(2)}`, unit: none, bundle: { type: 'xForPrice', qty: goal, price }, productIds: [p.id] });
      add({ name: `${goal}+ pcs ${d}% off`, unit: none, bundle: { type: 'volume', tiers: [{ minQty: goal, percent: d }] } });
    }
    for (const n of [2, 3, goal]) {
      if (n > goal || n < 2) continue;
      for (const d of [25, 50, 100]) {
        if (d === 100 && n === goal) continue; // same as buy N pay N-1
        add({ name: d === 100 ? `Every ${ordinal(n)} free` : `${ordinal(n)} at ${d}% off`, unit: none, bundle: { type: 'nthDiscount', n, percent: d } });
      }
    }
  }
  // de-duplicate by name
  const byName = new Map(out.map((c) => [c.name, c]));
  return [...byName.values()];
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function generateIdeas(state: AppState, g: IdeaGoal): Idea[] {
  const p = state.settings.products.find((x) => x.id === g.productId);
  if (!p) return [];
  const cands = candidateCampaigns(p, g.goalQty);
  const lookup: Lookup = { productCampaigns: cands, cartCampaigns: state.cartCampaigns };
  const cartId = state.active.cartCampaignId;
  const setup = (cid: string | null) => ({ productCampaigns: { [p.id]: cid }, cartCampaignId: cartId });
  const run = (qty: number, cid: string | null) => calcOrder(state.settings, { [p.id]: qty }, setup(cid), lookup);
  const baseUsual = run(g.usualQty, null);
  const baseGoal = run(g.goalQty, null);

  const ideas: Idea[] = [];
  const seen = new Set<string>();
  for (const c of cands) {
    const atGoal = run(g.goalQty, c.id);
    const atUsual = run(g.usualQty, c.id);
    const customerDiscount = atGoal.list > 0 ? 1 - atGoal.subtotal / atGoal.list : 0;
    if (customerDiscount * 100 < g.minCustomerDiscount - 1e-9) continue;
    if (customerDiscount * 100 > g.maxCustomerDiscount + 1e-9) continue;
    if (atGoal.margin * 100 < g.minMargin) continue;
    // campaigns that give the same result at both quantities are duplicates for this goal
    const key = `${atGoal.profit.toFixed(2)}|${atUsual.profit.toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ideas.push({
      campaign: c, atGoal, atUsual, baseUsual, baseGoal, customerDiscount,
      upliftVsUsual: atGoal.profit - baseUsual.profit,
      costIfNoUpgrade: baseUsual.profit - atUsual.profit,
    });
  }
  return ideas;
}

export type Insight = { productId: string; kind: 'warn' | 'info' | 'good'; text: string };

/** Plain-language observations about where order size changes the economics. */
export function insights(state: AppState, maxQty = 24): Insight[] {
  const out: Insight[] = [];
  const { settings } = state;
  const setup = { productCampaigns: {}, cartCampaignId: null };
  for (const p of settings.products) {
    let prev: OrderResult | null = null;
    for (let q = 1; q <= maxQty; q++) {
      const r = calcOrder(settings, { [p.id]: q }, setup, state);
      if (prev) {
        const delta = r.profit - prev.profit;
        if (!prev.freeShipping && r.freeShipping) {
          out.push({ productId: p.id, kind: delta < 0 ? 'warn' : 'info',
            text: `${p.name}: at ${q} pcs the order reaches free shipping (${settings.freeShippingThreshold} TL). You stop collecting the ${settings.customerShippingFee} TL fee, so unit ${q} adds ${fmt(delta)} TL profit.${delta < 0 ? ` Selling ${q - 1} earns more than ${q}.` : ''}` });
        }
        if (prev.boxes.length !== r.boxes.length || prev.desi !== r.desi) {
          const extra = r.shippingCost + r.packaging - prev.shippingCost - prev.packaging;
          out.push({ productId: p.id, kind: extra > 30 ? 'warn' : 'info',
            text: `${p.name}: unit ${q} moves the order from ${prev.desi} to ${r.desi} desi (${r.boxes.length > 1 ? `${r.boxes.length} boxes` : r.boxes[0].name.toLowerCase()} box). Shipping and packaging go up by ${fmt(extra)} TL.` });
        }
      }
      prev = r;
    }
    const sorted = [...settings.boxes].sort((a, b) => a.capacity - b.capacity);
    const full = sorted.map((b) => Math.floor(b.capacity / p.sizeUnits));
    out.push({ productId: p.id, kind: 'good',
      text: `${p.name}: bundle sizes that fill a box exactly are ${full.join(', ')} pcs. Bundles of those sizes add no shipping cost for the last units.` });
    const q750 = Math.ceil(settings.freeShippingThreshold / p.price - 1e-9);
    const boxAt = packBoxes(q750 * p.sizeUnits, settings.boxes, settings.overflowRemainderBestFit)[0];
    if (boxAt) out.push({ productId: p.id, kind: 'info',
      text: `${p.name}: without a discount, customers reach free shipping from ${q750} pcs (${fmt(q750 * p.price)} TL). A discount on ${q750} pcs pushes that order under the threshold and it pays shipping again.` });
  }
  return out;
}

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export { pct };
