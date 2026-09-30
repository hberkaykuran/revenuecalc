import { Alert, Button, Card, Col, Flex, InputNumber, Radio, Row, Select, Space, Switch, Table, Tag, Tooltip, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useApp } from '../context';
import { pct, pctOf, t, tl, uid } from '../i18n';
import { freeShipQty, notes, strategyIdeas, type Goal, type Idea, type StrategyInput } from '../strategy';
import { Num, Section } from './common';
import { boxText } from './Results';
import { calcWith } from '../engine';

const GOALS: { id: Goal; title: string; aim: string; why: string }[] = [
  { id: 'basket', title: 'Bigger baskets',
    aim: 'Customers who buy one or two buy enough to fill a box.',
    why: 'Shipping and packaging are paid per box, so extra units in the same box cost you only the product. Offers that only start at a quantity ("3 or more") reward just the customers who buy more, and quantity-framed offers tend to lift sales more than a plain % off.' },
  { id: 'freeShipping', title: 'Reach free shipping',
    aim: 'Orders just under the free-shipping threshold go over it.',
    why: 'Extra costs such as shipping are the most common reason shoppers abandon a cart. Many shoppers add items to qualify for free shipping, and thresholds a little above the usual order work best.' },
  { id: 'crossSell', title: 'Cross-sell',
    aim: 'Customers who buy one product add the other.',
    why: 'The second product usually ships in the same box, so almost all of its margin is extra profit. A small discount on the add-on, or a cart reward that the pair unlocks, gives a reason to add it.' },
  { id: 'conversion', title: 'Win more orders',
    aim: 'More visitors buy at all, even a single unit.',
    why: 'A discount on single units costs you on every order, including customers who would have bought anyway. The result shows how many extra orders you need to earn the same as today.' },
];

type SortBy = 'breakEven' | 'expected' | 'profit';

export function Ideas() {
  const { settings, setState, label, channel } = useApp();
  // on Trendyol the customer never pays shipping, so there is no free-shipping threshold to reach
  const goals = channel === 'trendyol' ? GOALS.filter((g) => g.id !== 'freeShipping') : GOALS;
  const ps = settings.products;
  const [inp, setInp] = useState<StrategyInput>({
    goal: 'basket', productId: ps[0]?.id ?? '', otherProductId: ps[1]?.id ?? ps[0]?.id ?? '',
    mix: [55, 20, 12, 6, 4, 3], goalQty: 3, minMargin: 20, minSaving: 5, maxSaving: 35, response: 20, combos: true,
  });
  const [sortBy, setSortBy] = useState<SortBy>('breakEven');
  const [limit, setLimit] = useState(15);
  const [flash, setFlash] = useState('');
  const set = (patch: Partial<StrategyInput>) => setInp((x) => ({ ...x, ...patch }));
  const product = ps.find((p) => p.id === inp.productId) ?? ps[0];
  const goal = GOALS.find((g) => g.id === inp.goal)!;

  const ideas = useMemo(() => {
    if (!product) return [];
    const list = strategyIdeas(settings, { ...inp, productId: product.id });
    const be = (i: Idea) => (i.breakEven === null ? 99 : i.breakEven);
    const key: Record<SortBy, (a: Idea, b: Idea) => number> = {
      breakEven: (a, b) => be(a) - be(b) || b.expectedChange - a.expectedChange,
      expected: (a, b) => b.expectedChange - a.expectedChange,
      profit: (a, b) => b.targetProfit - a.targetProfit,
    };
    return list.sort(key[sortBy]);
  }, [settings, inp, product, sortBy]);
  const today = useMemo(() => {
    if (!product) return 0;
    const total = inp.mix.reduce((a, b) => a + b, 0) || 1;
    return inp.mix.reduce((e, share, i) => e + (share / total) * calcWith(settings, { [product.id]: i + 1 }, []).profit, 0);
  }, [settings, inp.mix, product]);
  if (!product) return null;

  const boxSizes = [...settings.boxes].sort((a, b) => a.capacity - b.capacity).map((b) => ({ name: b.name, q: Math.floor(b.capacity / product.sizeUnits) }));
  const fq = freeShipQty(settings, product.price);
  const other = ps.find((p) => p.id === inp.otherProductId && p.id !== product.id) ?? ps.find((p) => p.id !== product.id);

  const beText = (i: Idea) => {
    if (inp.goal === 'conversion') return i.breakEven === null ? t('Never pays off') : t('{p} more orders', { p: pct(i.breakEven) });
    if (i.breakEven === null) return t('Never pays off');
    if (i.breakEven <= 0) return t('Pays off even if nobody changes');
    return t('{p} of customers (1 in {n})', { p: pct(i.breakEven), n: Math.max(1, Math.round(1 / i.breakEven)) });
  };

  const tryIdea = (i: Idea, on: boolean) => {
    setState((s) => ({ ...s, campaigns: [...i.campaigns.map((c) => ({ ...c, id: uid(), active: on })), ...s.campaigns] }));
    setFlash(on ? t('Turned on: {list}. Open Results to see it everywhere.', { list: i.campaigns.map(label).join(' + ') }) : t('Saved: {list}.', { list: i.campaigns.map(label).join(' + ') }));
  };

  return (
    <Flex vertical gap={12}>
      <Section id="goal" title={t('1. What are you aiming for?')}>
        <Radio.Group value={inp.goal} onChange={(e) => set({ goal: e.target.value })} style={{ width: '100%' }}>
          <Row gutter={[12, 12]}>
            {goals.map((g) => (
              <Col key={g.id} xs={24} md={12} xl={6}>
                <Card size="small" hoverable className={inp.goal === g.id ? 'goal on' : 'goal'} onClick={() => set({ goal: g.id })}>
                  <Radio value={g.id}><b>{t(g.title)}</b></Radio>
                  <Typography.Paragraph style={{ margin: '6px 0 0' }}>{t(g.aim)}</Typography.Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
        </Radio.Group>
        <Alert style={{ marginTop: 12 }} type="info" message={t('Why it works')} description={
          <>
            {t(goal.why)}{' '}
            {inp.goal === 'freeShipping' && <a href="https://baymard.com/lists/cart-abandonment-rate" target="_blank" rel="noreferrer">Baymard Institute</a>}
          </>
        } />
      </Section>

      <Section id="inputs" title={t('2. Your customers today')}
        sub={t('How orders of this product split by quantity today. Guess if you are not sure; the ranking holds up well.')}>
        <Flex wrap gap={16} align="end">
          <Space direction="vertical" size={2}><Typography.Text className="tiny">{t('Product')}</Typography.Text>
            <Select value={product.id} onChange={(v: string) => set({ productId: v })} style={{ width: 200 }} showSearch optionFilterProp="label" options={ps.map((p) => ({ value: p.id, label: p.name }))} /></Space>
          <Space direction="vertical" size={2}><Typography.Text className="tiny">{t('Share of orders by quantity')}</Typography.Text>
            <Space.Compact>
              {inp.mix.map((v, i) => (
                <Tooltip key={i} title={i === inp.mix.length - 1 ? t('{n} pcs or more', { n: i + 1 }) : t('{n} pcs', { n: i + 1 })}>
                  <InputNumber aria-label={t('{n} pcs', { n: i + 1 })} value={v} min={0} style={{ width: 72 }} suffix="%" prefix={<span className="tiny muted">{i + 1}{i === inp.mix.length - 1 ? '+' : ''}</span>}
                    onChange={(x) => typeof x === 'number' && set({ mix: inp.mix.map((y, j) => (j === i ? x : y)) })} />
                </Tooltip>
              ))}
            </Space.Compact>
            <Typography.Text type="secondary" className="tiny">{t('Average profit per order today: {x} TL', { x: tl(today) })}</Typography.Text>
          </Space>
          {inp.goal === 'basket' && (
            <Space direction="vertical" size={2}><Typography.Text className="tiny">{t('Target order')}</Typography.Text>
              <Space wrap>
                <Num id="goalq" label={t('Target order')} value={inp.goalQty} min={2} suffix={t('pcs')} width={100} onChange={(v) => set({ goalQty: Math.floor(v) })} />
                {boxSizes.map((b) => <Tag.CheckableTag key={b.name} checked={inp.goalQty === b.q} onChange={() => set({ goalQty: b.q })}>{t('fill {box}', { box: t(b.name).toLowerCase() })} ({b.q})</Tag.CheckableTag>)}
              </Space></Space>
          )}
          {inp.goal === 'freeShipping' && <Typography.Text>{t('Free shipping starts at {q} pcs ({x} TL).', { q: fq, x: tl(fq * product.price) })}</Typography.Text>}
          {inp.goal === 'crossSell' && other && (
            <Space direction="vertical" size={2}><Typography.Text className="tiny">{t('Add-on product')}</Typography.Text>
              <Select value={other.id} onChange={(v) => set({ otherProductId: v })} style={{ width: 200 }} showSearch optionFilterProp="label" options={ps.filter((p) => p.id !== product.id).map((p) => ({ value: p.id, label: p.name }))} /></Space>
          )}
        </Flex>
      </Section>

      <Section id="limits" title={t('3. Limits')}>
        <Flex wrap gap={16} align="end">
          <Space direction="vertical" size={2}><Typography.Text className="tiny">{t('Minimum margin on the target order')}</Typography.Text>
            <Num id="minm" value={inp.minMargin} suffix="%" width={100} onChange={(v) => set({ minMargin: v })} /></Space>
          <Space direction="vertical" size={2}><Typography.Text className="tiny">{t('Customer saves between')}</Typography.Text>
            <Space.Compact><Num id="mins" label={t('Minimum saving')} value={inp.minSaving} min={0} suffix="%" width={90} onChange={(v) => set({ minSaving: v })} /><Num id="maxs" label={t('Maximum saving')} value={inp.maxSaving} min={0} suffix="%" width={90} onChange={(v) => set({ maxSaving: v })} /></Space.Compact></Space>
          <Space direction="vertical" size={2}><Typography.Text className="tiny">{t('Customers you expect to respond')}</Typography.Text>
            <Num id="resp" value={inp.response} min={0} max={100} suffix="%" width={100} onChange={(v) => set({ response: v })} /></Space>
          <Space><Switch checked={inp.combos} onChange={(v) => set({ combos: v })} />{t('Also try product + cart campaign pairs')}</Space>
        </Flex>
      </Section>

      <Section id="ideas" title={t('{n} ideas', { n: ideas.length })}
        sub={inp.goal === 'conversion'
          ? t('"Break-even" is how many more orders you need to earn the same total profit as today.')
          : t('"Break-even" is the share of customers who must change their order for the campaign to beat doing nothing. Lower is safer.')}
        extra={<Select size="small" value={sortBy} onChange={setSortBy} style={{ width: 220 }} options={[
          { value: 'breakEven', label: t('Safest first (lowest break-even)') },
          { value: 'expected', label: t('Most expected profit') },
          { value: 'profit', label: t('Most profit on the target order') },
        ]} />}>
        {flash && <Alert type="success" showIcon closable onClose={() => setFlash('')} message={flash} style={{ marginBottom: 12 }} />}
        <Table size="small" bordered scroll={{ x: 'max-content' }} dataSource={ideas.slice(0, limit).map((i, k) => ({ ...i, key: k }))}
          pagination={false}
          locale={{ emptyText: t('Nothing meets these limits. Lower the minimum margin or the minimum saving.') }}
          columns={[
            { key: 'c', title: t('Campaign'), fixed: 'left', width: 260, render: (_, i) => <Flex wrap gap={4}>{i.campaigns.map((c) => <Tag key={c.id} color={c.mechanic.type.startsWith('cart') || c.mechanic.type === 'freeShipping' ? 'purple' : 'blue'}>{label(c)}</Tag>)}</Flex> },
            { key: 'be', title: t('Break-even'), render: (_, i) => <Typography.Text type={i.breakEven === null ? 'danger' : i.breakEven <= 0 ? 'success' : undefined}>{beText(i)}</Typography.Text> },
            { key: 'exp', title: t('At {r} response', { r: pctOf(inp.response) }), align: 'right', render: (_, i) => <Typography.Text type={i.expectedChange >= 0 ? 'success' : 'danger'}>{i.expectedChange >= 0 ? '+' : '−'}{tl(Math.abs(i.expectedChange))} / {t('order')}</Typography.Text> },
            { key: 'ign', title: t('If nobody responds'), align: 'right', render: (_, i) => i.lossIfIgnored > 0.005 ? <Typography.Text type="danger">−{tl(i.lossIfIgnored)} / {t('order')}</Typography.Text> : <Typography.Text type="success">{t('no cost')}</Typography.Text> },
            { key: 'tgt', title: t('Target order'), render: (_, i) => {
              const r = calcWith(settings, i.target, i.campaigns);
              return <Flex vertical><span>{Object.entries(i.target).map(([id, q]) => `${q} × ${ps.find((p) => p.id === id)?.name}`).join(' + ')}</span><Typography.Text type="secondary" className="tiny">{boxText(r)}</Typography.Text></Flex>;
            } },
            { key: 'pays', title: t('Customer pays'), align: 'right', render: (_, i) => <Flex vertical align="flex-end"><span>{tl(i.customerPays)}</span><Typography.Text type="secondary" className="tiny">{t('saves {p}', { p: pct(i.saving) })}</Typography.Text></Flex> },
            { key: 'p', title: t('Profit · margin'), align: 'right', render: (_, i) => <Flex vertical align="flex-end"><b>{tl(i.targetProfit)}</b><Typography.Text type="secondary" className="tiny">{pct(i.targetMargin)}</Typography.Text></Flex> },
            { key: 'a', title: '', fixed: 'right', width: 130, render: (_, i) => <Space><Button size="small" type="primary" onClick={() => tryIdea(i, true)}>{t('Try it')}</Button><Button size="small" onClick={() => tryIdea(i, false)}>{t('Save')}</Button></Space> },
          ]} />
        {ideas.length > limit && <Button type="link" onClick={() => setLimit(limit + 15)}>{t('Show more ({n} left)', { n: ideas.length - limit })}</Button>}
        <Typography.Paragraph type="secondary" className="tiny" style={{ marginTop: 8 }}>
          {t('Break-even compares average profit per order across your customer mix: today with no campaign, against the campaign when a share of customers moves to the target order. Discounts given to customers who would have bought anyway count as a cost.')}
        </Typography.Paragraph>
      </Section>

      <Section id="notes" title={t('Where your costs jump for {p}', { p: product.name })}>
        <Flex vertical gap={6}>
          {notes(settings, product.id).map((n, i) => <Alert key={i} type={n.kind === 'warn' ? 'warning' : n.kind === 'good' ? 'success' : 'info'} message={t(n.text, n.vars)} showIcon />)}
        </Flex>
      </Section>
    </Flex>
  );
}
