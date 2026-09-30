import type { AppState } from './types';

const zones = ['Şehir içi', 'Yakın', 'Kısa', 'Orta', 'Uzak'];
const row = (from: number, to: number, p: number, perDesi = false) => ({ from, to, prices: zones.map(() => p), perDesi });

export const defaultState: AppState = {
  settings: {
    products: [
      { id: 'A', name: 'A', cost: 55, price: 134.9, vatRate: 20, sizeUnits: 1 },
      { id: 'B', name: 'B', cost: 115, price: 349.5, vatRate: 20, sizeUnits: 1 },
    ],
    boxes: [
      { id: 'small', name: 'Small', desi: 1, capacity: 3 },
      { id: 'medium', name: 'Medium', desi: 2, capacity: 6 },
      { id: 'large', name: 'Large', desi: 4, capacity: 12 },
    ],
    zones,
    zoneIndex: 0,
    tariff: [
      row(0, 2, 88), row(3, 5, 95), row(6, 10, 120), row(11, 15, 170),
      row(16, 20, 200), row(21, 25, 260), row(26, 30, 320), row(31, 99999, 23.99, true),
    ],
    shippingVatRate: 20,
    ephRate: 2.35,
    commissionRate: 4.7,
    commissionVatRate: 20,
    customerShippingFee: 100,
    freeShippingThreshold: 750,
    overflowRemainderBestFit: false,
    deductVat: true,
  },
  productCampaigns: [
    { id: 'b4p3', name: 'Buy 4 pay 3', unit: { type: 'none' }, minQty: 0, bundle: { type: 'buyXpayY', buy: 4, pay: 3 } },
    { id: 'b3p2', name: 'Buy 3 pay 2', unit: { type: 'none' }, minQty: 0, bundle: { type: 'buyXpayY', buy: 3, pay: 2 } },
    { id: 'p10', name: '10% off', unit: { type: 'percent', value: 10 }, minQty: 0, bundle: { type: 'none' } },
    { id: 'p20', name: '20% off', unit: { type: 'percent', value: 20 }, minQty: 0, bundle: { type: 'none' } },
    { id: 'f30', name: '30 TL off each', unit: { type: 'flat', value: 30 }, minQty: 0, bundle: { type: 'none' } },
    { id: 'fx99', name: 'Fixed 99 TL', unit: { type: 'fixed', value: 99 }, minQty: 0, bundle: { type: 'none' } },
    { id: '3for350', name: '3 for 350 TL', unit: { type: 'none' }, minQty: 0, bundle: { type: 'xForPrice', qty: 3, price: 350 } },
  ],
  cartCampaigns: [
    { id: 'c10o1000', name: '10% over 1000', tiers: [{ min: 1000, type: 'percent', value: 10 }] },
    { id: 'c100o1000', name: '100 TL off over 1000', tiers: [{ min: 1000, type: 'flat', value: 100 }] },
  ],
  scenarios: [
    { id: 'base', name: 'No campaign', productCampaigns: { A: null, B: null }, cartCampaignId: null },
    { id: 's1', name: 'A 4-pay-3, B 10%', productCampaigns: { A: 'b4p3', B: 'p10' }, cartCampaignId: null },
    { id: 's2', name: '100 off over 1000', productCampaigns: { A: null, B: null }, cartCampaignId: 'c100o1000' },
  ],
};
