import type {
  Box, Bundle, Cart, CartCampaign, ProductCampaign, Scenario, Settings, TariffRow, UnitDiscount,
} from './types';

const EPS = 1e-9;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Price of one unit after the per-unit discount. */
export function unitPriceAfter(price: number, d: UnitDiscount): number {
  switch (d.type) {
    case 'percent': return Math.max(0, price * (1 - d.value / 100));
    case 'flat': return Math.max(0, price - d.value);
    case 'fixed': return Math.max(0, d.value);
    default: return price;
  }
}

/** Total for `qty` units at `unitPrice` with a bundle rule. */
export function bundleTotal(qty: number, unitPrice: number, b: Bundle): number {
  if (b.type === 'buyXpayY' && b.buy > 0 && b.pay >= 0 && b.pay < b.buy) {
    const groups = Math.floor(qty / b.buy);
    return (qty - groups * (b.buy - b.pay)) * unitPrice;
  }
  if (b.type === 'xForPrice' && b.qty > 0) {
    const groups = Math.floor(qty / b.qty);
    return groups * b.price + (qty - groups * b.qty) * unitPrice;
  }
  return qty * unitPrice;
}

export function lineTotal(qty: number, price: number, c: ProductCampaign | null | undefined): number {
  if (!c || qty <= 0) return qty * price;
  const unit = qty >= (c.minQty || 0) ? unitPriceAfter(price, c.unit) : price;
  return bundleTotal(qty, unit, c.bundle);
}

/** Boxes needed for `slots` product slots. Overflow past the largest box uses more large boxes. */
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

/** Tariff price (VAT & EPH excluded) for a total desi in a zone. */
export function tariffPrice(desi: number, tariff: TariffRow[], zone: number): number {
  if (desi <= EPS || tariff.length === 0) return 0;
  const rows = [...tariff].sort((a, b) => a.to - b.to);
  const row = rows.find((r) => desi <= r.to + EPS) ?? rows[rows.length - 1];
  const p = row.prices[zone] ?? row.prices[0] ?? 0;
  return row.perDesi ? p * Math.ceil(desi - EPS) : p;
}

export function bestTier(c: CartCampaign | null | undefined, subtotal: number) {
  if (!c) return null;
  const ok = c.tiers.filter((t) => subtotal + EPS >= t.min).sort((a, b) => b.min - a.min);
  return ok[0] ?? null;
}

export function nextTier(c: CartCampaign | null | undefined, subtotal: number) {
  if (!c) return null;
  return c.tiers.filter((t) => t.min > subtotal + EPS).sort((a, b) => a.min - b.min)[0] ?? null;
}

export type LineResult = {
  productId: string;
  name: string;
  qty: number;
  list: number;
  afterCampaign: number;
  afterCart: number;
  cogs: number;
  vatRate: number;
};

export type OrderResult = {
  qty: number;
  lines: LineResult[];
  list: number; // qty * list price
  campaignDiscount: number;
  subtotal: number; // after product campaigns
  cartDiscount: number;
  productRevenue: number; // after all discounts (VAT incl.)
  shippingCharged: number;
  freeShipping: boolean;
  customerPays: number;
  commission: number;
  boxes: Box[];
  desi: number;
  shippingTariff: number; // excl VAT/EPH
  shippingCost: number; // incl VAT & EPH
  cogs: number;
  cashProfit: number;
  vatOutput: number;
  vatInput: number;
  vatPayable: number;
  profit: number;
  margin: number; // profit / customerPays
  totalDiscount: number;
};

export type Lookup = {
  productCampaigns: ProductCampaign[];
  cartCampaigns: CartCampaign[];
};

const vatPart = (gross: number, rate: number) => (gross * rate) / (100 + rate);

export function calcOrder(settings: Settings, cart: Cart, scenario: Scenario | null, lookup: Lookup): OrderResult {
  const lines: LineResult[] = [];
  for (const p of settings.products) {
    const qty = cart[p.id] ?? 0;
    if (qty <= 0) continue;
    const cid = scenario?.productCampaigns[p.id] ?? null;
    const c = cid ? lookup.productCampaigns.find((x) => x.id === cid) : null;
    const list = qty * p.price;
    const after = lineTotal(qty, p.price, c);
    lines.push({
      productId: p.id, name: p.name, qty, list, afterCampaign: after, afterCart: after,
      cogs: qty * p.cost, vatRate: p.vatRate,
    });
  }
  const qty = lines.reduce((s, l) => s + l.qty, 0);
  const list = lines.reduce((s, l) => s + l.list, 0);
  const subtotal = lines.reduce((s, l) => s + l.afterCampaign, 0);

  const cartCampaign = scenario?.cartCampaignId
    ? lookup.cartCampaigns.find((x) => x.id === scenario.cartCampaignId) : null;
  const tier = bestTier(cartCampaign, subtotal);
  let cartDiscount = 0;
  if (tier) cartDiscount = tier.type === 'percent' ? subtotal * tier.value / 100 : Math.min(tier.value, subtotal);
  // spread the cart discount over lines proportionally (matters for mixed VAT rates)
  for (const l of lines) l.afterCart = subtotal > 0 ? l.afterCampaign * (1 - cartDiscount / subtotal) : 0;
  const productRevenue = subtotal - cartDiscount;

  const freeShipping = productRevenue + EPS >= settings.freeShippingThreshold;
  const shippingCharged = qty > 0 && !freeShipping ? settings.customerShippingFee : 0;
  const customerPays = productRevenue + shippingCharged;
  const commission = productRevenue * settings.commissionRate / 100;

  const slots = settings.products.reduce((s, p) => s + (cart[p.id] ?? 0) * p.sizeUnits, 0);
  const boxes = packBoxes(slots, settings.boxes, settings.overflowRemainderBestFit);
  const desi = boxes.reduce((s, b) => s + b.desi, 0);
  const shippingTariff = tariffPrice(desi, settings.tariff, settings.zoneIndex);
  const shippingNet = shippingTariff * (1 + settings.ephRate / 100);
  const shippingCost = shippingNet * (1 + settings.shippingVatRate / 100);

  const cogs = lines.reduce((s, l) => s + l.cogs, 0);
  const cashProfit = customerPays - commission - shippingCost - cogs;

  const vatOutput = lines.reduce((s, l) => s + vatPart(l.afterCart, l.vatRate), 0)
    + vatPart(shippingCharged, settings.shippingVatRate);
  const vatInput = lines.reduce((s, l) => s + vatPart(l.cogs, l.vatRate), 0)
    + shippingNet * settings.shippingVatRate / 100
    + vatPart(commission, settings.commissionVatRate);
  const vatPayable = vatOutput - vatInput;
  const profit = settings.deductVat ? cashProfit - vatPayable : cashProfit;

  return {
    qty, lines, list, campaignDiscount: list - subtotal, subtotal, cartDiscount, productRevenue,
    shippingCharged, freeShipping, customerPays, commission, boxes, desi, shippingTariff, shippingCost,
    cogs, cashProfit, vatOutput, vatInput, vatPayable, profit,
    margin: customerPays > 0 ? profit / customerPays : 0,
    totalDiscount: list - productRevenue,
  };
}

export function boxLabel(boxes: Box[]): string {
  if (boxes.length === 0) return '—';
  const counts = new Map<string, number>();
  for (const b of boxes) counts.set(b.name, (counts.get(b.name) ?? 0) + 1);
  return [...counts].map(([n, c]) => (c > 1 ? `${c}× ${n}` : n)).join(' + ');
}

export { round2 };
