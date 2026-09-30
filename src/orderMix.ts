/**
 * Order sizes seen in real sales: how many orders had 1, 2, 3 … boxes.
 * Counts only (no customer data). Sets and "2 Paket" listings count as their boxes.
 */
export type OrderMix = { id: string; name: string; orders: Record<number, number> };

export const ORDER_MIXES: OrderMix[] = [
  {
    id: 'trendyol-2026-09',
    name: 'Trendyol, September 2026 (572 orders)',
    orders: { 1: 149, 2: 184, 3: 62, 4: 84, 5: 22, 6: 29, 7: 6, 8: 12, 9: 1, 10: 7, 11: 1, 12: 6, 13: 1, 14: 2, 16: 2, 19: 1, 21: 1, 31: 1, 58: 1 },
  },
];

/** Shares of orders for 1 … n-1 boxes and "n or more", as percentages. */
export function mixShares(m: OrderMix, n = 6): number[] {
  const total = Object.values(m.orders).reduce((a, b) => a + b, 0) || 1;
  const out = Array.from({ length: n }, () => 0);
  for (const [k, v] of Object.entries(m.orders)) out[Math.min(Number(k), n) - 1] += v;
  return out.map((v) => Math.round((v / total) * 1000) / 10);
}
