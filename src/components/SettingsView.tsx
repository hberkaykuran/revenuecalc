import { useState } from 'react';
import { defaultState } from '../defaults';
import { uid } from '../format';
import type { AppState, Box, Product, Settings, TariffRow } from '../types';
import { Field, Num } from './inputs';

type Props = { state: AppState; setState: (f: (s: AppState) => AppState) => void };

export function SettingsView({ state, setState }: Props) {
  const s = state.settings;
  const set = (patch: Partial<Settings>) => setState((st) => ({ ...st, settings: { ...st.settings, ...patch } }));
  const setProduct = (id: string, patch: Partial<Product>) => set({ products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const setBox = (id: string, patch: Partial<Box>) => set({ boxes: s.boxes.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  const setRow = (i: number, patch: Partial<TariffRow>) => set({ tariff: s.tariff.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const [io, setIo] = useState('');
  const [ioMsg, setIoMsg] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="stack">
      <section className="panel">
        <header className="panel-head">
          <div><h2>Products</h2><p className="sub">Prices and costs include VAT. Size is how many standard slots one unit takes in a box.</p></div>
          <button type="button" className="btn" onClick={() => set({ products: [...s.products, { id: uid(), name: `Product ${s.products.length + 1}`, cost: 50, price: 120, vatRate: 20, sizeUnits: 1 }] })}>Add product</button>
        </header>
        <div className="scroll">
          <table className="grid form-table">
            <thead><tr><th>Name</th><th>Cost</th><th>Price</th><th>Gross margin</th><th>VAT</th><th>Size</th><th /></tr></thead>
            <tbody>
              {s.products.map((p) => (
                <tr key={p.id}>
                  <td><input id={`p-name-${p.id}`} aria-label="Product name" value={p.name} onChange={(e) => setProduct(p.id, { name: e.target.value })} /></td>
                  <td><Num id={`p-cost-${p.id}`} label="Cost" value={p.cost} min={0} suffix="TL" width="7rem" onChange={(v) => setProduct(p.id, { cost: v })} /></td>
                  <td><Num id={`p-price-${p.id}`} label="Price" value={p.price} min={0} suffix="TL" width="7rem" onChange={(v) => setProduct(p.id, { price: v })} /></td>
                  <td className="muted">{p.price > 0 ? `${(((p.price - p.cost) / p.price) * 100).toFixed(0)}%` : '—'}</td>
                  <td><Num id={`p-vat-${p.id}`} label="VAT rate" value={p.vatRate} min={0} suffix="%" width="5rem" onChange={(v) => setProduct(p.id, { vatRate: v })} /></td>
                  <td><Num id={`p-size-${p.id}`} label="Size in slots" value={p.sizeUnits} min={0} step={0.1} width="4.5rem" onChange={(v) => setProduct(p.id, { sizeUnits: v })} /></td>
                  <td><button type="button" className="link danger" disabled={s.products.length <= 1} onClick={() => set({ products: s.products.filter((x) => x.id !== p.id) })}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="two-col">
        <section className="panel">
          <header className="panel-head"><div><h2>Boxes</h2><p className="sub">An order goes in the smallest box that fits. Past the largest box, it ships as several boxes, billed on total desi.</p></div></header>
          <div className="scroll">
            <table className="grid form-table">
              <thead><tr><th>Box</th><th>Desi</th><th>Holds</th><th /></tr></thead>
              <tbody>
                {s.boxes.map((b) => (
                  <tr key={b.id}>
                    <td><input id={`b-name-${b.id}`} aria-label="Box name" value={b.name} onChange={(e) => setBox(b.id, { name: e.target.value })} /></td>
                    <td><Num id={`b-desi-${b.id}`} label="Desi" value={b.desi} min={0} width="5rem" onChange={(v) => setBox(b.id, { desi: v })} /></td>
                    <td><Num id={`b-cap-${b.id}`} label="Capacity" value={b.capacity} min={1} suffix="pcs" width="6rem" onChange={(v) => setBox(b.id, { capacity: v })} /></td>
                    <td><button type="button" className="link danger" disabled={s.boxes.length <= 1} onClick={() => set({ boxes: s.boxes.filter((x) => x.id !== b.id) })}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row-actions">
            <button type="button" className="link" onClick={() => set({ boxes: [...s.boxes, { id: uid(), name: 'New box', desi: 6, capacity: 18 }] })}>Add box</button>
          </div>
          <label className="check">
            <input id="bestfit" type="checkbox" checked={s.overflowRemainderBestFit} onChange={(e) => set({ overflowRemainderBestFit: e.target.checked })} />
            Put the leftover in the smallest box that fits (13 pcs = large + small). Off = whole large boxes only.
          </label>
        </section>

        <section className="panel">
          <header className="panel-head"><div><h2>Fees and VAT</h2></div></header>
          <div className="fields">
            <Field label="Shipping fee to customer" hint="VAT included"><Num id="fee" value={s.customerShippingFee} min={0} suffix="TL" onChange={(v) => set({ customerShippingFee: v })} /></Field>
            <Field label="Free shipping from" hint="Product total after all discounts"><Num id="free" value={s.freeShippingThreshold} min={0} suffix="TL" onChange={(v) => set({ freeShippingThreshold: v })} /></Field>
            <Field label="Platform commission" hint="On products after discounts, VAT included"><Num id="comm" value={s.commissionRate} min={0} step={0.1} suffix="%" onChange={(v) => set({ commissionRate: v })} /></Field>
            <Field label="VAT inside commission"><Num id="commvat" value={s.commissionVatRate} min={0} suffix="%" onChange={(v) => set({ commissionVatRate: v })} /></Field>
            <Field label="Shipping VAT" hint="Added to the tariff"><Num id="shipvat" value={s.shippingVatRate} min={0} suffix="%" onChange={(v) => set({ shippingVatRate: v })} /></Field>
            <Field label="EPH" hint="Universal service fee added to the tariff. Set 0 to ignore."><Num id="eph" value={s.ephRate} min={0} step={0.01} suffix="%" onChange={(v) => set({ ephRate: v })} /></Field>
          </div>
          <label className="check">
            <input id="deductvat" type="checkbox" checked={s.deductVat} onChange={(e) => set({ deductVat: e.target.checked })} />
            Deduct VAT payable from profit (VAT collected minus VAT paid on goods, shipping and commission).
          </label>
        </section>
      </div>

      <section className="panel">
        <header className="panel-head">
          <div><h2>Shipping tariff</h2><p className="sub">TL per shipment by total desi, VAT and EPH excluded. Tick "per desi" for rows priced per desi.</p></div>
          <label className="inline">Zone
            <select id="zone" value={s.zoneIndex} onChange={(e) => set({ zoneIndex: Number(e.target.value) })}>
              {s.zones.map((z, i) => <option key={i} value={i}>{z}</option>)}
            </select>
          </label>
        </header>
        <div className="scroll">
          <table className="grid form-table">
            <thead>
              <tr><th>From</th><th>To</th>{s.zones.map((z, i) => <th key={i} className={i === s.zoneIndex ? 'active-col' : ''}>{z}</th>)}<th>Per desi</th><th /></tr>
            </thead>
            <tbody>
              {s.tariff.map((r, i) => (
                <tr key={i}>
                  <td><Num id={`t-from-${i}`} label="From desi" value={r.from} min={0} width="4.5rem" onChange={(v) => setRow(i, { from: v })} /></td>
                  <td><Num id={`t-to-${i}`} label="To desi" value={r.to} min={0} width="5.5rem" onChange={(v) => setRow(i, { to: v })} /></td>
                  {s.zones.map((_, z) => (
                    <td key={z} className={z === s.zoneIndex ? 'active-col' : ''}>
                      <Num id={`t-${i}-${z}`} label="Price" value={r.prices[z] ?? 0} min={0} width="5.5rem"
                        onChange={(v) => setRow(i, { prices: s.zones.map((__, k) => (k === z ? v : r.prices[k] ?? 0)) })} />
                    </td>
                  ))}
                  <td><input id={`t-pd-${i}`} aria-label="Per desi" type="checkbox" checked={r.perDesi} onChange={(e) => setRow(i, { perDesi: e.target.checked })} /></td>
                  <td><button type="button" className="link danger" onClick={() => set({ tariff: s.tariff.filter((_, j) => j !== i) })}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row-actions">
          <button type="button" className="link" onClick={() => {
            const last = s.tariff[s.tariff.length - 1];
            set({ tariff: [...s.tariff, { from: (last?.to ?? 0) + 1, to: (last?.to ?? 0) + 5, prices: s.zones.map(() => 0), perDesi: false }] });
          }}>Add row</button>
          <button type="button" className="link" onClick={() => {
            const p = s.tariff.map((r) => r.prices[s.zoneIndex] ?? 0);
            set({ tariff: s.tariff.map((r, i) => ({ ...r, prices: s.zones.map(() => p[i]) })) });
          }}>Copy this zone's prices to all zones</button>
        </div>
      </section>

      <section className="panel">
        <header className="panel-head">
          <div><h2>Save and share</h2><p className="sub">Everything saves in this browser automatically. To move it to another device, copy the data below and paste it there.</p></div>
        </header>
        <textarea id="io" className="io" rows={5} value={io} placeholder="Paste saved data here, or press Copy data" onChange={(e) => setIo(e.target.value)} />
        <div className="row-actions">
          <button type="button" className="btn" onClick={async () => {
            const json = JSON.stringify(state);
            setIo(json);
            try { await navigator.clipboard.writeText(json); setIoMsg('Copied to clipboard.'); } catch { setIoMsg('Select the text above and copy it.'); }
          }}>Copy data</button>
          <button type="button" className="btn" onClick={() => {
            try {
              const parsed = JSON.parse(io) as AppState;
              if (!parsed.settings || !Array.isArray(parsed.scenarios)) throw new Error('bad');
              setState(() => ({ ...defaultState, ...parsed }));
              setIoMsg('Loaded.');
            } catch { setIoMsg('That text is not saved calculator data. Paste the full text from Copy data.'); }
          }}>Load pasted data</button>
          {!confirmReset
            ? <button type="button" className="link danger" onClick={() => setConfirmReset(true)}>Reset to defaults</button>
            : <span className="confirm">Replace everything with the defaults?
                <button type="button" className="link danger" onClick={() => { setState(() => structuredClone(defaultState)); setConfirmReset(false); setIoMsg('Reset.'); }}>Yes, reset</button>
                <button type="button" className="link" onClick={() => setConfirmReset(false)}>Cancel</button>
              </span>}
          {ioMsg && <span className="muted small">{ioMsg}</span>}
        </div>
      </section>
    </div>
  );
}
