import { useEffect, useState } from 'react';
import { defaultState } from './defaults';
import type { Lang } from './i18n';
import type { AppState, Campaign, Mechanic } from './types';

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

export function migrate(raw: any): AppState {
  if (!raw || typeof raw !== 'object' || !raw.settings) return structuredClone(defaultState);
  if (raw.version !== 3) return fromV2(raw);
  const d = structuredClone(defaultState);
  return { ...d, ...raw, settings: { ...d.settings, ...raw.settings } };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export type SaveStatus = 'saved' | 'unavailable';

export function useAppState() {
  const [state, setState] = useState<AppState>(() => migrate(read(KEY)));
  const [status, setStatus] = useState<SaveStatus>('saved');
  useEffect(() => { setStatus(write(KEY, state) ? 'saved' : 'unavailable'); }, [state]);
  return [state, setState, status] as const;
}

/** Per-browser view preferences: language, collapsed panels, hidden columns. */
export type UiPrefs = {
  lang: Lang;
  collapsed: Record<string, boolean>;
  hiddenCols: Record<string, string[]>;
  openGroups: Record<string, string[]>;
  sidebar: boolean;
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
