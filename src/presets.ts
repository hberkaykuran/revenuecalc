import { shelfPrice } from './engine';
import type { Mechanic, MechanicType } from './types';

/** Quick choices per campaign type. Price-based ones are sized to the product's price. */
export function presets(type: MechanicType, price = 100): Mechanic[] {
  const r5 = (x: number) => Math.max(5, Math.round(x / 5) * 5);
  switch (type) {
    case 'percentOff': return [5, 10, 15, 20, 25, 30].map((percent) => ({ type, percent, minQty: 0 }));
    case 'amountOff': return [0.05, 0.1, 0.15, 0.2, 0.25].map((f) => ({ type, amount: r5(price * f), minQty: 0 }));
    case 'fixedPrice': return [0.95, 0.9, 0.85, 0.8, 0.75].map((f) => ({ type, price: shelfPrice(price * f), minQty: 0 }));
    case 'buyXPayY': return [[3, 2], [4, 3], [5, 4], [6, 5], [6, 4], [12, 10]].map(([buy, pay]) => ({ type, buy, pay }));
    case 'bundlePrice': return [[2, 0.9], [3, 0.88], [3, 0.8], [6, 0.85], [6, 0.8], [12, 0.8]].map(([qty, f]) => ({ type, qty, price: shelfPrice(price * qty * f) }));
    case 'nthOff': return [[2, 25], [2, 50], [3, 50], [3, 100], [6, 100]].map(([n, percent]) => ({ type, n, percent }));
    case 'qtyTiers': return [
      [[3, 10]], [[6, 15]], [[3, 10], [6, 15]], [[2, 5], [3, 10], [6, 15]], [[3, 10], [6, 15], [12, 20]],
    ].map((tiers) => ({ type, tiers: tiers.map(([minQty, percent]) => ({ minQty, percent })) }));
    case 'cartPercent': return [[5, 750], [10, 1000], [15, 1500], [10, 750]].map(([percent, minAmount]) => ({ type, percent, minAmount }));
    case 'cartAmount': return [[50, 500], [75, 750], [100, 1000], [150, 1500], [250, 2000]].map(([amount, minAmount]) => ({ type, amount, minAmount }));
    case 'cartTiers': return [
      { type, mode: 'amount', tiers: [{ minAmount: 750, value: 50 }, { minAmount: 1000, value: 100 }, { minAmount: 1500, value: 200 }] },
      { type, mode: 'percent', tiers: [{ minAmount: 750, value: 5 }, { minAmount: 1000, value: 10 }, { minAmount: 1500, value: 15 }] },
    ];
    case 'freeShipping': return [0, 300, 400, 500, 600].map((minAmount) => ({ type, minAmount }));
  }
}
