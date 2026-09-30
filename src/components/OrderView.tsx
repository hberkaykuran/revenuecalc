import { Alert, Button, Card, Col, Collapse, Descriptions, Flex, Row, Space, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useApp } from '../context';
import { packBoxes } from '../engine';
import { pct, pctOf, t, tl } from '../i18n';
import type { Cart } from '../types';
import { Num } from './common';
import { boxText } from './Results';

export function OrderView() {
  const { settings, calc, label } = useApp();
  const [cart, setCart] = useState<Cart>(() => ({ [settings.products[0]?.id]: 4, [settings.products[1]?.id]: 2 }));
  const r = calc(cart);
  const slots = settings.products.reduce((s, p) => s + (cart[p.id] ?? 0) * p.sizeUnits, 0);
  const room = Math.floor(r.boxes.reduce((s, b) => s + b.capacity, 0) - slots + 1e-9);
  const next = packBoxes(slots + 1, settings.boxes, settings.overflowRemainderBestFit);

  const hints: { type: 'success' | 'warning' | 'error' | 'info'; text: string }[] = [];
  if (r.qty > 0) {
    hints.push(r.freeShipping
      ? { type: 'info', text: t('Free shipping applies, so you pay the whole shipping cost.') }
      : { type: 'warning', text: t('{x} TL more and shipping is free for the customer.', { x: tl(settings.freeShippingThreshold - r.productRevenue) }) });
    hints.push(room >= 1
      ? { type: 'success', text: t('Room for {n} more in the same box.', { n: room }) }
      : { type: 'warning', text: t('The box is full. One more unit ships as {b}.', { b: boxText({ ...r, boxes: next }) }) });
    if (r.profit < 0) hints.push({ type: 'error', text: t('This order loses money.') });
  }

  const money = (v: number, negative = false) => <Typography.Text type={negative && v > 0.005 ? 'danger' : undefined}>{negative && v > 0.005 ? '−' : ''}{tl(v)}</Typography.Text>;

  return (
    <Row gutter={[12, 12]}>
      <Col xs={24} xl={10}>
        <Card size="small" title={t('Build an order')}>
          <Flex vertical gap={10}>
            {settings.products.map((p) => (
              <Flex key={p.id} justify="space-between" align="center">
                <div>
                  <Typography.Text strong>{p.name}</Typography.Text><br />
                  <Typography.Text type="secondary" className="tiny">{tl(p.price)} TL</Typography.Text>
                </div>
                <Space.Compact>
                  <Button onClick={() => setCart({ ...cart, [p.id]: Math.max(0, (cart[p.id] ?? 0) - 1) })} aria-label={t('Remove one')}>−</Button>
                  <Num id={`cart-${p.id}`} label={p.name} value={cart[p.id] ?? 0} min={0} width={70} onChange={(v) => setCart({ ...cart, [p.id]: Math.floor(v) })} />
                  <Button onClick={() => setCart({ ...cart, [p.id]: (cart[p.id] ?? 0) + 1 })} aria-label={t('Add one')}>+</Button>
                </Space.Compact>
              </Flex>
            ))}
            <Space wrap><Tag>{boxText(r)}</Tag><Typography.Text type="secondary">{r.desi} desi · {t('tariff')} {tl(r.shippingTariff)} TL + EPH + {t('VAT')}</Typography.Text></Space>
            {hints.map((h, i) => <Alert key={i} type={h.type} message={h.text} showIcon />)}
            {(r.applied.length > 0 || r.skipped.length > 0) && (
              <div>
                <Typography.Text type="secondary" className="tiny">{t('Campaigns on this order')}</Typography.Text>
                <Flex wrap gap={4}>
                  {r.applied.map((c) => <Tag key={c.id} color="blue">{label(c)}</Tag>)}
                </Flex>
                {r.skipped.length > 0 && (
                  <Alert style={{ marginTop: 6 }} type="info" message={t('Not applied because of combination rules: {list}. The customer gets the combination that saves them the most.', { list: r.skipped.map(label).join(', ') })} />
                )}
              </div>
            )}
          </Flex>
        </Card>
      </Col>
      <Col xs={24} xl={14}>
        <Card size="small" title={t('Where the money goes')}>
          <Descriptions size="small" column={1} bordered
            items={[
              ...r.lines.map((l) => ({ key: l.productId, label: `${l.qty} × ${l.name}`, children: <Flex justify="space-between"><Typography.Text type="secondary">{l.list !== l.afterCampaign ? `${t('list')} ${tl(l.list)}` : ''}</Typography.Text>{money(l.afterCampaign)}</Flex> })),
              ...(r.cartDiscount > 0 ? [{ key: 'cd', label: t('Cart discount'), children: <Flex justify="end">{money(r.cartDiscount, true)}</Flex> }] : []),
              { key: 'pr', label: <b>{t('Product revenue')}</b>, children: <Flex justify="end"><b>{tl(r.productRevenue)}</b></Flex> },
              { key: 'sh', label: t('Shipping fee from customer'), children: <Flex justify="end">{r.freeShipping ? <Tag color="green">{t('free')}</Tag> : money(r.shippingCharged)}</Flex> },
              { key: 'cp', label: <b>{t('Customer pays')}</b>, children: <Flex justify="end"><b>{tl(r.customerPays)}</b></Flex> },
              { key: 'cm', label: t('Platform commission {p}', { p: pctOf(settings.commissionRate, 1) }), children: <Flex justify="end">{money(r.commission, true)}</Flex> },
              { key: 'sc', label: `${t('Shipping cost')} · ${r.desi} desi`, children: <Flex justify="end">{money(r.shippingCost, true)}</Flex> },
              { key: 'pk', label: t('Packaging'), children: <Flex justify="end">{money(r.packaging, true)}</Flex> },
              { key: 'cg', label: t('Cost of goods'), children: <Flex justify="end">{money(r.cogs, true)}</Flex> },
              { key: 'pf', label: <b>{t('Profit')}</b>, children: <Flex justify="end" gap={8} align="baseline"><Typography.Text type="secondary">{pct(r.margin)} · {r.qty ? `${tl(r.profit / r.qty)} ${t('per unit')}` : ''}</Typography.Text><Typography.Title level={4} style={{ margin: 0 }} type={r.profit < 0 ? 'danger' : undefined}>{tl(r.profit)} TL</Typography.Title></Flex> },
            ]} />
          <Collapse size="small" style={{ marginTop: 12 }} items={[{
            key: 'vat', label: `${t('VAT on this order (tracked separately)')}: ${tl(r.vatPayable)} TL`,
            children: (
              <Typography.Paragraph style={{ margin: 0 }}>
                {t('Your prices include VAT. Of what the customer pays, {out} TL is VAT you collect for the state. You also paid {inp} TL VAT on goods, shipping, packaging and commission. The difference, {d} TL, is what you pay in your VAT return.', { out: tl(r.vatOutput), inp: tl(r.vatInput), d: tl(r.vatPayable) })}{' '}
                {settings.deductVat ? t('It is deducted from the profit above.') : t('It is not deducted from the profit above. You can change that in Products & costs.')}
              </Typography.Paragraph>
            ),
          }]} />
        </Card>
      </Col>
    </Row>
  );
}
