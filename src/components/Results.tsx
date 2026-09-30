import { useMemo, useState } from 'react';
import { boxLabel, calcOrder, type OrderResult } from '../engine';
import { pct, tl, tl0 } from '../format';
import type { AppState, Cart, Setup } from '../types';
import { Num, Segmented } from './inputs';

type Props = { state: AppState };

const tone = (n: number) => (n < 0 ? 'neg' : '');

export function Results({ state }: Props) {
  const scenario = state.active;
  const { settings } = state;
  const products = settings.products;
  const [productId, setProductId] = useState(products[0]?.id ?? '');
  const [maxQty, setMaxQty] = useState(24);
  const product = products.find((p) => p.id === productId) ?? products[0];
  const calc = (cart: Cart, s: Setup = scenario) => calcOrder(settings, cart, s, state);

  const rows = useMemo(() => {
    if (!product) return [];
    const out: { q: number; r: OrderResult; delta: number; boxChange: boolean }[] = [];
    let prev: OrderResult | null = null;
    for (let q = 1; q <= Math.min(Math.max(1, maxQty), 200); q++) {
      const r = calc({ [product.id]: q });
      out.push({
        q, r, delta: prev ? r.profit - prev.profit : r.profit,
        boxChange: !!prev && boxLabel(prev.boxes) !== boxLabel(r.boxes),
      });
      prev = r;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, scenario, product, maxQty]);

  if (!product) return <p className="empty">Add a product in Settings to see results.</p>;

  const sortedBoxes = [...settings.boxes].sort((a, b) => a.capacity - b.capacity);

  return (
    <div className="stack">
      <section className="panel">
        <header className="panel-head">
          <div>
            <h2>Box milestones</h2>
            <p className="sub">Profit per order when a customer fills each box with one product, with the campaigns above.</p>
          </div>
        </header>
        <div className="scroll">
          <table className="grid milestones">
            <thead>
              <tr>
                <th>Product</th>
                <th>Single</th>
                {sortedBoxes.map((b) => <th key={b.id}>{b.name} full</th>)}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const qs = [1, ...sortedBoxes.map((b) => Math.max(1, Math.floor(b.capacity / p.sizeUnits + 1e-9)))];
                return (
                  <tr key={p.id}>
                    <th scope="row">{p.name}</th>
                    {qs.map((q, i) => {
                      const r = calc({ [p.id]: q });
                      return (
                        <td key={i}>
                          <div className="cell-main"><span className={tone(r.profit)}>{tl(r.profit)}</span></div>
                          <div className="cell-sub">{q} pcs · {pct(r.margin)} · {tl(r.profit / q)}/pc</div>
                        </td>
                      );
                    })}
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
            <h2>By quantity</h2>
            <p className="sub">Every order size for one product. Rows where the extra unit loses money are flagged.</p>
          </div>
          <div className="controls">
            <Segmented label="Product" value={product.id} onChange={setProductId}
              options={products.map((p) => ({ value: p.id, label: p.name }))} />
            <label className="inline">Up to <Num id="maxQty" label="Max quantity" value={maxQty} onChange={setMaxQty} min={1} width="4.5rem" /></label>
          </div>
        </header>
        <div className="scroll">
          <table className="grid matrix">
            <thead>
              <tr>
                <th>Qty</th><th>Box</th><th>Desi</th><th>List</th><th>Discounts</th><th>Products</th>
                <th>Shipping in</th><th>Customer pays</th><th>Commission</th><th>Shipping cost</th>
                <th>Packaging</th><th>Cost of goods</th><th>{settings.deductVat ? 'VAT payable' : 'VAT (info)'}</th>
                <th>Profit</th><th>Margin</th><th>Per unit</th><th>+1 unit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ q, r, delta, boxChange }) => (
                <tr key={q} className={`${boxChange ? 'box-change' : ''} ${delta < 0 ? 'loss-row' : ''}`}>
                  <th scope="row">{q}</th>
                  <td><span className="chip">{boxLabel(r.boxes)}</span></td>
                  <td>{tl0(r.desi)}</td>
                  <td>{tl(r.list)}</td>
                  <td className="muted">{r.totalDiscount > 0 ? `−${tl(r.totalDiscount)}` : '—'}</td>
                  <td>{tl(r.productRevenue)}</td>
                  <td>{r.shippingCharged ? tl(r.shippingCharged) : <span className="free">free</span>}</td>
                  <td>{tl(r.customerPays)}</td>
                  <td className="muted">−{tl(r.commission)}</td>
                  <td className="muted">−{tl(r.shippingCost)}</td>
                  <td className="muted">−{tl(r.packaging)}</td>
                  <td className="muted">−{tl(r.cogs)}</td>
                  <td className="muted">{settings.deductVat ? '−' : ''}{tl(r.vatPayable)}</td>
                  <td className="strong"><span className={tone(r.profit)}>{tl(r.profit)}</span></td>
                  <td>{pct(r.margin)}</td>
                  <td>{tl(r.profit / q)}</td>
                  <td><span className={delta < 0 ? 'neg flag' : 'pos'}>{delta >= 0 ? '+' : ''}{tl(delta)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Compare state={state} productId={product.id} maxQty={maxQty} />
      {products.length >= 2 && <MixGrid state={state} scenario={scenario} />}
    </div>
  );
}

function Compare({ state, productId, maxQty }: { state: AppState; productId: string; maxQty: number }) {
  const { settings } = state;
  const scenarios = [{ id: '__active', name: 'Active now', ...state.active }, ...state.scenarios];
  const product = settings.products.find((p) => p.id === productId)!;
  const qs = Array.from({ length: Math.min(Math.max(1, maxQty), 200) }, (_, i) => i + 1);
  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <h2>Scenario comparison · {product.name}</h2>
          <p className="sub">Profit per order for the active campaigns and each saved scenario. The best one for each quantity is highlighted.</p>
        </div>
      </header>
      <div className="scroll">
        <table className="grid compare">
          <thead>
            <tr><th>Qty</th>{scenarios.map((s) => <th key={s.id}>{s.name}</th>)}</tr>
          </thead>
          <tbody>
            {qs.map((q) => {
              const rs = scenarios.map((s) => calcOrder(settings, { [productId]: q }, s, state));
              const best = Math.max(...rs.map((r) => r.profit));
              return (
                <tr key={q}>
                  <th scope="row">{q}</th>
                  {rs.map((r, i) => (
                    <td key={i} className={Math.abs(r.profit - best) < 0.005 && rs.length > 1 ? 'best' : ''}>
                      <div className="cell-main"><span className={tone(r.profit)}>{tl(r.profit)}</span></div>
                      <div className="cell-sub">pays {tl(r.customerPays)} · {pct(r.margin)}</div>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MixGrid({ state, scenario }: { state: AppState; scenario: Setup }) {
  const { settings } = state;
  const ps = settings.products;
  const [xId, setX] = useState(ps[0].id);
  const [yId, setY] = useState(ps[1].id);
  const [metric, setMetric] = useState<'profit' | 'margin'>('profit');
  const [size, setSize] = useState(12);
  const x = ps.find((p) => p.id === xId) ?? ps[0];
  const y = ps.find((p) => p.id === yId && p.id !== x.id) ?? ps.find((p) => p.id !== x.id)!;
  const n = Math.min(Math.max(1, size), 30);
  const grid = useMemo(() => {
    const g: OrderResult[][] = [];
    for (let j = 0; j <= n; j++) {
      g.push([]);
      for (let i = 0; i <= n; i++) g[j].push(calcOrder(settings, { [x.id]: i, [y.id]: j }, scenario, state));
    }
    return g;
  }, [state, scenario, x.id, y.id, n, settings]);
  const vals = grid.flat().filter((r) => r.qty > 0).map((r) => (metric === 'profit' ? r.profit : r.margin));
  const max = Math.max(...vals, 0.0001);
  const min = Math.min(...vals, 0);
  const bg = (v: number) => {
    if (v >= 0) return `color-mix(in oklab, var(--accent) ${Math.round((v / max) * 70)}%, var(--surface))`;
    return `color-mix(in oklab, var(--bad) ${Math.round((v / min) * 60)}%, var(--surface))`;
  };
  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <h2>Mixed orders</h2>
          <p className="sub">Every combination of two products in one order, with each product's own campaign and the cart campaign applied.</p>
        </div>
        <div className="controls">
          <label className="inline">Across
            <select id="mixX" value={x.id} onChange={(e) => setX(e.target.value)}>
              {ps.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="inline">Down
            <select id="mixY" value={y.id} onChange={(e) => setY(e.target.value)}>
              {ps.filter((p) => p.id !== x.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="inline">Up to <Num id="mixSize" label="Grid size" value={size} onChange={setSize} min={1} width="4rem" /></label>
          <Segmented label="Metric" value={metric} onChange={setMetric}
            options={[{ value: 'profit', label: 'Profit' }, { value: 'margin', label: 'Margin' }]} />
        </div>
      </header>
      <div className="scroll">
        <table className="heat">
          <thead>
            <tr>
              <th className="corner">{y.name} ↓ · {x.name} →</th>
              {grid[0].map((_, i) => <th key={i}>{i}</th>)}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, j) => (
              <tr key={j}>
                <th scope="row">{j}</th>
                {row.map((r, i) => {
                  if (r.qty === 0) return <td key={i} className="void" />;
                  const v = metric === 'profit' ? r.profit : r.margin;
                  return (
                    <td key={i} style={{ background: bg(v) }}
                      title={`${i} ${x.name} + ${j} ${y.name}\n${boxLabel(r.boxes)} · ${r.desi} desi\nCustomer pays ${tl(r.customerPays)}\nProfit ${tl(r.profit)} (${pct(r.margin)})`}>
                      {metric === 'profit' ? tl0(v) : pct(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
