import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Col, Flex, Input, Row, Select, Space, Statistic, Table, Typography } from 'antd';
import { useApp } from '../context';
import { pct, t, tl, tl0, uid } from '../i18n';
import { defaultPlan, month } from '../monthly';
import type { MonthlyPlan } from '../types';
import { Num, Section } from './common';

export function Monthly() {
  const { state, setState, settings, calc } = useApp();
  const plan: MonthlyPlan = state.settings.monthly ?? defaultPlan(state.settings);
  const setPlan = (p: Partial<MonthlyPlan>) => setState((s) => ({ ...s, settings: { ...s.settings, monthly: { ...(s.settings.monthly ?? defaultPlan(s.settings)), ...p } } }));
  const m = month(settings, plan, calc);
  const ps = settings.products;
  const productOptions = ps.map((p) => ({ value: p.id, label: p.name }));
  const setRow = (id: string, patch: Partial<MonthlyPlan['orders'][number]>) => setPlan({ orders: plan.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
  const credit = m.vatPayable < 0;
  const modeNote = settings.vatMode === 'gross' ? t('VAT is left out of profit (Products & costs).')
    : settings.vatMode === 'recoverable' ? t('Profit includes VAT; a credit counts as money back.') : t('Profit includes VAT owed; a credit counts as lost.');

  return (
    <Flex vertical gap={12}>
      <Row gutter={[12, 12]}>
        {[
          { k: 'orders', title: t('Orders per month'), value: tl0(m.orders) },
          { k: 'rev', title: t('Customers pay'), value: `${tl0(m.customerPays)} TL` },
          { k: 'profit', title: t('Profit per month'), value: `${tl0(m.profit)} TL`, danger: m.profit < 0 },
          { k: 'margin', title: t('Margin'), value: pct(m.margin), danger: m.margin < 0 },
          { k: 'vat', title: credit ? t('VAT credit (devreden KDV)') : t('VAT to pay'), value: `${tl0(Math.abs(m.vatPayable))} TL` },
          { k: 'be', title: t('Break-even'), value: !m.fixed ? t('no fixed costs') : m.breakEvenOrders === null ? t('never') : t('{n} orders', { n: tl0(Math.ceil(m.breakEvenOrders)) }) },
        ].map((x) => (
          <Col key={x.k} xs={12} md={8} xl={4}>
            <Card size="small"><Statistic title={x.title} value={x.value} valueStyle={x.danger ? { color: 'var(--ant-color-error, #ff4d4f)' } : undefined} /></Card>
          </Col>
        ))}
      </Row>
      <Typography.Text type="secondary" className="tiny">{modeNote} {t('Uses the campaigns that are on.')}</Typography.Text>

      <Section id="m-orders" title={t('Typical orders')}
        sub={t('What a normal month looks like: each row is a kind of order and how many of them you get. Rows can mix two products.')}
        extra={<Button size="small" icon={<PlusOutlined />} onClick={() => setPlan({ orders: [...plan.orders, { id: uid(), lines: [{ productId: ps[0]?.id ?? '', qty: 1 }], perMonth: 10 }] })}>{t('Add row')}</Button>}>
        <Table size="small" rowKey="id" pagination={false} scroll={{ x: 'max-content' }} dataSource={plan.orders}
          columns={[
            { key: 'p1', title: t('Product'), render: (_, o) => (
              <Space.Compact>
                <Select value={o.lines[0]?.productId} onChange={(v) => setRow(o.id, { lines: [{ productId: v, qty: o.lines[0]?.qty ?? 1 }, ...o.lines.slice(1)] })} options={productOptions} style={{ width: 200 }} showSearch optionFilterProp="label" />
                <Num id={`m-q1-${o.id}`} label={t('Qty')} value={o.lines[0]?.qty ?? 1} min={1} suffix={t('pcs')} width={90} onChange={(v) => setRow(o.id, { lines: [{ productId: o.lines[0]?.productId ?? ps[0]?.id, qty: Math.floor(v) }, ...o.lines.slice(1)] })} />
              </Space.Compact>
            ) },
            { key: 'p2', title: t('+ second product'), render: (_, o) => (
              <Space.Compact>
                <Select allowClear placeholder={t('No second product')} value={o.lines[1]?.productId} options={productOptions} style={{ width: 180 }} showSearch optionFilterProp="label"
                  onChange={(v) => setRow(o.id, { lines: v ? [o.lines[0], { productId: v, qty: o.lines[1]?.qty ?? 1 }] : [o.lines[0]] })} />
                {o.lines[1] && <Num id={`m-q2-${o.id}`} label={t('Qty')} value={o.lines[1].qty} min={1} suffix={t('pcs')} width={90} onChange={(v) => setRow(o.id, { lines: [o.lines[0], { ...o.lines[1], qty: Math.floor(v) }] })} />}
              </Space.Compact>
            ) },
            { key: 'n', title: t('Per month'), render: (_, o) => <Num id={`m-n-${o.id}`} value={o.perMonth} min={0} width={100} onChange={(v) => setRow(o.id, { perMonth: v })} /> },
            { key: 'margin', title: t('Margin'), align: 'right', render: (_, o) => { const r = m.rows.find((x) => x.id === o.id); return r ? <b>{pct(r.order.margin)}</b> : '—'; } },
            { key: 'profit', title: t('Profit per order'), align: 'right', render: (_, o) => { const r = m.rows.find((x) => x.id === o.id); return r ? tl(r.order.profit) : '—'; } },
            { key: 'month', title: t('Profit per month'), align: 'right', render: (_, o) => { const r = m.rows.find((x) => x.id === o.id); return r ? tl0(r.order.profit * r.perMonth) : '—'; } },
            { key: 'x', title: '', render: (_, o) => <Button type="text" danger icon={<DeleteOutlined />} aria-label={t('Remove')} onClick={() => setPlan({ orders: plan.orders.filter((x) => x.id !== o.id) })} /> },
          ]} />
      </Section>

      <Row gutter={[12, 12]}>
        <Col xs={24} xl={12}>
          <Section id="m-costs" title={t('Costs that are not per box')}>
            <Flex vertical gap={12}>
              <Flex wrap gap={16}>
                <Space direction="vertical" size={2}><Typography.Text className="tiny">{t('Ad spend per order')}</Typography.Text>
                  <Space.Compact><Num id="m-ad" value={plan.adPerOrder} min={0} step={5} suffix="TL" width={110} onChange={(v) => setPlan({ adPerOrder: v })} /><Num id="m-adv" label={t('VAT rate')} value={plan.adVatRate} min={0} suffix={`% ${t('VAT')}`} width={100} onChange={(v) => setPlan({ adVatRate: v })} /></Space.Compact></Space>
                <Space direction="vertical" size={2}><Typography.Text className="tiny">{t('Returns')}</Typography.Text>
                  <Space.Compact><Num id="m-rr" label={t('Return rate')} value={plan.returnRate} min={0} max={100} step={0.5} suffix={`% ${t('of orders')}`} width={150} onChange={(v) => setPlan({ returnRate: v })} /><Num id="m-rc" label={t('Cost per return')} value={plan.returnCost} min={0} step={10} suffix={`TL / ${t('return')}`} width={150} onChange={(v) => setPlan({ returnCost: v })} /></Space.Compact>
                  <Typography.Text type="secondary" className="tiny">{t('Cost per return: both shipping legs, packaging and any product you cannot resell.')}</Typography.Text></Space>
              </Flex>
              <div>
                <Typography.Text className="tiny">{t('Fixed costs per month (VAT included)')}</Typography.Text>
                {plan.fixed.map((f) => (
                  <Space.Compact key={f.id} style={{ display: 'flex', marginTop: 6 }}>
                    <Input value={f.name} onChange={(e) => setPlan({ fixed: plan.fixed.map((x) => (x.id === f.id ? { ...x, name: e.target.value } : x)) })} style={{ width: 180 }} aria-label={t('Name')} />
                    <Num id={`m-f-${f.id}`} label={t('Amount')} value={f.amount} min={0} step={100} suffix="TL" width={130} onChange={(v) => setPlan({ fixed: plan.fixed.map((x) => (x.id === f.id ? { ...x, amount: v } : x)) })} />
                    <Num id={`m-fv-${f.id}`} label={t('VAT rate')} value={f.vatRate} min={0} suffix={`% ${t('VAT')}`} width={100} onChange={(v) => setPlan({ fixed: plan.fixed.map((x) => (x.id === f.id ? { ...x, vatRate: v } : x)) })} />
                    <Button icon={<DeleteOutlined />} aria-label={t('Remove')} onClick={() => setPlan({ fixed: plan.fixed.filter((x) => x.id !== f.id) })} />
                  </Space.Compact>
                ))}
                <Button size="small" type="link" icon={<PlusOutlined />} onClick={() => setPlan({ fixed: [...plan.fixed, { id: uid(), name: t('New cost'), amount: 0, vatRate: 20 }] })}>{t('Add fixed cost')}</Button>
              </div>
            </Flex>
          </Section>
        </Col>
        <Col xs={24} xl={12}>
          <Section id="m-sum" title={t('The month in numbers')}>
            <Table size="small" pagination={false} showHeader={false} rowKey="k"
              dataSource={[
                { k: t('Customers pay'), v: m.customerPays },
                { k: t('Commission'), v: -m.commission },
                { k: t('Shipping cost'), v: -m.shipping },
                { k: t('Packaging'), v: -m.packaging },
                { k: t('Cost of goods'), v: -m.goods },
                ...(m.orderFees ? [{ k: t('Order fee'), v: -m.orderFees }] : []),
                ...(m.ads ? [{ k: t('Ads'), v: -m.ads }] : []),
                ...(m.returns ? [{ k: t('Returns'), v: -m.returns }] : []),
                ...(m.fixed ? [{ k: t('Fixed costs'), v: -m.fixed }] : []),
                { k: t('Profit before VAT'), v: m.cashProfit, strong: true },
                { k: t('VAT collected (sales)'), v: m.vatOutput, muted: true },
                { k: t('VAT paid (purchases and services)'), v: -m.vatInput, muted: true },
                { k: credit ? t('VAT credit carried forward') : t('VAT to pay'), v: -m.vatPayable, strong: true },
                { k: t('Profit'), v: m.profit, strong: true },
              ]}
              columns={[
                { key: 'k', render: (_, r) => <Typography.Text strong={r.strong} type={r.muted ? 'secondary' : undefined}>{r.k}</Typography.Text> },
                { key: 'v', align: 'right', render: (_, r) => <Typography.Text strong={r.strong} type={r.muted ? 'secondary' : r.v < 0 ? 'danger' : undefined}>{tl(r.v)} TL</Typography.Text> },
              ]} />
            {credit && (
              <Alert style={{ marginTop: 12 }} type="info" showIcon
                message={t('You pay more VAT than you collect: about {m} TL a month, {y} TL a year.', { m: tl0(-m.vatPayable), y: tl0(-m.vatPayable * 12) })}
                description={t('Your products sell at a low VAT rate, while shipping, packaging and services carry 20%. The excess is carried forward as devreden KDV. Businesses selling at reduced rates can usually claim it back in cash above a yearly minimum; ask your accountant which applies to you, then pick the matching option in Products & costs.')} />
            )}
          </Section>
        </Col>
      </Row>
    </Flex>
  );
}
