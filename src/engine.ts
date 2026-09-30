import type { Box, Campaign, Cart, CommissionBand, Mechanic, MechanicType, Product, Settings, StackRules, TariffRow } from './types';

const EPS = 1e-9;

// ---------- mechanics ----------

export const PRODUCT_MECHANICS: MechanicType[] = ['percentOff', 'amountOff', 'fixedPrice', 'buyXPayY', 'bundlePrice', 'nthOff', 'qtyTiers'];
export const CART_MECHANICS: MechanicType[] = ['mixBuyXPayY', 'cartPercent', 'cartAmount', 'cartTiers', 'freeShipping'];
const UNIT_MECHANICS: MechanicType[] = ['percentOff', 'amountOff', 'fixedPrice'];

export const isCart = (m: Mechanic | MechanicType) => CART_MECHANICS.includes(typeof m === 'string' ? m : m.type);
/** Mechanics that are limited to chosen products (product campaigns, and mix & match). */
export const hasScope = (m: Mechanic | MechanicType) => { const t = typeof m === 'string' ? m : m.type; return !isCart(t) || t === 'mixBuyXPayY'; };

export type ParamSpec = { key: string; label: string; unit: '%' | 'TL' | 'pcs'; min: number; step: number };

/** Editable numbers of each mechanic (tiers are edited separately). */
export const PARAMS: Record<MechanicType, ParamSpec[]> = {
  percentOff: [{ key: 'percent', label: 'Discount', unit: '%', min: 0, step: 1 }, { key: 'minQty', label: 'From qty', unit: 'pcs', min: 0, step: 1 }],
  amountOff: [{ key: 'amount', label: 'Off each unit', unit: 'TL', min: 0, step: 5 }, { key: 'minQty', label: 'From qty', unit: 'pcs', min: 0, step: 1 }],
  fixedPrice: [{ key: 'price', label: 'New unit price', unit: 'TL', min: 0, step: 5 }, { key: 'minQty', label: 'From qty', unit: 'pcs', min: 0, step: 1 }],
  buyXPayY: [{ key: 'buy', label: 'Buy', unit: 'pcs', min: 1, step: 1 }, { key: 'pay', label: 'Pay', unit: 'pcs', min: 0, step: 1 }],
  bundlePrice: [{ key: 'qty', label: 'Pieces', unit: 'pcs', min: 1, step: 1 }, { key: 'price', label: 'Bundle price', unit: 'TL', min: 0, step: 10 }],
  nthOff: [{ key: 'n', label: 'Every Nth unit', unit: 'pcs', min: 1, step: 1 }, { key: 'percent', label: 'Discount', unit: '%', min: 0, step: 5 }],
  qtyTiers: [],
  mixBuyXPayY: [{ key: 'buy', label: 'Buy any', unit: 'pcs', min: 1, step: 1 }, { key: 'pay', label: 'Pay', unit: 'pcs', min: 0, step: 1 }],
  cartPercent: [{ key: 'percent', label: 'Discount', unit: '%', min: 0, step: 1 }, { key: 'minAmount', label: 'Cart over', unit: 'TL', min: 0, step: 50 }, { key: 'minItems', label: 'From pieces', unit: 'pcs', min: 0, step: 1 }],
  cartAmount: [{ key: 'amount', label: 'Discount', unit: 'TL', min: 0, step: 10 }, { key: 'minAmount', label: 'Cart over', unit: 'TL', min: 0, step: 50 }, { key: 'minItems', label: 'From pieces', unit: 'pcs', min: 0, step: 1 }],
  cartTiers: [],
  freeShipping: [{ key: 'minAmount', label: 'Cart over', unit: 'TL', min: 0, step: 50 }, { key: 'minItems', label: 'From pieces', unit: 'pcs', min: 0, step: 1 }],
};

/** A sensible starting mechanic of a type, sized to the product's price. */
export function defaultMechanic(type: MechanicType, price = 100): Mechanic {
  switch (type) {
    case 'percentOff': return { type, percent: 10, minQty: 0 };
    case 'amountOff': return { type, amount: Math.max(5, Math.round(price * 0.1 / 5) * 5), minQty: 0 };
    case 'fixedPrice': return { type, price: shelfPrice(price * 0.85), minQty: 0 };
    case 'buyXPayY': return { type, buy: 4, pay: 3 };
    case 'bundlePrice': return { type, qty: 3, price: shelfPrice(price * 3 * 0.88) };
    case 'nthOff': return { type, n: 2, percent: 50 };
    case 'qtyTiers': return { type, tiers: [{ minQty: 3, percent: 10 }, { minQty: 6, percent: 15 }] };
    case 'mixBuyXPayY': return { type, buy: 6, pay: 5 };
    case 'cartPercent': return { type, percent: 10, minAmount: 1000 };
    case 'cartAmount': return { type, amount: 100, minAmount: 1000 };
    case 'cartTiers': return { type, mode: 'amount', tiers: [{ minAmount: 750, value: 50 }, { minAmount: 1000, value: 100 }] };
    case 'freeShipping': return { type, minAmount: 500 };
  }
}

/** Round down to a shelf price ending in 9.90 (352 -> 349.90). */
export function shelfPrice(x: number): number {
  if (x < 20) return Math.max(0.9, Math.floor(x) - 0.1);
  return Math.round((Math.floor((x + 0.1) / 10) * 10 - 0.1) * 100) / 100;
}

function unitPrice(price: number, qty: number, mods: Mechanic[]): number {
  let u = price;
  const fixed = mods.filter((m): m is Extract<Mechanic, { type: 'fixedPrice' }> => m.type === 'fixedPrice' && qty >= m.minQty);
  if (fixed.length) u = Math.min(u, ...fixed.map((m) => m.price));
  for (const m of mods) if (m.type === 'percentOff' && qty >= m.minQty) u *= 1 - Math.min(100, m.percent) / 100;
  for (const m of mods) if (m.type === 'amountOff' && qty >= m.minQty) u -= m.amount;
  return Math.max(0, u);
}

/** Line total for `qty` units at unit price `u` under one line mechanic. */
function lineMechanic(qty: number, u: number, m: Mechanic): number {
  switch (m.type) {
    case 'buyXPayY': {
      if (m.buy <= 0 || m.pay < 0 || m.pay >= m.buy) return qty * u;
      const g = Math.floor(qty / m.buy);
      return (qty - g * (m.buy - m.pay)) * u;
    }
    case 'bundlePrice': {
      if (m.qty <= 0) return qty * u;
      const g = Math.floor(qty / m.qty);
      return Math.min(qty * u, g * m.price + (qty - g * m.qty) * u);
    }
    case 'nthOff':
      return m.n > 0 ? qty * u - Math.floor(qty / m.n) * u * Math.min(100, m.percent) / 100 : qty * u;
    case 'qtyTiers': {
      const t = [...m.tiers].sort((a, b) => b.minQty - a.minQty).find((x) => qty >= x.minQty);
      return qty * u * (1 - Math.min(100, t?.percent ?? 0) / 100);
    }
    default:
      return qty * u;
  }
}

/** Line total with a set of product mechanics. Several line mechanics stack as successive discounts. */
export function lineTotal(qty: number, price: number, mechs: Mechanic[]): number {
  if (qty <= 0) return 0;
  const u = unitPrice(price, qty, mechs.filter((m) => UNIT_MECHANICS.includes(m.type)));
  let total = qty * u;
  for (const m of mechs) {
    if (UNIT_MECHANICS.includes(m.type) || isCart(m)) continue;
    if (total <= EPS) break;
    total = lineMechanic(qty, total / qty, m);
  }
  return total;
}

// ---------- boxes & shipping ----------

export function packBoxes(slots: number, boxes: Box[], remainderBestFit = false): Box[] {
  if (slots <= EPS || boxes.length === 0) return [];
  const sorted = [...boxes].sort((a, b) => a.capacity - b.capacity);
  const largest = sorted[sorted.length - 1];
  const fit = (s: number) => sorted.find((b) => s <= b.capacity + EPS) ?? largest;
  if (slots <= largest.capacity + EPS) return [fit(slots)];
  const full = Math.floor((slots + EPS) / largest.capacity);
  const rem = slots - full * largest.capacity;
  const out: Box[] = Array(full).fill(largest);
  if (rem > EPS) out.push(remainderBestFit ? fit(rem) : largest);
  return out;
}

export function tariffPrice(desi: number, tariff: TariffRow[], zone: number): number {
  if (desi <= EPS || tariff.length === 0) return 0;
  const rows = [...tariff].sort((a, b) => a.to - b.to);
  const row = rows.find((r) => desi <= r.to + EPS) ?? rows[rows.length - 1];
  const p = row.prices[zone] ?? row.prices[0] ?? 0;
  return row.perDesi ? p * Math.ceil(desi - EPS) : p;
}

// ---------- combination rules ----------

export const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

const overlaps = (a: Campaign, b: Campaign) =>
  !a.productIds.length || !b.productIds.length || a.productIds.some((p) => b.productIds.includes(p));

/** Default: free shipping stacks with everything; product + cart stack; two campaigns on the same product don't; two cart discounts don't. */
export function defaultStacks(a: Campaign, b: Campaign): boolean {
  if (a.mechanic.type === 'freeShipping' || b.mechanic.type === 'freeShipping') return true;
  const ca = isCart(a.mechanic), cb = isCart(b.mechanic);
  if (ca !== cb) return true;
  if (ca && cb) return false;
  return !overlaps(a, b);
}

export function stacks(rules: StackRules, a: Campaign, b: Campaign): boolean {
  return rules[pairKey(a.id, b.id)] ?? defaultStacks(a, b);
}

/** All maximal sets of campaigns that may run together (Bron–Kerbosch). */
export function combinations(cs: Campaign[], rules: StackRules): Campaign[][] {
  if (cs.length === 0) return [[]];
  const ok = (a: Campaign, b: Campaign) => stacks(rules, a, b);
  const out: Campaign[][] = [];
  const bk = (r: Campaign[], p: Campaign[], x: Campaign[]) => {
    if (!p.length && !x.length) { out.push(r); return; }
    for (const v of [...p]) {
      bk([...r, v], p.filter((u) => u !== v && ok(u, v)), x.filter((u) => ok(u, v)));
      p = p.filter((u) => u !== v);
      x = [...x, v];
    }
  };
  bk([], cs, []);
  return out;
}

// ---------- order ----------

export type LineResult = { productId: string; name: string; qty: number; list: number; afterCampaign: number; afterCart: number; cogs: number; vatRate: number; costVatRate: number; commissionRate: number };

/** Commission rate for a unit price: the matching band, else the flat rate. */
export function commissionRate(unitPrice: number, bands: CommissionBand[] | undefined, flat: number): number {
  if (!bands?.length) return flat;
  const p = Math.round(unitPrice * 100) / 100;
  const b = bands.find((x) => (x.min === null || p >= x.min - 1e-9) && (x.max === null || p <= x.max + 1e-9));
  return b ? b.rate : flat;
}

export type OrderResult = {
  qty: number;
  lines: LineResult[];
  list: number;
  campaignDiscount: number;
  subtotal: number;
  cartDiscount: number;
  productRevenue: number;
  shippingCharged: number;
  freeShipping: boolean;
  customerPays: number;
  commission: number;
  boxes: Box[];
  desi: number;
  shippingTariff: number;
  shippingCost: number;
  packaging: number;
  orderFee: number;
  cogs: number;
  costs: number; // commission + shipping + packaging + goods
  cashProfit: number;
  vatOutput: number;
  vatInput: number;
  vatPayable: number;
  profit: number;
  margin: number;
  totalDiscount: number;
  applied: Campaign[]; // campaigns that changed this order
  skipped: Campaign[]; // active and relevant, but left out by combination rules
};

const vatPart = (gross: number, rate: number) => (gross * rate) / (100 + rate);

const covers = (c: Campaign, p: Product) => !c.productIds.length || c.productIds.includes(p.id);

/** Order totals with exactly these campaigns applied (no combination rules). */
export function calcWith(settings: Settings, cart: Cart, cs: Campaign[]): OrderResult {
  const lines: LineResult[] = [];
  const touched = new Set<string>();
  for (const p of settings.products) {
    const qty = cart[p.id] ?? 0;
    if (qty <= 0) continue;
    const mine = cs.filter((c) => !isCart(c.mechanic) && covers(c, p));
    const list = qty * p.price;
    const after = lineTotal(qty, p.price, mine.map((c) => c.mechanic));
    if (after < list - 0.005) {
      // record which campaigns actually moved the price
      for (const c of mine) if (lineTotal(qty, p.price, [c.mechanic]) < list - 0.005) touched.add(c.id);
    }
    const rate = commissionRate(after / qty, p.commissionBands, settings.commissionRate);
    lines.push({ productId: p.id, name: p.name, qty, list, afterCampaign: after, afterCart: after, cogs: qty * p.cost, vatRate: p.vatRate, costVatRate: p.costVatRate ?? p.vatRate, commissionRate: rate });
  }
  const qty = lines.reduce((s, l) => s + l.qty, 0);
  const list = lines.reduce((s, l) => s + l.list, 0);
  const subtotal = lines.reduce((s, l) => s + l.afterCampaign, 0);

  const reach = (minAmount: number, minItems?: number) => subtotal + EPS >= minAmount && qty >= (minItems ?? 0);
  let cartDiscount = 0;
  for (const c of cs) {
    const m = c.mechanic;
    let d = 0;
    if (m.type === 'cartPercent' && reach(m.minAmount, m.minItems)) d = subtotal * m.percent / 100;
    if (m.type === 'cartAmount' && reach(m.minAmount, m.minItems)) d = m.amount;
    if (m.type === 'mixBuyXPayY' && m.buy > 0 && m.pay >= 0 && m.pay < m.buy) {
      // every piece of the chosen products at its price after product campaigns; the cheapest go free
      const units: number[] = [];
      for (const l of lines) {
        const p = settings.products.find((x) => x.id === l.productId)!;
        if (covers(c, p)) for (let k = 0; k < l.qty; k++) units.push(l.afterCampaign / l.qty);
      }
      units.sort((a, b) => a - b);
      const free = Math.floor(units.length / m.buy) * (m.buy - m.pay);
      d = units.slice(0, free).reduce((a, b) => a + b, 0);
    }
    if (m.type === 'cartTiers') {
      const t = [...m.tiers].sort((a, b) => b.minAmount - a.minAmount).find((x) => subtotal + EPS >= x.minAmount);
      if (t) d = m.mode === 'percent' ? subtotal * t.value / 100 : t.value;
    }
    if (d > 0) { cartDiscount += d; touched.add(c.id); }
  }
  cartDiscount = Math.min(cartDiscount, subtotal);
  for (const l of lines) l.afterCart = subtotal > 0 ? l.afterCampaign * (1 - cartDiscount / subtotal) : 0;
  const productRevenue = subtotal - cartDiscount;

  const storeFree = productRevenue + EPS >= settings.freeShippingThreshold;
  let freeShipping = storeFree;
  for (const c of cs) {
    if (c.mechanic.type === 'freeShipping' && qty > 0 && productRevenue + EPS >= c.mechanic.minAmount && qty >= (c.mechanic.minItems ?? 0)) {
      freeShipping = true;
      if (!storeFree) touched.add(c.id);
    }
  }
  const shippingCharged = qty > 0 && !freeShipping ? settings.customerShippingFee : 0;
  const customerPays = productRevenue + shippingCharged;
  // the band is picked on the unit price the customer sees; commission is taken after cart discounts
  const commission = lines.reduce((sum, l) => sum + l.afterCart * l.commissionRate / 100, 0);

  const slots = settings.products.reduce((s, p) => s + (cart[p.id] ?? 0) * p.sizeUnits, 0);
  const boxes = packBoxes(slots, settings.boxes, settings.overflowRemainderBestFit);
  const desi = boxes.reduce((s, b) => s + b.desi, 0);
  const shippingTariff = tariffPrice(desi, settings.tariff, settings.zoneIndex);
  const shippingNet = shippingTariff * (1 + settings.ephRate / 100);
  const shippingCost = shippingNet * (1 + settings.shippingVatRate / 100);
  const packaging = boxes.reduce((s, b) => s + (b.packagingCost ?? 0), 0);
  const cogs = lines.reduce((s, l) => s + l.cogs, 0);
  const orderFee = qty > 0 ? settings.orderFee ?? 0 : 0;
  const costs = commission + orderFee + shippingCost + packaging + cogs;
  const cashProfit = customerPays - costs;

  const vatOutput = lines.reduce((s, l) => s + vatPart(l.afterCart, l.vatRate), 0) + vatPart(shippingCharged, settings.shippingVatRate);
  const vatInput = lines.reduce((s, l) => s + vatPart(l.cogs, l.costVatRate), 0)
    + shippingNet * settings.shippingVatRate / 100
    + vatPart(commission + orderFee, settings.commissionVatRate)
    + vatPart(packaging, settings.packagingVatRate);
  const vatPayable = vatOutput - vatInput;
  const profit = profitAfterVat(cashProfit, vatPayable, settings.vatMode);

  return {
    qty, lines, list, campaignDiscount: list - subtotal, subtotal, cartDiscount, productRevenue,
    shippingCharged, freeShipping, customerPays, commission, boxes, desi, shippingTariff, shippingCost,
    packaging, orderFee, cogs, costs, cashProfit, vatOutput, vatInput, vatPayable, profit,
    margin: customerPays > 0 ? profit / customerPays : 0,
    totalDiscount: list - productRevenue,
    applied: cs.filter((c) => touched.has(c.id)),
    skipped: [],
  };
}

/** Profit under a VAT treatment (see Settings.vatMode). */
export function profitAfterVat(cashProfit: number, vatPayable: number, mode: Settings['vatMode'] | undefined): number {
  if (mode === 'recoverable') return cashProfit - vatPayable;
  if (mode === 'notRecoverable') return cashProfit - Math.max(0, vatPayable);
  return cashProfit;
}

/** Campaigns that could matter for this cart. */
export function relevant(settings: Settings, cart: Cart, cs: Campaign[]) {
  const inCart = settings.products.filter((p) => (cart[p.id] ?? 0) > 0);
  return cs.filter((c) => isCart(c.mechanic) || inCart.some((p) => covers(c, p)));
}

/**
 * Order totals with the active campaigns. When combination rules conflict,
 * the customer gets the combination that makes their order cheapest,
 * the way marketplaces apply the best offer.
 */
export function calcOrder(settings: Settings, cart: Cart, campaigns: Campaign[], rules: StackRules): OrderResult {
  const cs = relevant(settings, cart, campaigns.filter((c) => c.active));
  const combos = combinations(cs, rules);
  let best: OrderResult | null = null;
  for (const combo of combos) {
    const r = calcWith(settings, cart, combo);
    if (!best || r.customerPays < best.customerPays - 0.005 || (Math.abs(r.customerPays - best.customerPays) < 0.005 && r.profit > best.profit)) best = r;
  }
  const r = best!;
  const appliedIds = new Set(r.applied.map((c) => c.id));
  // anything that would have changed the order on its own but was left out
  r.skipped = cs.filter((c) => !appliedIds.has(c.id) && calcWith(settings, cart, [c]).applied.length > 0);
  return r;
}

export function boxCounts(boxes: Box[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const b of boxes) counts.set(b.name, (counts.get(b.name) ?? 0) + 1);
  return [...counts];
}
