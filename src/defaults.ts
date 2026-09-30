import type { AppState, Store } from './types';

const zones = ['Şehir içi', 'Yakın', 'Kısa', 'Orta', 'Uzak'];
const row = (from: number, to: number, p: number, perDesi = false) => ({ from, to, prices: zones.map(() => p), perDesi });

export const defaultState: AppState = {
  version: 3,
  settings: {
    products: [
      { id: 'A', name: 'A', cost: 55, price: 134.9, vatRate: 1, sizeUnits: 1 },
      { id: 'B', name: 'B', cost: 115, price: 349.5, vatRate: 1, sizeUnits: 1 },
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
    commissionVatRate: 0, // Shopify invoices from abroad: no Turkish VAT inside the commission
    customerShippingFee: 100,
    orderFee: 0,
    freeShippingThreshold: 750,
    overflowRemainderBestFit: false,
    vatMode: 'gross',
  },
  // a few examples to start from; all numbers are editable
  campaigns: [
    { id: 'ex1', name: '', mechanic: { type: 'buyXPayY', buy: 4, pay: 3 }, productIds: ['A'], active: false },
    { id: 'ex2', name: '', mechanic: { type: 'percentOff', percent: 10, minQty: 2 }, productIds: ['B'], active: false },
    { id: 'ex3', name: '', mechanic: { type: 'cartAmount', amount: 100, minAmount: 1000 }, productIds: [], active: false },
    { id: 'ex4', name: '', mechanic: { type: 'freeShipping', minAmount: 500 }, productIds: [], active: false },
  ],
  stack: {},
  scenarios: [],
};

const { products, ...shopifySettings } = defaultState.settings;

export const defaultStore: Store = {
  version: 4,
  products: products.map(({ price, ...p }) => ({ ...p, price })),
  channels: [
    {
      id: 'shopify', name: 'Shopify', settings: shopifySettings,
      prices: Object.fromEntries(products.map((p) => [p.id, p.price])), bands: {},
      campaigns: defaultState.campaigns, stack: {}, scenarios: [],
    },
  ],
  channelId: 'shopify',
  tariffHistory: [],
  fixes: ['shopify-commission-vat'],
};
