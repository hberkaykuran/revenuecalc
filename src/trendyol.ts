import type { CarrierRates, TrendyolCosts } from './types';

/*
 * Trendyol's seller costs, from public sources (checked 30 September 2026).
 * Every number here is a default the seller can change in Products & costs;
 * the ones that depend on the seller's own agreement are listed in ASSUMPTIONS.
 *
 * Cargo by desi: Trendyol's contracted cargo price list, valid from 13 July 2026,
 * VAT excluded, postal service fee and SMS included:
 *   https://tymp.mncdn.com/prod/documents/engagement/kargo/trendyol_guncel_kargo_fiyatlari.pdf
 * Price tiers (barem), same date: below 200 TL and 200–349.99 TL, up to 10 desi,
 * lower prices when orders meet 1-day handover, Hızlı Teslimat or Bugün Kargoda:
 *   https://ezv.com.tr/blog/trendyol-kargo-ucretleri-guncellendi-13-temmuz-2026
 * Platform service fee per package: 10.99 TL + VAT, 4.99 TL + VAT with Bugün Kargoda (from 15 June 2026):
 *   https://nitru.com/trendyol-kar-hesaplama , https://pazarfiyat.com/blog/51-trendyol-platform-hizmet-bedeli-2026
 * Withholding: 1% of the VAT-excluded sale (Law 7524, Presidential Decision 9284, from 1 January 2025):
 *   https://www.parasut.com/blog/e-ticarette-stopaj-duzenlemesi
 */

export const PRICE_LIST_DATE = '2026-07-13';

const CARRIERS = ['aras', 'dhl', 'kolaygelsin', 'ptt', 'surat', 'tex', 'yurtici'] as const;
const NAMES = ['Aras', 'DHL eCommerce', 'Kolay Gelsin', 'PTT', 'Sürat', 'Trendyol Express (TEX)', 'Yurtiçi'];

// desi 0–50, one column per carrier in the order above (from the PDF)
const DESI = `
88.96 97.99 96.59 77.54 95.54 77.54 121.75
88.96 97.99 96.59 77.54 95.54 77.54 121.75
88.96 97.99 96.59 77.54 95.54 77.54 121.75
100.84 110.99 107.09 96.00 106.45 93.63 132.56
109.90 124.99 118.64 96.00 116.40 101.46 135.41
117.85 137.99 128.09 100.55 122.41 107.98 157.16
128.39 150.99 138.59 106.83 134.48 118.30 164.75
136.17 159.99 148.04 113.15 143.61 125.66 186.34
145.27 169.99 158.54 125.73 152.60 134.21 193.50
153.60 179.99 167.99 138.34 161.73 142.42 205.50
164.23 189.99 179.54 157.26 170.86 153.47 214.59
173.09 199.99 190.04 165.01 182.99 162.13 228.48
179.47 209.99 201.59 173.31 193.34 170.33 242.84
187.61 219.99 212.09 181.63 201.11 178.04 250.52
194.84 229.99 223.64 189.94 206.02 185.17 270.13
202.03 244.98 235.19 198.22 213.51 192.81 284.54
213.36 264.99 246.74 206.52 220.73 200.82 292.69
224.62 280.99 258.29 214.83 232.45 209.70 308.96
235.95 299.99 269.84 223.13 244.17 218.60 324.29
247.24 315.99 281.39 231.45 255.75 227.46 331.02
252.09 334.99 292.94 239.76 267.46 236.21 338.15
264.80 361.99 304.49 248.06 279.46 244.98 357.33
276.40 383.99 316.04 256.36 290.36 254.82 368.35
287.97 410.99 327.59 264.66 300.98 264.97 382.26
298.26 437.99 339.14 272.95 311.75 274.36 389.91
308.50 464.99 350.69 281.27 322.37 283.69 416.23
322.85 491.99 362.24 289.58 332.73 292.73 455.06
335.94 518.99 373.79 297.88 343.09 301.77 476.59
347.66 545.99 385.34 306.18 353.45 310.84 498.16
361.09 572.99 396.89 314.48 363.79 319.89 515.42
371.34 599.99 408.44 322.78 374.15 328.88 520.70
383.12 635.98 418.94 666.93 447.60 394.39 535.65
394.90 671.97 429.44 683.01 460.53 404.79 550.60
406.68 707.96 439.94 699.09 473.61 415.21 565.55
418.46 743.95 450.44 715.18 486.56 425.61 580.50
430.24 779.94 460.94 731.25 499.64 436.04 595.45
442.02 815.93 471.44 747.34 512.59 446.43 610.40
453.80 851.92 481.94 763.41 525.67 456.86 625.35
465.58 887.91 492.44 779.50 538.75 467.29 640.30
477.36 923.90 502.94 795.57 551.69 477.69 655.25
489.14 959.89 513.44 811.66 570.90 489.37 670.20
500.92 995.88 523.94 827.73 583.98 499.80 685.15
512.70 1031.87 534.44 843.82 597.20 510.26 700.10
524.48 1067.86 544.94 859.90 610.28 520.68 715.05
536.26 1103.85 555.44 875.98 623.50 531.13 730.00
548.04 1139.84 565.94 892.06 636.71 541.59 744.95
559.82 1175.83 576.44 908.14 649.79 552.02 759.90
571.60 1211.82 586.94 924.22 663.01 562.47 774.85
583.38 1247.81 597.44 940.31 676.09 572.89 789.80
595.17 1283.80 607.94 956.38 689.31 583.35 804.75
606.95 1319.79 618.44 972.47 702.52 593.80 819.70`;

// price tiers: [below 200, 200–349.99]
const BAREM_FAST = [[48.33, 79.16], [57.08, 87.91], [55.83, 86.66], [34.16, 65.83], [54.58, 85.41], [34.16, 65.83], [83.33, 113.33]];
const BAREM_STANDARD = [[80.83, 86.24], [89.58, 94.99], [88.33, 93.74], [68.74, 74.16], [87.08, 92.49], [68.74, 74.16], [114.16, 119.16]];

/** Trendyol's contracted prices for the common carriers (VAT excluded). */
export function trendyolCarriers(): CarrierRates[] {
  const rows = DESI.trim().split('\n').map((l) => l.trim().split(/\s+/).map(Number));
  return CARRIERS.map((id, i) => {
    const desi = rows.map((r) => r[i]);
    return {
      id, name: NAMES[i], desi,
      perDesiAbove: Math.round((desi[desi.length - 1] - desi[desi.length - 2]) * 100) / 100,
      baremFast: [...BAREM_FAST[i]], baremStandard: [...BAREM_STANDARD[i]],
    };
  });
}

export function defaultTrendyolCosts(): TrendyolCosts {
  return {
    carrierId: 'tex',
    carriers: trendyolCarriers(),
    baremLimits: [200, 350],
    baremMaxDesi: 10,
    fastShipping: false,
    serviceFee: 10.99,
    serviceFeeSameDay: 4.99,
    sameDay: false,
    serviceVatRate: 20,
    withholdingRate: 1,
    deductWithholding: false,
  };
}

/** Which carrier's prices are in use. */
export const carrierOf = (c: TrendyolCosts) => c.carriers.find((x) => x.id === c.carrierId) ?? c.carriers[0];

const EPS = 1e-9;

/** Cargo price for one shipment (VAT excluded), and the price tier it fell in (null = by desi). */
export function trendyolShipping(c: TrendyolCosts, desi: number, orderTotal: number): { price: number; tier: number | null } {
  const rates = carrierOf(c);
  if (desi <= EPS || !rates) return { price: 0, tier: null };
  if (desi <= c.baremMaxDesi + EPS) {
    // tiers are "0–199.99", "200–349.99": the total must be below the limit by at least a kuruş
    const tier = c.baremLimits.findIndex((l) => orderTotal < l - 0.005);
    const price = (c.fastShipping ? rates.baremFast : rates.baremStandard)[tier];
    if (tier >= 0 && price !== undefined) return { price, tier };
  }
  const d = Math.ceil(desi - EPS);
  const last = rates.desi.length - 1;
  if (last < 0) return { price: 0, tier: null };
  return { price: d <= last ? rates.desi[d] : rates.desi[last] + (d - last) * rates.perDesiAbove, tier: null };
}

/** Platform service fee per package, VAT excluded. */
export const serviceFee = (c: TrendyolCosts) => (c.sameDay ? c.serviceFeeSameDay : c.serviceFee);

/** What the seller must check against their own contract and panel (English UI strings, translated in tr.ts). */
export const ASSUMPTIONS: { text: string; source: string }[] = [
  { text: 'Cargo prices are Trendyol\'s contracted list of 13 July 2026, VAT excluded. With your own cargo agreement, enter your prices.', source: 'https://tymp.mncdn.com/prod/documents/engagement/kargo/trendyol_guncel_kargo_fiyatlari.pdf' },
  { text: 'Price tiers (below 200 TL, 200–349.99 TL, up to 10 desi) are taken on what the customer pays for the order after discounts, VAT included. Trendyol does not say this publicly; check a few invoices.', source: 'https://ezv.com.tr/blog/trendyol-kargo-ucretleri-guncellendi-13-temmuz-2026' },
  { text: 'The lower tier prices need 1-day handover, Hızlı Teslimat or Bugün Kargoda, met on each order.', source: 'https://ezv.com.tr/blog/trendyol-kargo-ucretleri-guncellendi-13-temmuz-2026' },
  { text: 'The customer pays no shipping; you pay the cargo invoice.', source: 'https://yengec.co/blog/trendyol-kargo-ucretleri/' },
  { text: 'Platform service fee: 10.99 TL + VAT per package, 4.99 TL + VAT with Bugün Kargoda shipped the same day (from 15 June 2026).', source: 'https://nitru.com/trendyol-kar-hesaplama' },
  { text: 'Commission is the rate times the price the customer pays, VAT included, with 20% VAT inside the commission invoice. Check one commission invoice.', source: 'https://nitru.com/trendyol-kar-hesaplama' },
  { text: 'Each order ships as one package. Split packages pay cargo and the service fee each.', source: 'https://pazarfiyat.com/blog/51-trendyol-platform-hizmet-bedeli-2026' },
  { text: 'Withholding (stopaj) is 1% of the sale without VAT, kept from your payout. It is credited against your income or corporate tax, so it is shown separately unless you choose to count it.', source: 'https://www.parasut.com/blog/e-ticarette-stopaj-duzenlemesi' },
];
