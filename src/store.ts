import { useEffect, useState } from 'react';
import { defaultState } from './defaults';
import type { AppState } from './types';

const KEY = 'revenuecalc:v1';

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaultState, ...JSON.parse(raw) };
  } catch { /* storage unavailable */ }
  return structuredClone(defaultState);
}

export function useAppState() {
  const [state, setState] = useState<AppState>(loadState);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);
  return [state, setState] as const;
}
