import { ExclamationCircleOutlined, LinkOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Checkbox, Col, Flex, Popconfirm, Row, Select, Table, Tag, Tooltip, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useApp } from '../context';
import { tl, t } from '../i18n';
import { ASSUMPTIONS, carrierOf, defaultTrendyolCosts, PRICE_LIST_DATE } from '../trendyol';
import type { CarrierRates, Settings, TrendyolCosts as Costs } from '../types';
import { Num } from './common';

/** Marks a number the seller should check against their own contract. */
export function Confirm({ tip }: { tip: string }) {
  return (
    <Tooltip title={tip}>
      <Tag color="warning" icon={<ExclamationCircleOutlined />} style={{ marginInlineStart: 6, cursor: 'help' }}>{t('confirm')}</Tag>
    </Tooltip>
  );
}

function Field({ label, tip, hint, children }: { label: string; tip?: string; hint?: string; children: ReactNode }) {
  return (
    <Col xs={12} md={8}>
      <Typography.Text className="tiny">{label}</Typography.Text>{tip && <Confirm tip={tip} />}<br />
      {children}
      {hint && <><br /><Typography.Text type="secondary" className="tiny">{hint}</Typography.Text></>}
    </Col>
  );
}

/** Trendyol's cost rules: cargo by price tier and desi, service fee, commission fallback, withholding. */
export function TrendyolCosts() {
  const { state, setState } = useApp();
  const s = state.settings;
  const c = s.trendyol ?? defaultTrendyolCosts();
  const rates = carrierOf(c);
  const setS = (patch: Partial<Settings>) => setState((st) => ({ ...st, settings: { ...st.settings, ...patch } }));
  const set = (patch: Partial<Costs>) => setState((st) => ({ ...st, settings: { ...st.settings, trendyol: { ...(st.settings.trendyol ?? defaultTrendyolCosts()), ...patch } } }));
  const setRates = (patch: Partial<CarrierRates>) => set({ carriers: c.carriers.map((x) => (x.id === rates.id ? { ...x, ...patch } : x)) });
  const setAt = (arr: number[], i: number, v: number) => arr.map((x, j) => (j === i ? v : x));
  const [l1, l2] = c.baremLimits;

  return (
    <Flex vertical gap={12}>
      <Alert type="warning" showIcon message={t('Check these against your Trendyol contract and invoices')}
        description={
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {ASSUMPTIONS.map((a) => (
              <li key={a.text}>{t(a.text)} <a href={a.source} target="_blank" rel="noreferrer"><LinkOutlined /> {t('source')}</a></li>
            ))}
          </ul>
        } />

      <Row gutter={[12, 12]}>
        <Col xs={24} xl={12}>
          <Card size="small" title={t('Trendyol fees and VAT')}>
            <Row gutter={[12, 12]}>
              <Field label={t('Default commission')} tip={t('Used for products without an imported tariff. Your category rate is in the tariff file.')} hint={t('Until a tariff is imported')}>
                <Num id="ty-commission" value={s.commissionRate} min={0} step={0.1} suffix="%" width="100%" onChange={(v) => setS({ commissionRate: v })} />
              </Field>
              <Field label={t('Service fee per package')} tip={t('10.99 TL + VAT in public sources since 30 January 2026.')} hint={t('VAT excluded')}>
                <Num id="ty-fee" value={c.serviceFee} min={0} step={0.5} suffix="TL" width="100%" onChange={(v) => set({ serviceFee: v })} />
              </Field>
              <Field label={t('With Bugün Kargoda')} tip={t('4.99 TL + VAT from 15 June 2026 in public sources (6.99 TL before).')} hint={t('VAT excluded')}>
                <Num id="ty-fee-sd" value={c.serviceFeeSameDay} min={0} step={0.5} suffix="TL" width="100%" onChange={(v) => set({ serviceFeeSameDay: v })} />
              </Field>
              <Field label={t('VAT on Trendyol services')} hint={t('Added to cargo and the service fee; inside commission')}>
                <Num id="ty-vat" value={c.serviceVatRate} min={0} step={1} suffix="%" width="100%" onChange={(v) => { set({ serviceVatRate: v }); setS({ commissionVatRate: v }); }} />
              </Field>
              <Field label={t('Withholding (stopaj)')} tip={t('1% since 1 January 2025, on the sale without VAT. Some sellers are exempt.')} hint={t('On the sale without VAT')}>
                <Num id="ty-wh" value={c.withholdingRate} min={0} step={0.5} suffix="%" width="100%" onChange={(v) => set({ withholdingRate: v })} />
              </Field>
              <Field label={t('VAT inside packaging')}>
                <Num id="ty-pvat" value={s.packagingVatRate} min={0} step={1} suffix="%" width="100%" onChange={(v) => setS({ packagingVatRate: v })} />
              </Field>
            </Row>
            <Flex vertical gap={6} style={{ marginTop: 12 }}>
              <Checkbox checked={c.sameDay} onChange={(e) => set({ sameDay: e.target.checked })}>{t('My packages have the Bugün Kargoda label and ship the same day (lower service fee)')}</Checkbox>
              <Checkbox checked={c.deductWithholding} onChange={(e) => set({ deductWithholding: e.target.checked })}>{t('Count withholding as a cost. Off: shown separately, since it is credited against your income or corporate tax.')}</Checkbox>
              <Checkbox checked={s.deductVat} onChange={(e) => setS({ deductVat: e.target.checked })}>{t('Deduct VAT payable from profit. Off: profit is shown with VAT included and VAT is tracked separately.')}</Checkbox>
            </Flex>
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card size="small" title={t('Cargo')} extra={
            <Select size="small" value={rates.id} onChange={(v) => set({ carrierId: v })} options={c.carriers.map((x) => ({ value: x.id, label: x.name }))} style={{ width: 200 }} aria-label={t('Carrier')} />
          }>
            <Typography.Paragraph type="secondary">
              {t('You pay the cargo; the customer pays no shipping. Up to {d} desi, orders under {a} TL and under {b} TL ship at a fixed tier price; larger orders by desi. Prices VAT excluded.', { d: c.baremMaxDesi, a: l1 ?? '—', b: l2 ?? '—' })}
              <Confirm tip={t('Trendyol does not say publicly whether the tier uses the total before or after discounts. This calculator uses what the customer pays, after discounts, VAT included.')} />
            </Typography.Paragraph>
            <Checkbox checked={c.fastShipping} onChange={(e) => set({ fastShipping: e.target.checked })}>
              {t('My orders meet 1-day handover, Hızlı Teslimat or Bugün Kargoda (lower tier prices)')}
            </Checkbox>
            <Table size="small" style={{ marginTop: 8 }} pagination={false} rowKey="k"
              dataSource={c.baremLimits.map((l, i) => ({ k: i, l, from: i ? c.baremLimits[i - 1] : 0 }))}
              columns={[
                { key: 'r', title: t('Order total'), render: (_, r) => (
                  <Flex align="center" gap={4}>{tl(r.from)} – <Num id={`ty-lim-${r.k}`} value={r.l} min={0} step={10} width={100} suffix="TL" onChange={(v) => set({ baremLimits: setAt(c.baremLimits, r.k, v) })} /></Flex>
                ) },
                { key: 'f', title: t('Fast'), render: (_, r) => <Num id={`ty-bf-${r.k}`} value={rates.baremFast[r.k]} min={0} width={100} suffix="TL" onChange={(v) => setRates({ baremFast: setAt(rates.baremFast, r.k, v) })} /> },
                { key: 's', title: t('Standard'), render: (_, r) => <Num id={`ty-bs-${r.k}`} value={rates.baremStandard[r.k]} min={0} width={100} suffix="TL" onChange={(v) => setRates({ baremStandard: setAt(rates.baremStandard, r.k, v) })} /> },
              ]} />
            <Flex gap={12} align="center" wrap style={{ marginTop: 8 }}>
              <span>{t('Tiers apply up to')} <Num id="ty-maxdesi" value={c.baremMaxDesi} min={0} width={90} suffix="desi" onChange={(v) => set({ baremMaxDesi: v })} /></span>
              <span>{t('Above the table, per desi')} <Num id="ty-above" value={rates.perDesiAbove} min={0} width={110} suffix="TL" onChange={(v) => setRates({ perDesiAbove: v })} /></span>
            </Flex>
            <Typography.Text strong style={{ display: 'block', margin: '12px 0 4px' }}>{t('By desi ({c})', { c: rates.name })}</Typography.Text>
            <Table size="small" pagination={false} rowKey="d" scroll={{ y: 260 }}
              dataSource={rates.desi.map((p, d) => ({ d, p }))}
              columns={[
                { key: 'd', title: t('Desi'), width: 80, render: (_, r) => r.d },
                { key: 'p', title: t('Price'), render: (_, r) => <Num id={`ty-desi-${r.d}`} value={r.p} min={0} width={120} suffix="TL" onChange={(v) => setRates({ desi: setAt(rates.desi, r.d, v) })} /> },
              ]} />
            <Popconfirm title={t('Put back Trendyol\'s prices of {d} for every carrier?', { d: PRICE_LIST_DATE })} okText={t('Reset')} cancelText={t('Cancel')}
              onConfirm={() => { const d = defaultTrendyolCosts(); set({ carriers: d.carriers, baremLimits: d.baremLimits, baremMaxDesi: d.baremMaxDesi }); }}>
              <Button size="small" style={{ marginTop: 8 }}>{t('Reset to Trendyol\'s price list')}</Button>
            </Popconfirm>
          </Card>
        </Col>
      </Row>
    </Flex>
  );
}
