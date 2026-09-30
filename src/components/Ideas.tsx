import { useMemo, useState } from 'react';
import { boxLabel, campaignKind, KIND_LABELS } from '../engine';
import { pct, tl, uid } from '../format';
import { generateIdeas, insights, type Idea, type IdeaGoal } from '../ideas';
import type { AppState, ProductCampaign } from '../types';
import { Field, Num, Segmented } from './inputs';

type Props = { state: AppState; setState: (f: (s: AppState) => AppState) => void };
type SortBy = 'profit' | 'uplift' | 'safe' | 'discount';

export function Ideas({ state, setState }: Props) {
  const { settings } = state;
  const [goal, setGoal] = useState<IdeaGoal>({
    productId: settings.products[0]?.id ?? '', usualQty: 1, goalQty: 3, minMargin: 20, minCustomerDiscount: 10, maxCustomerDiscount: 35,
  });
  const [sortBy, setSortBy] = useState<SortBy>('profit');
  const [limit, setLimit] = useState(15);
  const [flash, setFlash] = useState('');
  const product = settings.products.find((p) => p.id === goal.productId) ?? settings.products[0];
  const set = (patch: Partial<IdeaGoal>) => setGoal((g) => ({ ...g, ...patch }));

  const ideas = useMemo(() => {
    if (!product) return [];
    const list = generateIdeas(state, { ...goal, productId: product.id });
    const key: Record<SortBy, (i: Idea) => number> = {
      profit: (i) => i.atGoal.profit,
      uplift: (i) => i.upliftVsUsual,
      safe: (i) => -i.costIfNoUpgrade,
      discount: (i) => i.customerDiscount,
    };
    return list.sort((a, b) => key[sortBy](b) - key[sortBy](a));
  }, [state, goal, product, sortBy]);

  const notes = useMemo(() => insights(state).filter((i) => i.productId === product?.id), [state, product]);
  if (!product) return <p className="empty">Add a product in Settings first.</p>;

  const sortedBoxes = [...settings.boxes].sort((a, b) => a.capacity - b.capacity);
  const freeQty = Math.ceil(settings.freeShippingThreshold / product.price - 1e-9);
  const presets = [
    ...sortedBoxes.map((b) => ({ label: `Fill ${b.name.toLowerCase()} (${Math.floor(b.capacity / product.sizeUnits)})`, q: Math.floor(b.capacity / product.sizeUnits) })),
    { label: `Free shipping (${freeQty})`, q: freeQty },
  ];

  const save = (c: ProductCampaign, activate: boolean) => {
    const existing = state.productCampaigns.find((x) => x.name === c.name);
    const id = existing?.id ?? uid();
    setState((s) => ({
      ...s,
      productCampaigns: existing ? s.productCampaigns : [...s.productCampaigns, { ...c, id }],
      active: activate ? { ...s.active, productCampaigns: { ...s.active.productCampaigns, [product.id]: id } } : s.active,
    }));
    setFlash(activate ? `“${c.name}” is now active on ${product.name}. Open Results or the Campaign lab to see it everywhere.` : `“${c.name}” saved to your campaigns.`);
  };

  return (
    <div className="stack">
      <section className="panel">
        <header className="panel-head">
          <div>
            <h2>Campaign ideas</h2>
            <p className="sub">Say what customers buy today and what you want them to buy. The generator tries a few hundred campaigns and keeps the ones that meet your margin floor and give the customer a discount worth noticing.</p>
          </div>
        </header>
        <div className="idea-form">
          <Field label="Product">
            <Segmented label="Product" value={product.id} onChange={(v) => set({ productId: v })} options={settings.products.map((p) => ({ value: p.id, label: p.name }))} />
          </Field>
          <Field label="Customers buy today"><Num id="usual" value={goal.usualQty} min={1} suffix="pcs" onChange={(v) => set({ usualQty: Math.floor(v) })} /></Field>
          <Field label="Get them to buy"><Num id="goalq" value={goal.goalQty} min={1} suffix="pcs" onChange={(v) => set({ goalQty: Math.floor(v) })} /></Field>
          <Field label="Minimum margin" hint="Profit ÷ what the customer pays"><Num id="minm" value={goal.minMargin} suffix="%" onChange={(v) => set({ minMargin: v })} /></Field>
          <Field label="Customer saves" hint="At the goal quantity">
            <span className="range">
              <Num id="mind" label="Minimum saving" value={goal.minCustomerDiscount} min={0} suffix="%" width="5.5rem" onChange={(v) => set({ minCustomerDiscount: v })} />
              to
              <Num id="maxd" label="Maximum saving" value={goal.maxCustomerDiscount} min={0} suffix="%" width="5.5rem" onChange={(v) => set({ maxCustomerDiscount: v })} />
            </span>
          </Field>
        </div>
        <div className="chips goal-chips" role="group" aria-label="Goal presets">
          {presets.map((p) => (
            <button key={p.label} type="button" className={goal.goalQty === p.q ? 'on' : ''} onClick={() => set({ goalQty: p.q })}>{p.label}</button>
          ))}
        </div>
        {state.active.cartCampaignId && (
          <p className="sub">The active cart campaign ({state.cartCampaigns.find((c) => c.id === state.active.cartCampaignId)?.name}) is included in every calculation.</p>
        )}
      </section>

      <section className="panel">
        <header className="panel-head">
          <div>
            <h2>{ideas.length} ideas for {goal.goalQty} × {product.name}</h2>
            <p className="sub">Compared with selling {goal.usualQty} × {product.name} with no campaign.</p>
          </div>
          <div className="controls">
            <label className="inline">Sort by
              <select id="idea-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
                <option value="profit">Most profit at the goal</option>
                <option value="uplift">Biggest gain over today</option>
                <option value="safe">Least lost if they don't buy more</option>
                <option value="discount">Biggest saving for the customer</option>
              </select>
            </label>
          </div>
        </header>
        {flash && <p className="flash" role="status">{flash}</p>}
        {ideas.length === 0 ? (
          <p className="empty">No campaign meets these limits. Lower the minimum margin or the minimum saving, or pick a different goal quantity.</p>
        ) : (
          <div className="scroll">
            <table className="grid ideas">
              <thead>
                <tr>
                  <th>Campaign</th><th>Customer pays</th><th>Saves</th><th>Profit</th><th>Margin</th>
                  <th title="Profit at the goal minus profit on today's order without a campaign">vs today</th>
                  <th title="Profit lost on a customer who still buys the usual amount">If they don't buy more</th>
                  <th>Box</th><th />
                </tr>
              </thead>
              <tbody>
                {ideas.slice(0, limit).map((i) => (
                  <tr key={i.campaign.id}>
                    <th scope="row" className="lab-name">
                      <div>{i.campaign.name}</div>
                      <div className="cell-sub">{KIND_LABELS[campaignKind(i.campaign)]}</div>
                    </th>
                    <td>
                      <div className="cell-main">{tl(i.atGoal.customerPays)}</div>
                      <div className="cell-sub">{tl(i.atGoal.productRevenue / i.atGoal.qty)} per pc{i.atGoal.shippingCharged ? ' + shipping' : ' · free shipping'}</div>
                    </td>
                    <td>{pct(i.customerDiscount)}</td>
                    <td className="strong"><span className={i.atGoal.profit < 0 ? 'neg' : ''}>{tl(i.atGoal.profit)}</span></td>
                    <td>{pct(i.atGoal.margin)}</td>
                    <td><span className={i.upliftVsUsual >= 0 ? 'pos' : 'neg'}>{i.upliftVsUsual >= 0 ? '+' : ''}{tl(i.upliftVsUsual)}</span></td>
                    <td>{i.costIfNoUpgrade > 0.005 ? <span className="neg">−{tl(i.costIfNoUpgrade)}</span> : <span className="pos">nothing</span>}</td>
                    <td><span className="chip">{boxLabel(i.atGoal.boxes)}</span></td>
                    <td>
                      <div className="actions">
                        <button type="button" className="btn small" onClick={() => save(i.campaign, true)}>Try it</button>
                        <button type="button" className="link" onClick={() => save(i.campaign, false)}>Save</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {ideas.length > limit && <div className="row-actions"><button type="button" className="link" onClick={() => setLimit(limit + 15)}>Show more ({ideas.length - limit} left)</button></div>}
      </section>

      <section className="panel">
        <header className="panel-head">
          <div><h2>What the numbers say about {product.name}</h2><p className="sub">Points where one more unit changes your costs, with no campaign running.</p></div>
        </header>
        <ul className="hints">
          {notes.map((n, i) => <li key={i} className={n.kind === 'info' ? 'warn-soft' : n.kind}>{n.text}</li>)}
        </ul>
      </section>
    </div>
  );
}
