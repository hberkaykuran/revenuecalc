import { tr } from './tr';

export type Lang = 'en' | 'tr';
let lang: Lang = 'en';

export const setLang = (l: Lang) => { lang = l; };
export const getLang = () => lang;

/** Translate an English UI string. `{name}` placeholders are filled from vars. */
export function t(en: string, vars?: Record<string, string | number>): string {
  let s = lang === 'tr' ? tr[en] ?? en : en;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

const cache = new Map<string, Intl.NumberFormat>();
const nf = (min: number, max: number) => {
  const key = `${lang}${min}${max}`;
  let f = cache.get(key);
  if (!f) { f = new Intl.NumberFormat(lang === 'tr' ? 'tr-TR' : 'en-US', { minimumFractionDigits: min, maximumFractionDigits: max }); cache.set(key, f); }
  return f;
};

/** Money with 2 decimals. */
export const tl = (n: number) => nf(2, 2).format(Math.abs(n) < 0.005 ? 0 : n);
/** Whole number. */
export const tl0 = (n: number) => nf(0, 0).format(n);
/** Plain number, up to 2 decimals (for parameters). */
export const num = (n: number) => nf(0, 2).format(n);
/** A ratio (0.123) as a percentage. */
export const pct = (ratio: number) => pctOf(ratio * 100, 1);
/** A percentage value (12.3) with the right sign position for the language. */
export function pctOf(value: number, digits = 0) {
  const s = nf(digits, digits).format(value);
  return lang === 'tr' ? `%${s}` : `${s}%`;
}
export const uid = () => Math.random().toString(36).slice(2, 9);
