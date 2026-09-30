import { calcWith } from './engine';
import type { CommissionBand, Settings, TariffOffer } from './types';

/** Header names in Trendyol's "Komisyon Tarifeleri" export. */
const H = {
  name: 'ÜRÜN İSMİ', barcode: 'BARKOD', category: 'KATEGORİ', brand: 'MARKA',
  min1: '1.Fiyat Alt Limit', max2: '2.Fiyat Üst Limiti', min2: '2.Fiyat Alt Limit', max3: '3.Fiyat Üst Limiti', min3: '3.Fiyat Alt Limit', max4: '4.Fiyat Üst Limiti',
  period: 'Tarih aralığı (7 Gün)', c1: '1.KOMİSYON', c2: '2.KOMİSYON', c3: '3.KOMİSYON', c4: '4.KOMİSYON',
  base: 'KOMİSYONA ESAS FİYAT', current: 'GÜNCEL KOMİSYON', tsf: 'GÜNCEL TSF', customer: 'Müşterinin Gördüğü Güncel Fiyat',
  promo: 'Güncel Uygulanan Promosyonlar', newPrice: 'YENİ TSF (FİYAT GÜNCELLE)',
} as const;

const norm = (s: unknown) => String(s ?? '').trim().toLocaleLowerCase('tr-TR');
const num = (v: unknown) => {
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v ?? '').replace(/[^\d.,-]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

export type ParsedTariff = { period: string; offers: TariffOffer[]; newPriceColumn: number; barcodeColumn: number; headerRow: number };

/** Read the rows of a tariff sheet (first row with the headers). Throws if the columns are not there. */
export function parseTariff(rows: unknown[][]): ParsedTariff {
  const headerRow = rows.findIndex((r) => r.some((c) => norm(c) === norm(H.barcode)));
  if (headerRow < 0) throw new Error('no header');
  const head = rows[headerRow].map(norm);
  const col = (k: keyof typeof H) => head.indexOf(norm(H[k]));
  const need: (keyof typeof H)[] = ['name', 'barcode', 'min1', 'max2', 'min2', 'max3', 'min3', 'max4', 'c1', 'c2', 'c3', 'c4', 'tsf'];
  for (const k of need) if (col(k) < 0) throw new Error(`missing ${H[k]}`);
  let period = '';
  const offers: TariffOffer[] = [];
  for (const r of rows.slice(headerRow + 1)) {
    const barcode = String(r[col('barcode')] ?? '').trim();
    if (!barcode) continue;
    const g = (k: keyof typeof H) => (col(k) >= 0 ? r[col(k)] : undefined);
    period ||= String(g('period') ?? '').trim();
    const bands: CommissionBand[] = [
      { min: num(g('min1')), max: null, rate: num(g('c1')) },
      { min: num(g('min2')), max: num(g('max2')), rate: num(g('c2')) },
      { min: num(g('min3')), max: num(g('max3')), rate: num(g('c3')) },
      { min: null, max: num(g('max4')), rate: num(g('c4')) },
    ].filter((b) => Number.isFinite(b.rate));
    const tsf = num(g('tsf'));
    const customer = num(g('customer'));
    offers.push({
      barcode, name: String(g('name') ?? '').trim(), category: String(g('category') ?? ''), brand: String(g('brand') ?? ''),
      listPrice: tsf, customerPrice: Number.isFinite(customer) ? customer : tsf,
      commissionBase: Number.isFinite(num(g('base'))) ? num(g('base')) : tsf,
      currentRate: num(g('current')), bands, promo: String(g('promo') ?? '').trim(),
    });
  }
  return { period, offers, newPriceColumn: col('newPrice'), barcodeColumn: col('barcode'), headerRow };
}

export type PriceOption = {
  key: string; label: string; price: number; rate: number; bandIndex: number; current: boolean;
  /** Set on prices just under a cargo price-tier limit: the tier's index. */
  tierIndex?: number;
};

/**
 * The prices worth considering: the current price, the highest price in each
 * band (a lower price in the same band pays the same rate but earns less), and
 * the highest price that keeps an order of `qty` under each cargo price-tier
 * limit (cheaper shipping).
 */
export function priceOptions(o: TariffOffer, tierLimits: number[] = [], qty = 1): PriceOption[] {
  const out: PriceOption[] = [{ key: 'now', label: 'now', price: o.customerPrice, rate: NaN, bandIndex: -1, current: true }];
  o.bands.forEach((b, i) => {
    let price = b.max ?? Math.max(o.listPrice, b.min ?? 0);
    if (b.max === null && o.customerPrice >= (b.min ?? 0)) price = Math.max(o.customerPrice, b.min ?? 0);
    if (!Number.isFinite(price) || price <= 0) return;
    out.push({ key: `b${i + 1}`, label: `${i + 1}`, price: Math.round(price * 100) / 100, rate: b.rate, bandIndex: i, current: false });
  });
  tierLimits.forEach((limit, i) => {
    // the order total must stay at least a kuruş under the limit
    const price = Math.floor(((limit - 0.01) / Math.max(1, qty)) * 100 + 1e-6) / 100;
    if (price <= 0 || price >= o.customerPrice - 0.005 || out.some((x) => Math.abs(x.price - price) < 0.005)) return;
    const band = o.bands.findIndex((b) => (b.min === null || price >= b.min - 1e-9) && (b.max === null || price <= b.max + 1e-9));
    out.push({ key: `t${i}`, label: `<${limit}`, price, rate: o.bands[band]?.rate ?? NaN, bandIndex: -1, current: false, tierIndex: i });
  });
  // when today's price is already a band's top price, show it once
  const same = out.find((x) => !x.current && Math.abs(x.price - o.customerPrice) < 0.005);
  if (same) { same.current = true; out.shift(); }
  return out;
}

export type OptionResult = PriceOption & { profit: number; margin: number; customerPays: number; commission: number; shippingCost: number; shippingTier: number | null };

/** Profit and margin of an order of `qty` at each option, with the channel's costs. */
export function evaluateOptions(settings: Settings, productId: string, o: TariffOffer, qty = 1): OptionResult[] {
  const p = settings.products.find((x) => x.id === productId);
  if (!p) return [];
  return priceOptions(o, settings.trendyol?.baremLimits ?? [], qty).map((opt) => {
    const s = { ...settings, products: settings.products.map((x) => (x.id === productId ? { ...x, price: opt.price, commissionBands: o.bands } : x)) };
    const r = calcWith(s, { [productId]: qty }, []);
    return {
      ...opt, rate: r.lines[0]?.commissionRate ?? opt.rate, profit: r.profit, margin: r.margin, customerPays: r.customerPays,
      commission: r.commission, shippingCost: r.shippingCost, shippingTier: r.shippingTier,
    };
  });
}
