import { createContext, useContext } from 'react';
import type { OrderResult } from './engine';
import type { UiPrefs } from './store';
import type { AppState, Campaign, Cart, Settings, Store } from './types';

export type WhatIf = { prices: Record<string, number | undefined> };

export type AppCtx = {
  store: Store;
  setStore: (f: (s: Store) => Store) => void;
  state: AppState; // the active channel
  setState: (f: (s: AppState) => AppState) => void;
  ui: UiPrefs;
  setUi: (f: (u: UiPrefs) => UiPrefs) => void;
  settings: Settings; // with what-if prices applied
  baseSettings: Settings;
  whatIf: WhatIf;
  setWhatIf: (w: WhatIf) => void;
  whatIfOn: boolean;
  /** Order with the active campaigns and combination rules. */
  calc: (cart: Cart) => OrderResult;
  /** The same order with saved prices, to compare with a what-if. */
  calcBase: (cart: Cart) => OrderResult;
  label: (c: Campaign) => string;
};

export const Ctx = createContext<AppCtx | null>(null);
export const useApp = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('no app context');
  return c;
};
