import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PARAMS } from './engine';
import { TYPE_LABELS } from './labels';
import { tr } from './tr';
import { ASSUMPTIONS } from './trendyol';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) && !f.endsWith('.test.ts') && f !== 'tr.ts' ? [p] : [];
  });
}

describe('Turkish translation', () => {
  it('covers every UI string', () => {
    const keys = new Set<string>();
    for (const f of files('src')) {
      const s = readFileSync(f, 'utf8');
      for (const m of s.matchAll(/\bt\(\s*(['"])((?:\\.|(?!\1).)*)\1/g)) keys.add(m[2].replace(/\\'/g, "'"));
    }
    for (const v of Object.values(TYPE_LABELS)) keys.add(v);
    for (const a of ASSUMPTIONS) keys.add(a.text);
    for (const ps of Object.values(PARAMS)) for (const p of ps) keys.add(p.label);
    const ideas = readFileSync('src/components/Ideas.tsx', 'utf8');
    for (const m of ideas.matchAll(/(?:title|aim|why): '((?:\\.|[^'])+)'/g)) keys.add(m[1].replace(/\\'/g, "'"));
    const costs = readFileSync('src/components/ProductsCosts.tsx', 'utf8');
    for (const m of costs.matchAll(/\['\w+', '([^']+)', '[^']*', '([^']*)'\]/g)) { keys.add(m[1]); if (m[2]) keys.add(m[2]); }
    const strat = readFileSync('src/strategy.ts', 'utf8');
    for (const m of strat.matchAll(/'((?:\\.|[^'])*\{q\}(?:\\.|[^'])*)'/g)) keys.add(m[1].replace(/\\'/g, "'"));
    for (const m of strat.matchAll(/text: '((?:\\.|[^'])+)'/g)) keys.add(m[1].replace(/\\'/g, "'"));
    const missing = [...keys].filter((k) => !(k in tr));
    expect(missing).toEqual([]);
  });
});
