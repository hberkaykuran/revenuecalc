import { useState } from 'react';
import { appliesTo } from '../engine';
import { uid } from '../format';
import type { AppState, Setup } from '../types';

type Props = { state: AppState; setState: (f: (s: AppState) => AppState) => void };

export function setActive(setState: Props['setState'], patch: Partial<Setup>) {
  setState((s) => ({ ...s, active: { ...s.active, ...patch, productCampaigns: { ...s.active.productCampaigns, ...patch.productCampaigns } } }));
}

/** The campaigns running right now. Every result on the page updates as you change these. */
export function SetupBar({ state, setState }: Props) {
  const { active } = state;
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const matching = state.scenarios.find((sc) =>
    sc.cartCampaignId === active.cartCampaignId
    && state.settings.products.every((p) => (sc.productCampaigns[p.id] ?? null) === (active.productCampaigns[p.id] ?? null)));

  return (
    <section className="setup" aria-label="Active campaigns">
      <div className="setup-fields">
        {state.settings.products.map((p) => (
          <label key={p.id} className="setup-field">
            <span>{p.name}</span>
            <select id={`active-${p.id}`} value={active.productCampaigns[p.id] ?? ''}
              onChange={(e) => setActive(setState, { productCampaigns: { [p.id]: e.target.value || null } })}>
              <option value="">No campaign</option>
              {state.productCampaigns.filter((c) => appliesTo(c, p)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        ))}
        <label className="setup-field">
          <span>Cart</span>
          <select id="active-cart" value={active.cartCampaignId ?? ''} onChange={(e) => setActive(setState, { cartCampaignId: e.target.value || null })}>
            <option value="">No cart campaign</option>
            {state.cartCampaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>
      <div className="setup-actions">
        <label className="setup-field">
          <span>Saved scenarios</span>
          <select id="load-scenario" value={matching?.id ?? ''} onChange={(e) => {
            const sc = state.scenarios.find((x) => x.id === e.target.value);
            if (sc) setState((s) => ({ ...s, active: { productCampaigns: { ...sc.productCampaigns }, cartCampaignId: sc.cartCampaignId } }));
          }}>
            <option value="" disabled>{matching ? '' : 'Unsaved mix'}</option>
            {state.scenarios.map((sc) => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
          </select>
        </label>
        {!matching && !saving && <button type="button" className="link" onClick={() => { setSaving(true); setName(''); }}>Save as scenario</button>}
        {saving && (
          <form className="save-form" onSubmit={(e) => {
            e.preventDefault();
            const n = name.trim() || `Scenario ${state.scenarios.length + 1}`;
            setState((s) => ({ ...s, scenarios: [...s.scenarios, { id: uid(), name: n, productCampaigns: { ...s.active.productCampaigns }, cartCampaignId: s.active.cartCampaignId }] }));
            setSaving(false);
          }}>
            <input id="scenario-name" aria-label="Scenario name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <button type="submit" className="btn">Save</button>
            <button type="button" className="link" onClick={() => setSaving(false)}>Cancel</button>
          </form>
        )}
        <button type="button" className="link" onClick={() => setState((s) => ({ ...s, active: { productCampaigns: {}, cartCampaignId: null } }))}>Clear all</button>
      </div>
    </section>
  );
}
