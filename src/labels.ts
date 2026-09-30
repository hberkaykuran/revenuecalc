import { t, num, pctOf, tl } from './i18n';
import type { Campaign, Mechanic, MechanicType, Product } from './types';

export const TYPE_LABELS: Record<MechanicType, string> = {
  percentOff: '% off each unit',
  amountOff: 'TL off each unit',
  fixedPrice: 'New unit price',
  buyXPayY: 'Buy X pay Y',
  bundlePrice: 'X pieces for a price',
  nthOff: 'Every Nth unit off',
  qtyTiers: 'Quantity tiers',
  cartPercent: '% off the cart',
  cartAmount: 'TL off the cart',
  cartTiers: 'Cart tiers',
  freeShipping: 'Free shipping',
};

export function mechanicLabel(m: Mechanic): string {
  const from = (q: number) => (q > 1 ? ` ${t('from {q} pcs', { q })}` : '');
  switch (m.type) {
    case 'percentOff': return t('{p} off', { p: pctOf(m.percent) }) + from(m.minQty);
    case 'amountOff': return t('{a} TL off each', { a: num(m.amount) }) + from(m.minQty);
    case 'fixedPrice': return t('Price {p} TL', { p: tl(m.price) }) + from(m.minQty);
    case 'buyXPayY': return t('Buy {b} pay {p}', { b: m.buy, p: m.pay });
    case 'bundlePrice': return t('{q} for {p} TL', { q: m.qty, p: tl(m.price) });
    case 'nthOff': return m.percent >= 100 ? t('Every {n}. unit free', { n: m.n }) : t('{n}. unit {p} off', { n: m.n, p: pctOf(m.percent) });
    case 'qtyTiers': return t('Quantity tiers') + ': ' + m.tiers.map((x) => `${x.minQty}+ ${pctOf(x.percent)}`).join(', ');
    case 'cartPercent': return t('{p} off carts over {a} TL', { p: pctOf(m.percent), a: num(m.minAmount) });
    case 'cartAmount': return t('{v} TL off carts over {a} TL', { v: num(m.amount), a: num(m.minAmount) });
    case 'cartTiers': return t('Cart tiers') + ': ' + m.tiers.map((x) => `${num(x.minAmount)}+ ${m.mode === 'percent' ? pctOf(x.value) : `${num(x.value)} TL`}`).join(', ');
    case 'freeShipping': return t('Free shipping over {a} TL', { a: num(m.minAmount) });
  }
}

export function campaignLabel(c: Campaign, products: Product[]): string {
  const base = c.name.trim() || mechanicLabel(c.mechanic);
  if (!c.productIds.length || c.mechanic.type.startsWith('cart') || c.mechanic.type === 'freeShipping') return base;
  const names = products.filter((p) => c.productIds.includes(p.id)).map((p) => p.name);
  return names.length && names.length < products.length ? `${base} · ${names.join(', ')}` : base;
}
