import { useEffect, useState } from 'react';
import { defaultState, defaultStore } from './defaults';
import type { Lang } from './i18n';
import type { AppState, Campaign, Channel, Mechanic, Store } from './types';

const KEY = 'revenuecalc:v1';
const UI_KEY = 'revenuecalc:ui';

function read(key: string): unknown {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function write(key: string, value: unknown): boolean {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Convert the v1/v2 campaign model: keep settings and the campaigns that were running. */
function fromV2(raw: any): AppState {
  const s: AppState = structuredClone(defaultState);
  if (raw.settings) s.settings = { ...s.settings, ...raw.settings, deductVat: false };
  s.settings.boxes = s.settings.boxes.map((b) => ({ ...b, packagingCost: b.packagingCost ?? 10 }));
  const out: Campaign[] = [];
  const add = (mechanic: Mechanic, productIds: string[]) =>
    out.push({ id: Math.random().toString(36).slice(2, 9), name: '', mechanic, productIds, active: true });
  const active = raw.active ?? {};
  for (const [pid, cid] of Object.entries<string | null>(active.productCampaigns ?? {})) {
    const c = (raw.productCampaigns ?? []).find((x: any) => x.id === cid);
    if (!c) continue;
    const u = c.unit ?? {};
    if (u.type === 'percent') add({ type: 'percentOff', percent: u.value, minQty: c.minQty ?? 0 }, [pid]);
    if (u.type === 'flat') add({ type: 'amountOff', amount: u.value, minQty: c.minQty ?? 0 }, [pid]);
    if (u.type === 'fixed') add({ type: 'fixedPrice', price: u.value, minQty: c.minQty ?? 0 }, [pid]);
    const b = c.bundle ?? {};
    if (b.type === 'buyXpayY') add({ type: 'buyXPayY', buy: b.buy, pay: b.pay }, [pid]);
    if (b.type === 'xForPrice') add({ type: 'bundlePrice', qty: b.qty, price: b.price }, [pid]);
    if (b.type === 'nthDiscount') add({ type: 'nthOff', n: b.n, percent: b.percent }, [pid]);
    if (b.type === 'volume') add({ type: 'qtyTiers', tiers: b.tiers }, [pid]);
  }
  const cc = (raw.cartCampaigns ?? []).find((x: any) => x.id === active.cartCampaignId);
  if (cc) {
    const fs = cc.tiers.filter((x: any) => x.type === 'freeShipping');
    const disc = cc.tiers.filter((x: any) => x.type !== 'freeShipping');
    if (fs.length) add({ type: 'freeShipping', minAmount: Math.min(...fs.map((x: any) => x.min)) }, []);
    if (disc.length === 1) {
      const d = disc[0];
      add(d.type === 'percent' ? { type: 'cartPercent', percent: d.value, minAmount: d.min } : { type: 'cartAmount', amount: d.value, minAmount: d.min }, []);
    } else if (disc.length > 1) {
      add({ type: 'cartTiers', mode: disc[0].type === 'percent' ? 'percent' : 'amount', tiers: disc.map((d: any) => ({ minAmount: d.min, value: d.value })) }, []);
    }
  }
  s.campaigns = [...out, ...s.campaigns];
  return s;
}

export function migrateV3(raw: any): AppState {
  if (!raw || typeof raw !== 'object' || !raw.settings) return structuredClone(defaultState);
  if (raw.version !== 3) return fromV2(raw);
  const d = structuredClone(defaultState);
  return { ...d, ...raw, settings: { ...d.settings, ...raw.settings } };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Any saved data (v1–v4, or a v3 export) as a v4 store. */
export function migrate(raw: any): Store {
  if (raw?.version === 4 && Array.isArray(raw.channels)) {
    const d = structuredClone(defaultStore);
    // Shopify only for now: other channels and their products are left out
    const shop = (raw.channels as Channel[]).find((c) => c.id === 'shopify') ?? d.channels[0];
    const channels = [{ ...shop, settings: { ...d.channels[0].settings, ...shop.settings }, bands: {} }];
    const products = (raw.products as Store['products']).filter((p) => shop.prices[p.id] !== undefined);
    return { ...d, ...raw, products, channels, channelId: 'shopify', tariffHistory: [] };
  }
  if (!raw || typeof raw !== 'object' || !raw.settings) return structuredClone(defaultStore);
  const v3 = migrateV3(raw);
  const { products, ...settings } = v3.settings;
  const prices = Object.fromEntries(products.map((p) => [p.id, p.price]));
  const fullSettings = { ...defaultStore.channels[0].settings, ...settings };
  return {
    version: 4,
    products: products.map(({ commissionBands: _b, ...p }) => p),
    channels: [
      { id: 'shopify', name: 'Shopify', settings: fullSettings, prices, bands: {}, campaigns: v3.campaigns, stack: v3.stack, scenarios: v3.scenarios },
    ],
    channelId: 'shopify',
    tariffHistory: [],
  };
}

export const activeChannel = (s: Store) => s.channels.find((c) => c.id === s.channelId) ?? s.channels[0];

/** The one-channel view the screens work with. */
export function toView(s: Store): AppState {
  const ch = activeChannel(s);
  // a channel shows the products it has a price for
  const products = s.products.filter((p) => ch.prices[p.id] !== undefined).map((p) => ({ ...p, price: ch.prices[p.id], commissionBands: ch.bands[p.id] }));
  return { version: 3, settings: { ...ch.settings, products }, campaigns: ch.campaigns, stack: ch.stack, scenarios: ch.scenarios };
}

/** Write a changed view back into the store: prices and bands to the channel, everything else to shared products. */
export function fromView(s: Store, v: AppState): Store {
  const ch = activeChannel(s);
  const { products, ...settings } = v.settings;
  const inView = new Map(products.map((p) => [p.id, p]));
  const bands: Channel['bands'] = {};
  for (const p of products) if (p.commissionBands?.length) bands[p.id] = p.commissionBands;
  const next: Channel = {
    ...ch, settings, campaigns: v.campaigns, stack: v.stack, scenarios: v.scenarios,
    prices: Object.fromEntries(products.map((p) => [p.id, p.price])), bands,
  };
  const channels = s.channels.map((c) => (c.id === ch.id ? next : c));
  const sold = (id: string) => channels.some((c) => c.prices[id] !== undefined);
  const strip = ({ price, commissionBands: _b, ...p }: AppState['settings']['products'][number]) => ({ ...p, price });
  const kept = s.products
    .map((p) => (inView.has(p.id) ? { ...strip(inView.get(p.id)!), price: p.price ?? inView.get(p.id)!.price } : p))
    .filter((p) => sold(p.id)); // removed from its last channel
  const added = products.filter((p) => !s.products.some((x) => x.id === p.id)).map(strip);
  return { ...s, products: [...kept, ...added], channels };
}

export type SaveStatus = 'saved' | 'unavailable';

export function useStore() {
  const [store, setStore] = useState<Store>(() => migrate(read(KEY)));
  const [status, setStatus] = useState<SaveStatus>('saved');
  useEffect(() => { setStatus(write(KEY, store) ? 'saved' : 'unavailable'); }, [store]);
  return [store, setStore, status] as const;
}

/** Per-browser view preferences: language, collapsed panels, hidden columns. */
export type UiPrefs = {
  lang: Lang;
  collapsed: Record<string, boolean>;
  hiddenCols: Record<string, string[]>;
  openGroups: Record<string, string[]>;
  sidebar: boolean;
  nav?: boolean; // left navigation collapsed
  compare?: string[]; // what the Compare tab shows
};

const defaultUi = (): UiPrefs => ({
  lang: typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('tr') ? 'tr' : 'en',
  collapsed: {}, hiddenCols: {}, openGroups: {}, sidebar: true,
});

export function useUiPrefs() {
  const [ui, setUi] = useState<UiPrefs>(() => ({ ...defaultUi(), ...(read(UI_KEY) as Partial<UiPrefs> | null) }));
  useEffect(() => { write(UI_KEY, ui); }, [ui]);
  return [ui, setUi] as const;
}
