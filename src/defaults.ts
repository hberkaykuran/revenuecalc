import type { AppState, Bundle, CartCampaign, ProductCampaign, UnitDiscount } from './types';

const zones = ['Şehir içi', 'Yakın', 'Kısa', 'Orta', 'Uzak'];
const row = (from: number, to: number, p: number, perDesi = false) => ({ from, to, prices: zones.map(() => p), perDesi });

const none: UnitDiscount = { type: 'none' };
const noBundle: Bundle = { type: 'none' };
const pc = (id: string, name: string, unit: UnitDiscount, bundle: Bundle = noBundle, extra: Partial<ProductCampaign> = {}): ProductCampaign =>
  ({ id, name, unit, minQty: 0, bundle, ...extra });
const only = (...productIds: string[]) => ({ productIds });

export const presetProductCampaigns: ProductCampaign[] = [
  ...[5, 10, 15, 20, 25, 30].map((v) => pc(`p${v}`, `${v}% off`, { type: 'percent', value: v })),
  pc('p10from3', '10% off from 3 pcs', { type: 'percent', value: 10 }, noBundle, { minQty: 3 }),
  pc('p15from6', '15% off from 6 pcs', { type: 'percent', value: 15 }, noBundle, { minQty: 6 }),
  ...[10, 20, 30, 50].map((v) => pc(`f${v}`, `${v} TL off each`, { type: 'flat', value: v })),
  ...[[3, 2], [4, 3], [5, 4], [6, 5], [6, 4], [12, 10], [12, 9]].map(([b, p]) =>
    pc(`b${b}p${p}`, `Buy ${b} pay ${p}`, none, { type: 'buyXpayY', buy: b, pay: p })),
  pc('n2h50', '2nd at 50% off', none, { type: 'nthDiscount', n: 2, percent: 50 }),
  pc('n2h25', '2nd at 25% off', none, { type: 'nthDiscount', n: 2, percent: 25 }),
  pc('n3h50', '3rd at 50% off', none, { type: 'nthDiscount', n: 3, percent: 50 }),
  pc('n6h100', 'Every 6th free', none, { type: 'nthDiscount', n: 6, percent: 100 }),
  pc('v3-6-12', 'Volume 3+ 10%, 6+ 15%, 12+ 20%', none, { type: 'volume', tiers: [{ minQty: 3, percent: 10 }, { minQty: 6, percent: 15 }, { minQty: 12, percent: 20 }] }),
  pc('v2-3-6', 'Volume 2+ 5%, 3+ 10%, 6+ 15%', none, { type: 'volume', tiers: [{ minQty: 2, percent: 5 }, { minQty: 3, percent: 10 }, { minQty: 6, percent: 15 }] }),
  pc('v6-20', 'Volume 6+ 20%', none, { type: 'volume', tiers: [{ minQty: 6, percent: 20 }] }),
  pc('p10b4p3', '10% off + buy 4 pay 3', { type: 'percent', value: 10 }, { type: 'buyXpayY', buy: 4, pay: 3 }),
  // A (134.90)
  ...[99.9, 109.9, 119.9].map((v) => pc(`A-fx${v}`, `A fixed ${v.toFixed(2)}`, { type: 'fixed', value: v }, noBundle, only('A'))),
  ...[[2, 249.9], [3, 299.9], [3, 349.9], [6, 649.9], [6, 699.9], [12, 1199.9]].map(([q, p]) =>
    pc(`A-${q}for${p}`, `A ${q} for ${p.toFixed(2)}`, none, { type: 'xForPrice', qty: q, price: p }, only('A'))),
  // B (349.50)
  ...[279.9, 299.9, 319.9].map((v) => pc(`B-fx${v}`, `B fixed ${v.toFixed(2)}`, { type: 'fixed', value: v }, noBundle, only('B'))),
  ...[[2, 649.9], [3, 899.9], [6, 1699.9]].map(([q, p]) =>
    pc(`B-${q}for${p}`, `B ${q} for ${p.toFixed(2)}`, none, { type: 'xForPrice', qty: q, price: p }, only('B'))),
];

export const presetCartCampaigns: CartCampaign[] = [
  { id: 'c5o750', name: '5% over 750', tiers: [{ min: 750, type: 'percent', value: 5 }] },
  { id: 'c10o1000', name: '10% over 1000', tiers: [{ min: 1000, type: 'percent', value: 10 }] },
  { id: 'c15o1500', name: '15% over 1500', tiers: [{ min: 1500, type: 'percent', value: 15 }] },
  { id: 'c50o500', name: '50 TL off over 500', tiers: [{ min: 500, type: 'flat', value: 50 }] },
  { id: 'c100o1000', name: '100 TL off over 1000', tiers: [{ min: 1000, type: 'flat', value: 100 }] },
  { id: 'c150o1500', name: '150 TL off over 1500', tiers: [{ min: 1500, type: 'flat', value: 150 }] },
  { id: 'c250o2000', name: '250 TL off over 2000', tiers: [{ min: 2000, type: 'flat', value: 250 }] },
  { id: 'ctierTL', name: 'Tiered 50 / 100 / 200 TL off', tiers: [{ min: 750, type: 'flat', value: 50 }, { min: 1000, type: 'flat', value: 100 }, { min: 1500, type: 'flat', value: 200 }] },
  { id: 'ctierPct', name: 'Tiered 5% / 10% / 15%', tiers: [{ min: 750, type: 'percent', value: 5 }, { min: 1000, type: 'percent', value: 10 }, { min: 1500, type: 'percent', value: 15 }] },
  { id: 'cfs500', name: 'Free shipping over 500', tiers: [{ min: 500, type: 'freeShipping', value: 0 }] },
  { id: 'cfs400', name: 'Free shipping over 400', tiers: [{ min: 400, type: 'freeShipping', value: 0 }] },
  { id: 'cfs500d1000', name: 'Free shipping over 500 + 100 TL off over 1000', tiers: [{ min: 500, type: 'freeShipping', value: 0 }, { min: 1000, type: 'flat', value: 100 }] },
];

export const defaultState: AppState = {
  settings: {
    products: [
      { id: 'A', name: 'A', cost: 55, price: 134.9, vatRate: 20, sizeUnits: 1 },
      { id: 'B', name: 'B', cost: 115, price: 349.5, vatRate: 20, sizeUnits: 1 },
    ],
    boxes: [
      { id: 'small', name: 'Small', desi: 1, capacity: 3, packagingCost: 10 },
      { id: 'medium', name: 'Medium', desi: 2, capacity: 6, packagingCost: 10 },
      { id: 'large', name: 'Large', desi: 4, capacity: 12, packagingCost: 10 },
    ],
    zones,
    zoneIndex: 0,
    tariff: [
      row(0, 2, 88), row(3, 5, 95), row(6, 10, 120), row(11, 15, 170),
      row(16, 20, 200), row(21, 25, 260), row(26, 30, 320), row(31, 99999, 23.99, true),
    ],
    shippingVatRate: 20,
    ephRate: 2.35,
    packagingVatRate: 20,
    commissionRate: 4.7,
    commissionVatRate: 20,
    customerShippingFee: 100,
    freeShippingThreshold: 750,
    overflowRemainderBestFit: false,
    deductVat: true,
  },
  productCampaigns: presetProductCampaigns,
  cartCampaigns: presetCartCampaigns,
  active: { productCampaigns: { A: null, B: null }, cartCampaignId: null },
  scenarios: [
    { id: 'base', name: 'No campaign', productCampaigns: { A: null, B: null }, cartCampaignId: null },
    { id: 's1', name: 'A buy 4 pay 3, B 10%', productCampaigns: { A: 'b4p3', B: 'p10' }, cartCampaignId: null },
    { id: 's2', name: '100 off over 1000', productCampaigns: { A: null, B: null }, cartCampaignId: 'c100o1000' },
    { id: 's3', name: 'A 3 for 349.90 + free shipping over 500', productCampaigns: { A: 'A-3for349.9', B: null }, cartCampaignId: 'cfs500' },
  ],
};
