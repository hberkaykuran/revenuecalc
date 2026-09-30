import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Checkbox, Col, Flex, Input, InputNumber, Row, Segmented, Select, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { compare, winnerMap, type CompareOption, type Metric } from '../compare';
import { useApp } from '../context';
import { num, pct, t, tl, tl0, uid } from '../i18n';
import { Section } from './common';
import { MarginChart, type ChartSeries } from './MarginChart';
import { boxText } from './Results';

const MAX = 5;
const key = (slot: number) => <svg width="16" height="8" aria-hidden="true"><line x1="1" y1="4" x2="15" y2="4" stroke={`var(--series-${slot})`} strokeWidth="3" strokeLinecap="round" /></svg>;

export function Compare() {
  const { state, setState, settings, ui, setUi, label } = useApp();
  const ps = settings.products;
  const [productId, setProductId] = useState(ps[0]?.id ?? '');
  const [maxQty, setMaxQty] = useState(24);
  const [metric, setMetric] = useState<Metric>('margin');
  const [name, setName] = useState('');
  const [pick, setPick] = useState<string[]>([]);
  const product = ps.find((p) => p.id === productId) ?? ps[0];

  // everything that can be compared: what's on now, nothing, and each saved combination
  const all: (CompareOption & { note: string })[] = [
    { id: 'now', name: t('Campaigns that are on'), campaigns: state.campaigns.filter((c) => c.active), stack: state.stack, note: '' },
    { id: 'none', name: t('No campaign'), campaigns: [], stack: {}, note: '' },
    ...state.scenarios.map((sc) => ({ id: sc.id, name: sc.name, campaigns: sc.campaigns, stack: sc.stack, note: '' })),
  ];
  const selectedIds = (ui.compare?.length ? ui.compare : ['now', 'none', ...state.scenarios.slice(0, 3).map((s) => s.id)]).filter((id) => all.some((o) => o.id === id)).slice(0, MAX);
  const options = selectedIds.map((id) => all.find((o) => o.id === id)!);
  const toggle = (id: string, on: boolean) => setUi((u) => ({ ...u, compare: on ? [...selectedIds, id].slice(0, MAX) : selectedIds.filter((x) => x !== id) }));

  const cmp = useMemo(() => (product && options.length ? compare(settings, product.id, options, Math.min(Math.max(1, maxQty), 60), metric) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings, product, JSON.stringify(options), maxQty, metric]);

  const fmt = (v: number) => (metric === 'margin' ? pct(v) : `${tl(v)} TL`);
  const lead = (v: number) => (metric === 'margin' ? t('{v} pts', { v: num(v * 100) }) : `${tl(v)} TL`);
  const tie = (v: number) => (metric === 'margin' ? v < 0.0005 : v < 0.5);
  const segName = (s: { boxName: string | null; from: number; to: number }) =>
    `${s.boxName ? t('{box} box', { box: t(s.boxName) }) : t('Several boxes')} · ${s.from === s.to ? s.from : `${s.from}–${s.to}`} ${t('pcs')}`;

  const saveCombo = () => {
    const cs = state.campaigns.filter((c) => pick.includes(c.id));
    if (!cs.length) return;
    const id = uid();
    setState((s) => ({ ...s, scenarios: [...s.scenarios, { id, name: name.trim() || cs.map(label).join(' + '), campaigns: cs, stack: { ...s.stack } }] }));
    setUi((u) => ({ ...u, compare: [...selectedIds, id].slice(0, MAX) }));
    setName(''); setPick([]);
  };

  if (!product) return null;
  const series: ChartSeries[] = cmp ? options.map((o, i) => ({ id: o.id, name: o.name, slot: i + 1, points: cmp.results[i].map((r, j) => ({ x: cmp.qtys[j], margin: r.margin, profit: r.profit })) })) : [];

  return (
    <Flex vertical gap={12}>
      <Section id="cmp-pick" title={t('What to compare')}
        sub={t('Pick up to {n}. A combination is a set of campaigns that run together, with the combination rules from the campaigns panel.', { n: MAX })}>
        <Row gutter={[12, 12]}>
          <Col xs={24} xl={14}>
            <Flex vertical gap={6}>
              {all.map((o) => {
                const i = selectedIds.indexOf(o.id);
                return (
                  <Flex key={o.id} gap={8} align="center" wrap>
                    <Checkbox checked={i >= 0} disabled={i < 0 && selectedIds.length >= MAX} onChange={(e) => toggle(o.id, e.target.checked)}>
                      <Space size={6}>{i >= 0 ? key(i + 1) : <span style={{ width: 16, display: 'inline-block' }} />}<b>{o.name}</b></Space>
                    </Checkbox>
                    <Flex wrap gap={2}>
                      {o.campaigns.length ? o.campaigns.map((c) => <Tag key={c.id}>{label(c)}</Tag>) : <Typography.Text type="secondary" className="tiny">{o.id === 'now' ? t('No campaigns are on.') : '—'}</Typography.Text>}
                    </Flex>
                    {o.id !== 'now' && o.id !== 'none' && (
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label={t('Delete')} onClick={() => setState((s) => ({ ...s, scenarios: s.scenarios.filter((x) => x.id !== o.id) }))} />
                    )}
                  </Flex>
                );
              })}
            </Flex>
          </Col>
          <Col xs={24} xl={10}>
            <Card size="small" type="inner" title={t('New combination')}>
              <Flex vertical gap={8}>
                <Select mode="multiple" value={pick} onChange={setPick} placeholder={t('Choose campaigns from your list')} style={{ width: '100%' }}
                  options={state.campaigns.map((c) => ({ value: c.id, label: label(c) }))} optionFilterProp="label" />
                <Space.Compact style={{ width: '100%' }}>
                  <Input id="combo-name" placeholder={t('Name (optional)')} value={name} onChange={(e) => setName(e.target.value)} onPressEnter={saveCombo} />
                  <Button type="primary" icon={<PlusOutlined />} disabled={!pick.length} onClick={saveCombo}>{t('Save and compare')}</Button>
                </Space.Compact>
                <Typography.Text type="secondary" className="tiny">{t('Add campaigns in the campaigns panel first; they do not need to be on.')}</Typography.Text>
              </Flex>
            </Card>
          </Col>
        </Row>
      </Section>

      {options.length < 2 ? <Alert type="info" showIcon message={t('Pick at least two things to compare.')} /> : cmp && (
        <>
          <Section id="cmp-where" title={t('Which one is stronger where')}
            extra={
              <Space wrap>
                <Select size="small" value={product.id} onChange={setProductId} style={{ width: 170 }} showSearch optionFilterProp="label" options={ps.map((p) => ({ value: p.id, label: p.name }))} />
                <Space size={4}>{t('Up to')}<InputNumber size="small" min={2} max={60} value={maxQty} onChange={(v) => v && setMaxQty(v)} style={{ width: 64 }} /></Space>
                <Segmented size="small" value={metric} onChange={(v) => setMetric(v as Metric)} options={[{ value: 'margin', label: t('Margin') }, { value: 'profit', label: t('Profit') }]} />
              </Space>
            }
            sub={t('Orders of one product, grouped by the box they ship in. Each card shows who has the best average {m} in that range.', { m: metric === 'margin' ? t('margin') : t('profit') })}>
            <Row gutter={[12, 12]}>
              {cmp.segments.map((sr) => {
                const w = options[sr.winner];
                const isTie = sr.runnerUp !== null && tie(sr.lead);
                return (
                  <Col key={sr.segment.key} xs={24} md={12} xl={6}>
                    <Card size="small" title={segName(sr.segment)} style={{ height: '100%' }}>
                      {isTie ? (
                        <Typography.Paragraph style={{ margin: 0 }}>{t('No difference between {a} and {b} here.', { a: w.name, b: options[sr.runnerUp!].name })}</Typography.Paragraph>
                      ) : (
                        <>
                          <Space size={6}>{key(sr.winner + 1)}<Typography.Text strong>{w.name}</Typography.Text></Space>
                          <Typography.Paragraph style={{ margin: '4px 0 0' }}>
                            {t('Average {v}', { v: fmt(sr.averages[sr.winner]) })}
                            {sr.runnerUp !== null && <Typography.Text type="success">{' '}(+{lead(sr.lead)} {t('over {b}', { b: options[sr.runnerUp].name })})</Typography.Text>}
                          </Typography.Paragraph>
                          <Typography.Text type="secondary" className="tiny">{t('Best at {a} of {b} order sizes', { a: sr.wins[sr.winner], b: sr.segment.to - sr.segment.from + 1 })}</Typography.Text>
                        </>
                      )}
                      <Flex vertical gap={2} style={{ marginTop: 8 }}>
                        {options.map((o, i) => (
                          <Flex key={o.id} justify="space-between" gap={8} className="tiny">
                            <Space size={4}>{key(i + 1)}<Typography.Text ellipsis style={{ maxWidth: 150 }}>{o.name}</Typography.Text></Space>
                            <Typography.Text strong={i === sr.winner}>{fmt(sr.averages[i])}</Typography.Text>
                          </Flex>
                        ))}
                      </Flex>
                    </Card>
                  </Col>
                );
              })}
            </Row>
            <div style={{ marginTop: 16 }}>
              <MarginChart series={series} metric={metric} bands={cmp.segments.map((s) => ({ from: s.segment.from, to: s.segment.to, label: s.segment.boxName ? t(s.segment.boxName) : t('Several boxes') }))} />
            </div>
          </Section>

          <Section id="cmp-table" title={t('Every order size')} sub={t('The best one for each size is marked. Hover a cell for what the customer pays.')}>
            <Table size="small" bordered pagination={false} scroll={{ x: 'max-content', y: 520 }}
              dataSource={cmp.qtys.map((q, i) => ({ key: q, q, i }))}
              columns={[
                { key: 'q', title: t('Qty'), dataIndex: 'q', fixed: 'left', width: 60 },
                { key: 'box', title: t('Box'), width: 110, render: (_, r) => <Tag>{boxText(cmp.results[0][r.i])}</Tag> },
                ...options.map((o, oi) => ({
                  key: o.id, title: <Space size={4}>{key(oi + 1)}{o.name}</Space>, align: 'right' as const,
                  render: (_: unknown, r: { i: number }) => {
                    const x = cmp.results[oi][r.i];
                    const best = cmp.best[r.i] === oi;
                    return (
                      <Tooltip title={<>{t('Customer pays')}: {tl(x.customerPays)}<br />{t('Profit')}: {tl(x.profit)}</>}>
                        <Flex justify="flex-end" gap={6} align="center">
                          {best && <Tag color="green" style={{ margin: 0 }}>{t('best')}</Tag>}
                          <Flex vertical align="flex-end">
                            <Typography.Text strong={best} type={x.profit < 0 ? 'danger' : undefined}>{pct(x.margin)}</Typography.Text>
                            <Typography.Text type="secondary" className="tiny">{tl(x.profit)} TL</Typography.Text>
                          </Flex>
                        </Flex>
                      </Tooltip>
                    );
                  },
                })),
              ]} />
          </Section>

          {ps.length >= 2 && <WinnerMap options={options} metric={metric} />}
        </>
      )}
    </Flex>
  );
}

function WinnerMap({ options, metric }: { options: CompareOption[]; metric: Metric }) {
  const { settings } = useApp();
  const ps = settings.products;
  const [xId, setX] = useState(ps[0].id);
  const [yId, setY] = useState(ps[1].id);
  const [n, setN] = useState(8);
  const x = ps.find((p) => p.id === xId) ?? ps[0];
  const y = ps.find((p) => p.id === yId && p.id !== x.id) ?? ps.find((p) => p.id !== x.id)!;
  const map = useMemo(() => winnerMap(settings, x.id, y.id, options, n, metric), [settings, x.id, y.id, options, n, metric]);
  const counts = options.map((_, i) => map.flat().filter((c) => c && c.winner === i).length);
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  return (
    <Section id="cmp-map" title={t('Mixed orders: who wins')}
      sub={t('Every mix of two products in one order. The colour and number show which one gives the best {m}; hover for the figures.', { m: metric === 'margin' ? t('margin') : t('profit') })}
      extra={
        <Space wrap>
          <Select size="small" value={x.id} onChange={setX} style={{ width: 140 }} options={ps.map((p) => ({ value: p.id, label: `→ ${p.name}` }))} />
          <Select size="small" value={y.id} onChange={setY} style={{ width: 140 }} options={ps.filter((p) => p.id !== x.id).map((p) => ({ value: p.id, label: `↓ ${p.name}` }))} />
          <Space size={4}>{t('Up to')}<InputNumber size="small" min={1} max={16} value={n} onChange={(v) => v && setN(v)} style={{ width: 60 }} /></Space>
        </Space>
      }>
      <Flex wrap gap={12} style={{ marginBottom: 8 }}>
        {options.map((o, i) => <Space key={o.id} size={4} className="tiny"><span className="win-key" style={{ background: `var(--series-${i + 1})` }}>{i + 1}</span>{o.name}: {Math.round((counts[i] / total) * 100)}%</Space>)}
      </Flex>
      <div className="mix-scroll">
        <table className="mix">
          <thead><tr><th>{y.name} ↓ · {x.name} →</th>{map[0].map((_, i) => <th key={i}>{i}</th>)}</tr></thead>
          <tbody>
            {map.map((row, j) => (
              <tr key={j}>
                <th>{j}</th>
                {row.map((c, i) => c === null ? <td key={i} /> : (
                  <Tooltip key={i} title={<>{i} {x.name} + {j} {y.name} · {boxText(c.results[0])}{options.map((o, k) => <div key={o.id}>{k + 1}. {o.name}: {pct(c.results[k].margin)} · {tl0(c.results[k].profit)} TL</div>)}</>}>
                    <td className="win-cell" style={{ background: `color-mix(in srgb, var(--series-${c.winner + 1}) ${c.lead > (metric === 'margin' ? 0.0005 : 0.5) ? 55 : 18}%, transparent)` }}>
                      {c.lead > (metric === 'margin' ? 0.0005 : 0.5) ? c.winner + 1 : '='}
                    </td>
                  </Tooltip>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Typography.Text type="secondary" className="tiny">{t('"=" means the top two are equal there.')}</Typography.Text>
    </Section>
  );
}
