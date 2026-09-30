import { useMemo, useState } from 'react';
import { appliesTo, boxLabel, calcOrder, campaignKind, KIND_LABELS, type CampaignKind, type OrderResult } from '../engine';
import { pct, tl } from '../format';
import type { AppState } from '../types';
import { Segmented } from './inputs';
import { setActive } from './SetupBar';

type Props = { state: AppState; setState: (f: (s: AppState) => AppState) => void };

const parseQtys = (t: string) =>
  [...new Set(t.split(/[\s,;]+/).map((x) => parseInt(x, 10)).filter((n) => n > 0 && n <= 500))].sort((a, b) => a - b);

type SortKey = 'name' | number;

export function Lab({ state, setState }: Props) {
  const { settings } = state;
  const [productId, setProductId] = useState(settings.products[0]?.id ?? '');
  const [kind, setKind] = useState<CampaignKind | 'all'>('all');
  const [qtyText, setQtyText] = useState('1, 2, 3, 4, 5, 6, 8, 10, 12');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [show, setShow] = useState<'profit' | 'margin'>('profit');
  const product = settings.products.find((p) => p.id === productId) ?? settings.products[0];
  const qtys = parseQtys(qtyText);
  const activeId = product ? state.active.productCampaigns[product.id] ?? null : null;

  const applicable = product ? state.productCampaigns.filter((c) => appliesTo(c, product)) : [];
  const kinds = [...new Set(applicable.map(campaignKind))];

  const rows = useMemo(() => {
    if (!product) return [];
    const run = (cid: string | null, q: number) => calcOrder(settings, { [product.id]: q },
      { productCampaigns: { [product.id]: cid }, cartCampaignId: state.active.cartCampaignId }, state);
    const base = qtys.map((q) => run(null, q));
    const list = applicable.filter((c) => kind === 'all' || campaignKind(c) === kind)
      .map((c) => ({ id: c.id as string | null, name: c.name, kind: campaignKind(c), results: qtys.map((q) => run(c.id, q)) }));
    if (typeof sortKey === 'number') {
      const i = qtys.indexOf(sortKey);
      if (i >= 0) list.sort((a, b) => b.results[i].profit - a.results[i].profit);
    }
    return [{ id: null, name: 'No campaign', kind: 'none' as CampaignKind, results: base }, ...list];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, product, qtyText, kind, sortKey]);

  const cartRows = useMemo(() => {
    if (!product) return [];
    const pcid = state.active.productCampaigns[product.id] ?? null;
    const run = (cid: string | null, q: number) => calcOrder(settings, { [product.id]: q },
      { productCampaigns: { [product.id]: pcid }, cartCampaignId: cid }, state);
    return [{ id: null as string | null, name: 'No cart campaign' }, ...state.cartCampaigns]
      .map((c) => ({ id: c.id, name: c.name, results: qtys.map((q) => run(c.id, q)) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, product, qtyText]);

  if (!product) return <p className="empty">Add a product in Settings first.</p>;
  const base = rows[0]?.results ?? [];

  const cell = (r: OrderResult, b: OrderResult | undefined, key: number) => {
    const d = b ? r.profit - b.profit : 0;
    const main = show === 'profit' ? tl(r.profit) : pct(r.margin);
    const saved = r.list > 0 ? 1 - r.productRevenue / r.list : 0;
    return (
      <td key={key} className={`lab-cell ${d > 0.005 ? 'up' : d < -0.005 ? 'down' : ''}`}
        title={`${r.qty} × ${product.name}: customer pays ${tl(r.customerPays)} (saves ${pct(saved)})\n${boxLabel(r.boxes)} · profit ${tl(r.profit)} · margin ${pct(r.margin)}`}>
        <div className="cell-main"><span className={r.profit < 0 ? 'neg' : ''}>{main}</span></div>
        <div className="cell-sub">{b && Math.abs(d) > 0.005 ? `${d > 0 ? '+' : ''}${tl(d)} vs none` : show === 'profit' ? pct(r.margin) : tl(r.profit)}{saved > 0.0005 ? ` · −${pct(saved)}` : ''}</div>
      </td>
    );
  };

  return (
    <div className="stack">
      <section className="panel">
        <header className="panel-head">
          <div>
            <h2>Product campaigns · {product.name}</h2>
            <p className="sub">Every campaign in your library, calculated for each order size. Green means more profit than no campaign, red means less. The last figure is the discount the customer sees. Press Activate to run a campaign everywhere in the app.</p>
          </div>
          <div className="controls">
            <Segmented label="Product" value={product.id} onChange={setProductId} options={settings.products.map((p) => ({ value: p.id, label: p.name }))} />
            <Segmented label="Show" value={show} onChange={setShow} options={[{ value: 'profit', label: 'Profit' }, { value: 'margin', label: 'Margin' }]} />
          </div>
        </header>
        <div className="lab-filters">
          <div className="chips" role="group" aria-label="Campaign type">
            <button type="button" className={kind === 'all' ? 'on' : ''} onClick={() => setKind('all')}>All ({applicable.length})</button>
            {kinds.map((k) => (
              <button key={k} type="button" className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>
                {KIND_LABELS[k]} ({applicable.filter((c) => campaignKind(c) === k).length})
              </button>
            ))}
          </div>
          <label className="inline">Quantities
            <input id="lab-qtys" className="qty-list" value={qtyText} onChange={(e) => setQtyText(e.target.value)} />
          </label>
        </div>
        <div className="scroll lab-scroll">
          <table className="grid lab">
            <thead>
              <tr>
                <th />
                <th><button type="button" className={`sort ${sortKey === 'name' ? 'on' : ''}`} onClick={() => setSortKey('name')}>Campaign</button></th>
                {qtys.map((q) => (
                  <th key={q}><button type="button" className={`sort ${sortKey === q ? 'on' : ''}`} onClick={() => setSortKey(q)} title="Sort by profit at this quantity">{q} pcs{sortKey === q ? ' ↓' : ''}</button></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const on = row.id === activeId;
                return (
                  <tr key={row.id ?? 'none'} className={on ? 'active-row' : ''}>
                    <td>
                      <button type="button" className={`activate ${on ? 'on' : ''}`} aria-pressed={on}
                        onClick={() => setActive(setState, { productCampaigns: { [product.id]: row.id } })}>
                        {on ? 'Active' : 'Activate'}
                      </button>
                    </td>
                    <th scope="row" className="lab-name">
                      <div>{row.name}</div>
                      {row.id && <div className="cell-sub">{KIND_LABELS[row.kind]}</div>}
                    </th>
                    {row.results.map((r, i) => cell(r, row.id ? base[i] : undefined, i))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <header className="panel-head">
          <div>
            <h2>Cart campaigns · {product.name}</h2>
            <p className="sub">The same order sizes with each cart campaign, on top of the active {product.name} campaign.</p>
          </div>
        </header>
        <div className="scroll lab-scroll">
          <table className="grid lab">
            <thead>
              <tr><th /><th>Cart campaign</th>{qtys.map((q) => <th key={q}>{q} pcs</th>)}</tr>
            </thead>
            <tbody>
              {cartRows.map((row) => {
                const on = row.id === state.active.cartCampaignId;
                return (
                  <tr key={row.id ?? 'none'} className={on ? 'active-row' : ''}>
                    <td>
                      <button type="button" className={`activate ${on ? 'on' : ''}`} aria-pressed={on}
                        onClick={() => setActive(setState, { cartCampaignId: row.id })}>{on ? 'Active' : 'Activate'}</button>
                    </td>
                    <th scope="row" className="lab-name">{row.name}</th>
                    {row.results.map((r, i) => cell(r, row.id ? cartRows[0].results[i] : undefined, i))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
