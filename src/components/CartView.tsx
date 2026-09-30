import { useState } from 'react';
import { appliesTo, boxLabel, calcOrder, nextTier, packBoxes } from '../engine';
import { pct, tl } from '../format';
import type { AppState, Cart } from '../types';
import { Num } from './inputs';

export function CartView({ state }: { state: AppState }) {
  const scenario = state.active;
  const { settings } = state;
  const [cart, setCart] = useState<Cart>(() => ({ [settings.products[0]?.id]: 4, [settings.products[1]?.id]: 2 }));
  const r = calcOrder(settings, cart, scenario, state);
  const cartCampaign = state.cartCampaigns.find((c) => c.id === scenario.cartCampaignId);
  const next = nextTier(cartCampaign, r.subtotal);

  const slots = settings.products.reduce((s, p) => s + (cart[p.id] ?? 0) * p.sizeUnits, 0);
  const cap = r.boxes.reduce((s, b) => s + b.capacity, 0);
  const room = Math.max(0, cap - slots);
  const nextBoxes = packBoxes(slots + 1, settings.boxes, settings.overflowRemainderBestFit);

  const hints: { kind: 'good' | 'warn' | 'bad'; text: string }[] = [];
  if (r.qty > 0) {
    if (!r.freeShipping) hints.push({ kind: 'warn', text: `${tl(settings.freeShippingThreshold - r.productRevenue)} TL more and shipping becomes free for the customer.` });
    else hints.push({ kind: 'good', text: 'Free shipping applies. You pay the full shipping cost.' });
    if (next) hints.push({ kind: 'warn', text: `${tl(next.min - r.subtotal)} TL more unlocks the next cart campaign step (${next.type === 'freeShipping' ? 'free shipping' : next.type === 'percent' ? `${next.value}% off` : `${tl(next.value)} TL off`}).` });
    if (room >= 1) hints.push({ kind: 'good', text: `Room for ${Math.floor(room + 1e-9)} more standard unit${Math.floor(room + 1e-9) === 1 ? '' : 's'} in the same box${r.boxes.length > 1 ? 'es' : ''}.` });
    else hints.push({ kind: 'warn', text: `The boxes are full. One more unit ships as ${boxLabel(nextBoxes)}.` });
    if (r.profit < 0) hints.push({ kind: 'bad', text: 'This order loses money.' });
  }

  const Row = ({ label, value, neg, strong, note }: { label: string; value: number; neg?: boolean; strong?: boolean; note?: string }) => (
    <div className={`wf-row ${strong ? 'strong' : ''}`}>
      <span>{label}{note && <span className="muted"> · {note}</span>}</span>
      <span className={value < 0 || neg ? 'neg' : ''}>{neg && value > 0 ? '−' : ''}{tl(value)}</span>
    </div>
  );

  return (
    <div className="two-col">
      <section className="panel">
        <header className="panel-head"><div><h2>Build an order</h2><p className="sub">Uses the campaigns above.</p></div></header>
        <div className="cart-inputs">
          {settings.products.map((p) => {
            const found = state.productCampaigns.find((x) => x.id === scenario.productCampaigns[p.id]);
            const c = found && appliesTo(found, p) ? found : null;
            return (
              <div key={p.id} className="cart-line">
                <div>
                  <div className="strong">{p.name}</div>
                  <div className="muted small">{tl(p.price)} TL · {c ? c.name : 'no campaign'}</div>
                </div>
                <div className="stepper">
                  <button type="button" aria-label={`Remove one ${p.name}`} onClick={() => setCart({ ...cart, [p.id]: Math.max(0, (cart[p.id] ?? 0) - 1) })}>−</button>
                  <Num id={`cart-${p.id}`} label={`${p.name} quantity`} value={cart[p.id] ?? 0} min={0} width="4rem"
                    onChange={(n) => setCart({ ...cart, [p.id]: Math.floor(n) })} />
                  <button type="button" aria-label={`Add one ${p.name}`} onClick={() => setCart({ ...cart, [p.id]: (cart[p.id] ?? 0) + 1 })}>+</button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="box-summary">
          <span className="chip">{boxLabel(r.boxes)}</span>
          <span className="muted">{r.desi} desi · tariff {tl(r.shippingTariff)} TL + EPH + VAT</span>
        </div>
        <ul className="hints">
          {hints.map((h, i) => <li key={i} className={h.kind}>{h.text}</li>)}
        </ul>
      </section>

      <section className="panel">
        <header className="panel-head"><div><h2>Where the money goes</h2></div></header>
        <div className="waterfall">
          {r.lines.map((l) => (
            <Row key={l.productId} label={`${l.qty} × ${l.name}`} value={l.afterCampaign}
              note={l.list !== l.afterCampaign ? `list ${tl(l.list)}` : undefined} />
          ))}
          {r.cartDiscount > 0 && <Row label="Cart campaign" value={r.cartDiscount} neg />}
          <Row label="Product revenue" value={r.productRevenue} strong />
          <Row label="Shipping fee from customer" value={r.shippingCharged} note={r.freeShipping ? 'free shipping' : undefined} />
          <Row label="Customer pays" value={r.customerPays} strong />
          <div className="wf-gap" />
          <Row label={`Platform commission ${settings.commissionRate}%`} value={r.commission} neg note="on products only" />
          <Row label="Shipping cost" value={r.shippingCost} neg note={`${r.desi} desi`} />
          <Row label="Packaging" value={r.packaging} neg note={`${r.boxes.length} box${r.boxes.length === 1 ? '' : 'es'}`} />
          <Row label="Cost of goods" value={r.cogs} neg />
          <Row label="Cash left" value={r.cashProfit} strong />
          <Row label="VAT payable" value={r.vatPayable} neg={settings.deductVat}
            note={`${tl(r.vatOutput)} collected − ${tl(r.vatInput)} paid${settings.deductVat ? '' : ' · not deducted'}`} />
          <details className="explain">
            <summary>What is VAT payable?</summary>
            <p>Your prices include VAT, but that VAT is not yours. Of the {tl(r.customerPays)} TL the customer pays, <b>{tl(r.vatOutput)} TL</b> is VAT you collected for the state.</p>
            <p>You also paid VAT on your own costs: goods, DHL shipping, packaging and the platform commission. That is <b>{tl(r.vatInput)} TL</b> on this order, and you can offset it.</p>
            <p>Each month you pay the state the difference: {tl(r.vatOutput)} − {tl(r.vatInput)} = <b>{tl(r.vatPayable)} TL</b>. That money leaves your account, so it is deducted from profit. {r.vatPayable < 0 ? 'Here it is negative: you paid more VAT than you collected, and the difference is a credit.' : ''}</p>
          </details>
          <div className="wf-total">
            <span>Profit</span>
            <span className={r.profit < 0 ? 'neg' : ''}>{tl(r.profit)} TL</span>
          </div>
          <div className="muted small right">{pct(r.margin)} of what the customer pays{r.qty ? ` · ${tl(r.profit / r.qty)} per unit` : ''}</div>
        </div>
      </section>
    </div>
  );
}
