import { useState } from 'react';
import { campaignKind, KIND_LABELS, type CampaignKind } from '../engine';
import { uid } from '../format';
import type { AppState, Bundle, CartCampaign, ProductCampaign, Scenario, UnitDiscount } from '../types';
import { Num } from './inputs';

type B<T extends Bundle['type']> = Extract<Bundle, { type: T }>;

type Props = { state: AppState; setState: (f: (s: AppState) => AppState) => void };

export function Campaigns({ state, setState }: Props) {
  const [kind, setKind] = useState<CampaignKind | 'all'>('all');
  const [query, setQuery] = useState('');
  const kinds = [...new Set(state.productCampaigns.map(campaignKind))];
  const shown = state.productCampaigns.filter((c) => (kind === 'all' || campaignKind(c) === kind)
    && c.name.toLowerCase().includes(query.trim().toLowerCase()));
  const setPC = (id: string, patch: Partial<ProductCampaign>) =>
    setState((s) => ({ ...s, productCampaigns: s.productCampaigns.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const setCC = (id: string, patch: Partial<CartCampaign>) =>
    setState((s) => ({ ...s, cartCampaigns: s.cartCampaigns.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const setSc = (id: string, patch: Partial<Scenario>) =>
    setState((s) => ({ ...s, scenarios: s.scenarios.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));

  return (
    <div className="stack">
      <section className="panel">
        <header className="panel-head">
          <div>
            <h2>Scenarios</h2>
            <p className="sub">A saved mix of one campaign per product plus one cart campaign. Results compares them side by side. You can also save the active mix from the bar on the Results tab.</p>
          </div>
          <button type="button" className="btn" onClick={() => setState((s) => ({
            ...s, scenarios: [...s.scenarios, { id: uid(), name: `Scenario ${s.scenarios.length + 1}`, productCampaigns: {}, cartCampaignId: null }],
          }))}>Add scenario</button>
        </header>
        <div className="scroll">
          <table className="grid form-table">
            <thead>
              <tr>
                <th>Name</th>
                {state.settings.products.map((p) => <th key={p.id}>{p.name} campaign</th>)}
                <th>Cart campaign</th><th />
              </tr>
            </thead>
            <tbody>
              {state.scenarios.map((sc) => (
                <tr key={sc.id}>
                  <td><input id={`sc-name-${sc.id}`} aria-label="Scenario name" value={sc.name} onChange={(e) => setSc(sc.id, { name: e.target.value })} /></td>
                  {state.settings.products.map((p) => (
                    <td key={p.id}>
                      <select id={`sc-${sc.id}-${p.id}`} aria-label={`${p.name} campaign`} value={sc.productCampaigns[p.id] ?? ''}
                        onChange={(e) => setSc(sc.id, { productCampaigns: { ...sc.productCampaigns, [p.id]: e.target.value || null } })}>
                        <option value="">None</option>
                        {state.productCampaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </td>
                  ))}
                  <td>
                    <select id={`sc-${sc.id}-cart`} aria-label="Cart campaign" value={sc.cartCampaignId ?? ''} onChange={(e) => setSc(sc.id, { cartCampaignId: e.target.value || null })}>
                      <option value="">None</option>
                      {state.cartCampaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <button type="button" className="link danger" disabled={state.scenarios.length <= 1}
                      onClick={() => setState((s) => ({ ...s, scenarios: s.scenarios.filter((x) => x.id !== sc.id) }))}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <header className="panel-head">
          <div>
            <h2>Product campaigns</h2>
            <p className="sub">A campaign can change the unit price and add a bundle rule. When both are set, the unit price change applies first and the bundle is calculated on the new price. A fixed bundle price replaces it.</p>
          </div>
          <button type="button" className="btn" onClick={() => {
            setKind('all'); setQuery('');
            setState((s) => ({
              ...s, productCampaigns: [{ id: uid(), name: 'New campaign', unit: { type: 'percent', value: 10 }, minQty: 0, bundle: { type: 'none' } }, ...s.productCampaigns],
            }));
          }}>Add campaign</button>
        </header>
        <div className="lab-filters">
          <div className="chips" role="group" aria-label="Campaign type">
            <button type="button" className={kind === 'all' ? 'on' : ''} onClick={() => setKind('all')}>All ({state.productCampaigns.length})</button>
            {kinds.map((k) => (
              <button key={k} type="button" className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{KIND_LABELS[k]}</button>
            ))}
          </div>
          <input id="pc-search" type="search" placeholder="Search campaigns" aria-label="Search campaigns" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="cards">
          {shown.map((c) => (
            <div key={c.id} className="card">
              <div className="card-head">
                <input id={`pc-name-${c.id}`} aria-label="Campaign name" className="title-input" value={c.name} onChange={(e) => setPC(c.id, { name: e.target.value })} />
                <button type="button" className="link danger" onClick={() => setState((s) => ({
                  ...s,
                  productCampaigns: s.productCampaigns.filter((x) => x.id !== c.id),
                  scenarios: s.scenarios.map((sc) => ({
                    ...sc, productCampaigns: Object.fromEntries(Object.entries(sc.productCampaigns).map(([k, v]) => [k, v === c.id ? null : v])),
                  })),
                  active: { ...s.active, productCampaigns: Object.fromEntries(Object.entries(s.active.productCampaigns).map(([k, v]) => [k, v === c.id ? null : v])) },
                }))}>Remove</button>
              </div>
              <div className="row">
                <span className="row-label">Applies to</span>
                {state.settings.products.map((p) => {
                  const on = !c.productIds?.length || c.productIds.includes(p.id);
                  return (
                    <label key={p.id} className="tick">
                      <input type="checkbox" id={`pc-for-${c.id}-${p.id}`} checked={on} onChange={(e) => {
                        const all = state.settings.products.map((x) => x.id);
                        const cur = c.productIds?.length ? c.productIds : all;
                        const next = e.target.checked ? [...new Set([...cur, p.id])] : cur.filter((x) => x !== p.id);
                        setPC(c.id, { productIds: next.length === all.length ? undefined : next });
                      }} /> {p.name}
                    </label>
                  );
                })}
              </div>
              <div className="row">
                <span className="row-label">Unit price</span>
                <select id={`pc-unit-${c.id}`} aria-label="Unit price change" value={c.unit.type} onChange={(e) => {
                  const t = e.target.value as UnitDiscount['type'];
                  setPC(c.id, { unit: t === 'none' ? { type: 'none' } : { type: t, value: t === 'percent' ? 10 : t === 'flat' ? 30 : 99 } });
                }}>
                  <option value="none">No change</option>
                  <option value="percent">% off</option>
                  <option value="flat">TL off each</option>
                  <option value="fixed">Fixed new price</option>
                </select>
                {c.unit.type !== 'none' && (
                  <Num id={`pc-unitv-${c.id}`} label="Unit discount value" value={c.unit.value} min={0} width="6rem"
                    suffix={c.unit.type === 'percent' ? '%' : 'TL'}
                    onChange={(v) => setPC(c.id, { unit: { ...(c.unit as { type: 'percent' }), value: v } })} />
                )}
              </div>
              {c.unit.type !== 'none' && (
                <div className="row">
                  <span className="row-label">From qty</span>
                  <Num id={`pc-min-${c.id}`} label="Minimum quantity" value={c.minQty} min={0} width="4.5rem" onChange={(v) => setPC(c.id, { minQty: v })} />
                  <span className="muted small">0 = always</span>
                </div>
              )}
              <div className="row">
                <span className="row-label">Bundle</span>
                <select id={`pc-bundle-${c.id}`} aria-label="Bundle rule" value={c.bundle.type} onChange={(e) => {
                  const t = e.target.value as Bundle['type'];
                  const next: Record<Bundle['type'], Bundle> = {
                    none: { type: 'none' },
                    buyXpayY: { type: 'buyXpayY', buy: 4, pay: 3 },
                    xForPrice: { type: 'xForPrice', qty: 3, price: 349.9 },
                    nthDiscount: { type: 'nthDiscount', n: 2, percent: 50 },
                    volume: { type: 'volume', tiers: [{ minQty: 3, percent: 10 }, { minQty: 6, percent: 15 }] },
                  };
                  setPC(c.id, { bundle: next[t] });
                }}>
                  <option value="none">None</option>
                  <option value="buyXpayY">Buy X pay Y</option>
                  <option value="xForPrice">X for a fixed price</option>
                  <option value="nthDiscount">Every Nth unit X% off</option>
                  <option value="volume">Volume discount tiers</option>
                </select>
              </div>
              {c.bundle.type === 'buyXpayY' && (
                <div className="row">
                  <span className="row-label" />
                  Buy <Num id={`pc-bx-${c.id}`} label="Buy" value={c.bundle.buy} min={1} width="3.5rem" onChange={(v) => setPC(c.id, { bundle: { ...(c.bundle as B<'buyXpayY'>), buy: v } })} />
                  pay <Num id={`pc-by-${c.id}`} label="Pay" value={c.bundle.pay} min={0} width="3.5rem" onChange={(v) => setPC(c.id, { bundle: { ...(c.bundle as B<'buyXpayY'>), pay: v } })} />
                </div>
              )}
              {c.bundle.type === 'nthDiscount' && (
                <div className="row">
                  <span className="row-label" />
                  Every <Num id={`pc-nn-${c.id}`} label="Every Nth unit" value={c.bundle.n} min={1} width="3.5rem" onChange={(v) => setPC(c.id, { bundle: { ...(c.bundle as B<'nthDiscount'>), n: Math.floor(v) } })} />
                  th unit <Num id={`pc-np-${c.id}`} label="Percent off" value={c.bundle.percent} min={0} width="5rem" suffix="%" onChange={(v) => setPC(c.id, { bundle: { ...(c.bundle as B<'nthDiscount'>), percent: v } })} /> off
                </div>
              )}
              {c.bundle.type === 'volume' && (() => {
                const b = c.bundle;
                const setTiers = (tiers: B<'volume'>['tiers']) => setPC(c.id, { bundle: { type: 'volume', tiers } });
                return (
                  <>
                    {b.tiers.map((t, i) => (
                      <div key={i} className="row">
                        <span className="row-label">{i === 0 ? 'Tiers' : ''}</span>
                        From <Num id={`pc-vq-${c.id}-${i}`} label="From quantity" value={t.minQty} min={1} width="3.5rem" onChange={(v) => setTiers(b.tiers.map((x, j) => (j === i ? { ...x, minQty: Math.floor(v) } : x)))} />
                        pcs <Num id={`pc-vp-${c.id}-${i}`} label="Percent off" value={t.percent} min={0} width="5rem" suffix="%" onChange={(v) => setTiers(b.tiers.map((x, j) => (j === i ? { ...x, percent: v } : x)))} /> off
                        {b.tiers.length > 1 && <button type="button" className="link danger" aria-label="Remove tier" onClick={() => setTiers(b.tiers.filter((_, j) => j !== i))}>×</button>}
                      </div>
                    ))}
                    <div className="row"><span className="row-label" />
                      <button type="button" className="link" onClick={() => {
                        const last = b.tiers[b.tiers.length - 1];
                        setTiers([...b.tiers, { minQty: (last?.minQty ?? 0) + 3, percent: (last?.percent ?? 0) + 5 }]);
                      }}>Add tier</button>
                    </div>
                  </>
                );
              })()}
              {c.bundle.type === 'xForPrice' && (
                <div className="row">
                  <span className="row-label" />
                  <Num id={`pc-xq-${c.id}`} label="Bundle quantity" value={c.bundle.qty} min={1} width="3.5rem" onChange={(v) => setPC(c.id, { bundle: { ...(c.bundle as B<'xForPrice'>), qty: v } })} />
                  for <Num id={`pc-xp-${c.id}`} label="Bundle price" value={c.bundle.price} min={0} width="6rem" suffix="TL" onChange={(v) => setPC(c.id, { bundle: { ...(c.bundle as B<'xForPrice'>), price: v } })} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <header className="panel-head">
          <div>
            <h2>Cart campaigns</h2>
            <p className="sub">Checked against the cart total after product campaigns. With several discount tiers, the highest one the cart reaches applies. A free-shipping step works on its own, next to any discount.</p>
          </div>
          <button type="button" className="btn" onClick={() => setState((s) => ({
            ...s, cartCampaigns: [{ id: uid(), name: 'New cart campaign', tiers: [{ min: 1000, type: 'flat', value: 100 }] }, ...s.cartCampaigns],
          }))}>Add cart campaign</button>
        </header>
        <div className="cards">
          {state.cartCampaigns.map((c) => (
            <div key={c.id} className="card">
              <div className="card-head">
                <input id={`cc-name-${c.id}`} aria-label="Cart campaign name" className="title-input" value={c.name} onChange={(e) => setCC(c.id, { name: e.target.value })} />
                <button type="button" className="link danger" onClick={() => setState((s) => ({
                  ...s,
                  cartCampaigns: s.cartCampaigns.filter((x) => x.id !== c.id),
                  scenarios: s.scenarios.map((sc) => (sc.cartCampaignId === c.id ? { ...sc, cartCampaignId: null } : sc)),
                  active: s.active.cartCampaignId === c.id ? { ...s.active, cartCampaignId: null } : s.active,
                }))}>Remove</button>
              </div>
              {c.tiers.map((t, i) => {
                const setT = (patch: Partial<typeof t>) => setCC(c.id, { tiers: c.tiers.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                return (
                  <div key={i} className="row">
                    <span className="row-label">Over</span>
                    <Num id={`cc-${c.id}-min-${i}`} label="Minimum cart" value={t.min} min={0} width="6rem" suffix="TL" onChange={(v) => setT({ min: v })} />
                    {t.type !== 'freeShipping' && <Num id={`cc-${c.id}-v-${i}`} label="Discount" value={t.value} min={0} width="5.5rem" onChange={(v) => setT({ value: v })} />}
                    <select id={`cc-${c.id}-t-${i}`} aria-label="Discount type" value={t.type} onChange={(e) => setT({ type: e.target.value as 'percent' | 'flat' | 'freeShipping' })}>
                      <option value="percent">% off</option>
                      <option value="flat">TL off</option>
                      <option value="freeShipping">Free shipping</option>
                    </select>
                    {c.tiers.length > 1 && (
                      <button type="button" className="link danger" onClick={() => setCC(c.id, { tiers: c.tiers.filter((_, j) => j !== i) })}>×</button>
                    )}
                  </div>
                );
              })}
              <button type="button" className="link" onClick={() => {
                const last = c.tiers[c.tiers.length - 1];
                setCC(c.id, { tiers: [...c.tiers, { min: (last?.min ?? 0) + 500, type: last?.type ?? 'flat', value: last?.value ?? 100 }] });
              }}>Add tier</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
