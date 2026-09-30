import { useEffect, useState } from 'react';
import { defaultState, presetCartCampaigns, presetProductCampaigns } from './defaults';
import type { AppState } from './types';

const KEY = 'revenuecalc:v1';

/** Bring saved data from older versions up to date without losing edits. */
export function migrate(raw: Partial<AppState>): AppState {
  const d = structuredClone(defaultState);
  const s: AppState = { ...d, ...raw, settings: { ...d.settings, ...raw.settings } } as AppState;
  s.settings.boxes = s.settings.boxes.map((b) => ({ ...b, packagingCost: b.packagingCost ?? 10 }));
  const havePC = new Set(s.productCampaigns.map((c) => c.id));
  s.productCampaigns = [...s.productCampaigns, ...presetProductCampaigns.filter((c) => !havePC.has(c.id))];
  const haveCC = new Set(s.cartCampaigns.map((c) => c.id));
  s.cartCampaigns = [...s.cartCampaigns, ...presetCartCampaigns.filter((c) => !haveCC.has(c.id))];
  s.active = raw.active ?? d.active;
  return s;
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch { /* storage unavailable or bad data */ }
  return structuredClone(defaultState);
}

export function useAppState() {
  const [state, setState] = useState<AppState>(loadState);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);
  return [state, setState] as const;
}
