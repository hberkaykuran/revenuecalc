import { PlusOutlined } from '@ant-design/icons';
import { Button, Checkbox, Flex, Input, Select, Space, Switch, Table, Tooltip, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useApp } from '../context';
import { calcOrder, calcWith, CART_MECHANICS, defaultMechanic, hasScope, isCart, PARAMS, PRODUCT_MECHANICS, type OrderResult } from '../engine';
import { pct, t, tl, uid } from '../i18n';
import { mechanicLabel, TYPE_LABELS } from '../labels';
import type { Campaign, Mechanic, MechanicType } from '../types';
import { Num, Section } from './common';

const parseQtys = (s: string) => [...new Set(s.split(/[\s,;]+/).map((x) => parseInt(x, 10)).filter((n) => n > 0 && n <= 500))].sort((a, b) => a - b);

/** Margin first; profit change against no campaign underneath; everything else on hover. */
function ResultCell({ r, base }: { r: OrderResult; base?: OrderResult }) {
  const d = base ? r.profit - base.profit : 0;
  const saved = r.list > 0 ? 1 - r.productRevenue / r.list : 0;
  const tip = (
    <div className="tiny">
      <div>{t('Customer pays')}: <b>{tl(r.customerPays)}</b>{saved > 0.0005 ? ` (${t('saves {p}', { p: pct(saved) })})` : ''}</div>
      <div>{t('Total costs')}: {tl(r.costs)}</div>
      <div>{t('Profit')}: <b>{tl(r.profit)}</b></div>
    </div>
  );
  return (
    <Tooltip title={tip}>
      <Flex vertical align="flex-end" className="cell-hover">
        <Typography.Text strong type={r.profit < 0 ? 'danger' : undefined}>{pct(r.margin)}</Typography.Text>
        {base
          ? <Typography.Text className="tiny" type={d > 0.005 ? 'success' : d < -0.005 ? 'danger' : 'secondary'}>{Math.abs(d) > 0.005 ? `${d > 0 ? '+' : '−'}${tl(Math.abs(d))} TL` : '±0'}</Typography.Text>
          : <Typography.Text className="tiny" type="secondary">{tl(r.profit)} TL</Typography.Text>}
      </Flex>
    </Tooltip>
  );
}

export function Lab() {
  return (
    <Flex vertical gap={12}>
      <Sweep />
      <EachAlone />
    </Flex>
  );
}

/** Try a range of values for one number of a campaign type. */
function Sweep() {
  const { settings, state, setState } = useApp();
  const products = settings.products;
  const [type, setType] = useState<MechanicType>('percentOff');
  const [productId, setProductId] = useState(products[0]?.id ?? '');
  const product = products.find((p) => p.id === productId) ?? products[0];
  const params = PARAMS[type];
  const [paramKey, setParamKey] = useState(params[0]?.key ?? '');
  const key = params.find((p) => p.key === paramKey)?.key ?? params[0]?.key;
  const [base, setBase] = useState<Mechanic>(() => defaultMechanic('percentOff', product?.price));
  const [from, setFrom] = useState(5);
  const [to, setTo] = useState(30);
  const [step, setStep] = useState(5);
  const [qtyText, setQtyText] = useState('1, 2, 3, 4, 6, 12');
  const [withActive, setWithActive] = useState(false);
  const qtys = parseQtys(qtyText);

  const chooseType = (tp: MechanicType) => {
    const m = defaultMechanic(tp, product?.price);
    setType(tp); setBase(m);
    const k = PARAMS[tp][0]?.key;
    setParamKey(k ?? '');
    if (k) { const v = (m as unknown as Record<string, number>)[k]; setFrom(v); setTo(v * 3 || 10); setStep(Math.max(PARAMS[tp][0].step, Math.round(v / 2) || 1)); }
  };

  const values = useMemo(() => {
    const out: number[] = [];
    if (step <= 0 || to < from) return out;
    for (let v = from; v <= to + 1e-9 && out.length < 60; v += step) out.push(Math.round(v * 100) / 100);
    return out;
  }, [from, to, step]);

  if (!product) return null;
  const scope = hasScope(type) ? [product.id] : [];
  const cartOf = (q: number) => ({ [product.id]: q });
  const active = state.campaigns.filter((c) => c.active);
  const run = (cs: Campaign[], q: number) => withActive ? calcOrder(settings, cartOf(q), [...active, ...cs], state.stack) : calcWith(settings, cartOf(q), cs);
  const baseRow = qtys.map((q) => run([], q));
  const rows: { key: string; m: Mechanic | null; results: OrderResult[] }[] = [
    { key: 'none', m: null, results: baseRow },
    ...values.map((v) => {
      const m = key ? ({ ...base, [key]: v } as Mechanic) : base;
      const c: Campaign = { id: 'sweep', name: '', mechanic: m, productIds: scope, active: true };
      return { key: String(v), m, results: qtys.map((q) => run([c], q)) };
    }),
  ];

  return (
    <Section id="sweep" title={t('Try a range')}
      sub={t('Pick a campaign type and one of its numbers to see the margin for every value. Below each margin is the profit change against no campaign; hover a cell for the details.')}>
      <Flex wrap gap={12} align="end" style={{ marginBottom: 12 }}>
        <Space direction="vertical" size={2}><Typography.Text className="tiny">{t('Type')}</Typography.Text>
          <Select id="sw-type" value={type} onChange={chooseType} style={{ width: 200 }} options={[
            { label: t('Product campaigns'), options: PRODUCT_MECHANICS.filter((x) => PARAMS[x].length).map((x) => ({ value: x, label: t(TYPE_LABELS[x]) })) },
            { label: t('Cart campaigns'), options: CART_MECHANICS.filter((x) => PARAMS[x].length).map((x) => ({ value: x, label: t(TYPE_LABELS[x]) })) },
          ]} /></Space>
        <Space direction="vertical" size={2}><Typography.Text className="tiny">{t('Product')}</Typography.Text>
          <Select id="sw-product" value={product.id} onChange={setProductId} style={{ width: 180 }} showSearch optionFilterProp="label" options={products.map((p) => ({ value: p.id, label: p.name }))} /></Space>
        <Space direction="vertical" size={2}><Typography.Text className="tiny">{t('Change')}</Typography.Text>
          <Select id="sw-param" value={key} onChange={setParamKey} style={{ width: 160 }} options={params.map((p) => ({ value: p.key, label: t(p.label) }))} /></Space>
        {params.filter((p) => p.key !== key).map((p) => (
          <Space key={p.key} direction="vertical" size={2}><Typography.Text className="tiny">{t(p.label)}</Typography.Text>
            <Num id={`sw-fixed-${p.key}`} value={(base as unknown as Record<string, number>)[p.key]} min={p.min} width={100} onChange={(v) => setBase({ ...base, [p.key]: v } as Mechanic)} /></Space>
        ))}
        <Space direction="vertical" size={2}><Typography.Text className="tiny">{t('From')} · {t('To')} · {t('Step')}</Typography.Text>
          <Space.Compact>
            <Num id="sw-from" label={t('From')} value={from} onChange={setFrom} width={80} />
            <Num id="sw-to" label={t('To')} value={to} onChange={setTo} width={80} />
            <Num id="sw-step" label={t('Step')} value={step} min={0.01} onChange={setStep} width={70} />
          </Space.Compact></Space>
        <Space direction="vertical" size={2}><Typography.Text className="tiny">{t('Quantities')}</Typography.Text>
          <Input id="sw-qtys" value={qtyText} onChange={(e) => setQtyText(e.target.value)} style={{ width: 160 }} /></Space>
        <Checkbox checked={withActive} onChange={(e) => setWithActive(e.target.checked)}>{t('On top of the campaigns that are on')}</Checkbox>
      </Flex>
      <Table size="small" bordered pagination={false} scroll={{ x: 'max-content', y: 480 }} dataSource={rows}
        columns={[
          { key: 'v', title: t('Campaign'), fixed: 'left', width: 200, render: (_, r) => r.m ? mechanicLabel(r.m) : <Typography.Text type="secondary">{t('No campaign')}</Typography.Text> },
          ...qtys.map((q, i) => ({ key: q, title: `${q} ${t('pcs')}`, align: 'right' as const, render: (_: unknown, r: (typeof rows)[number]) => <ResultCell r={r.results[i]} base={r.m ? baseRow[i] : undefined} /> })),
          { key: 'add', title: '', fixed: 'right', width: 56, render: (_, r) => r.m && (
            <Tooltip title={t('Add and turn on')}><Button size="small" icon={<PlusOutlined />} aria-label={t('Add and turn on')} onClick={() => setState((s) => ({ ...s, campaigns: [{ id: uid(), name: '', mechanic: r.m!, productIds: scope, active: true }, ...s.campaigns] }))} /></Tooltip>
          ) },
        ]} />
    </Section>
  );
}

function EachAlone() {
  const { settings, state, setState, label } = useApp();
  const [productId, setProductId] = useState(settings.products[0]?.id ?? '');
  const [qtyText, setQtyText] = useState('1, 2, 3, 4, 5, 6, 8, 12');
  const product = settings.products.find((p) => p.id === productId) ?? settings.products[0];
  if (!product) return null;
  const qtys = parseQtys(qtyText);
  const relevant = state.campaigns.filter((c) => isCart(c.mechanic) || !c.productIds.length || c.productIds.includes(product.id));
  const base = qtys.map((q) => calcWith(settings, { [product.id]: q }, []));
  const rows = relevant.map((c) => ({ key: c.id, c, results: qtys.map((q) => calcWith(settings, { [product.id]: q }, [{ ...c, active: true }])) }));
  return (
    <Section id="alone" title={t('Each campaign on its own')}
      sub={t('Every saved campaign tested alone against no campaign. Switch one on to use it everywhere.')}
      extra={<Space wrap>
        <Select size="small" value={product.id} onChange={setProductId} style={{ width: 160 }} showSearch optionFilterProp="label" options={settings.products.map((p) => ({ value: p.id, label: p.name }))} />
        <Input size="small" id="alone-qtys" value={qtyText} onChange={(e) => setQtyText(e.target.value)} style={{ width: 150 }} aria-label={t('Quantities')} />
      </Space>}>
      <Table size="small" bordered pagination={false} scroll={{ x: 'max-content' }} dataSource={rows}
        locale={{ emptyText: t('No campaigns for this product yet.') }}
        columns={[
          { key: 'on', title: t('On'), width: 56, fixed: 'left', render: (_, r) => <Switch size="small" checked={r.c.active} onChange={(v) => setState((s) => ({ ...s, campaigns: s.campaigns.map((x) => (x.id === r.c.id ? { ...x, active: v } : x)) }))} /> },
          { key: 'name', title: t('Campaign'), fixed: 'left', width: 220, render: (_, r) => label(r.c) },
          ...qtys.map((q, i) => ({ key: q, title: <Flex vertical align="flex-end"><span>{q} {t('pcs')}</span><Typography.Text type="secondary" className="tiny">{t('none')}: {pct(base[i].margin)}</Typography.Text></Flex>, align: 'right' as const, render: (_: unknown, r: (typeof rows)[number]) => <ResultCell r={r.results[i]} base={base[i]} /> })),
        ]} />
    </Section>
  );
}
