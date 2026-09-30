import { MinusSquareOutlined, PlusSquareOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Checkbox, Dropdown, Flex, InputNumber, Segmented, Select, Space, Table, Tag, theme, Tooltip, Typography } from 'antd';
import type { ColumnsType, ColumnType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useApp } from '../context';
import { boxCounts, calcOrder, type OrderResult } from '../engine';
import { num, pct, t, tl, tl0 } from '../i18n';
import type { Cart } from '../types';
import { Section } from './common';
import { MarginChart, type ChartSeries } from './MarginChart';

type Metric = 'margin' | 'profit' | 'perUnit';
const metricValue = (r: OrderResult, m: Metric) => (m === 'margin' ? r.margin : m === 'profit' ? r.profit : r.qty ? r.profit / r.qty : 0);
const metricText = (v: number, m: Metric) => (m === 'margin' ? pct(v) : tl(v));
const signed = (v: number, m: Metric) => `${v >= 0 ? '+' : '−'}${m === 'margin' ? t('{v} pts', { v: num(Math.abs(v) * 100) }) : tl(Math.abs(v))}`;

export const boxText = (r: OrderResult) => boxCounts(r.boxes).map(([n, c]) => (c > 1 ? `${c}× ${t(n)}` : t(n))).join(' + ') || '—';

function MetricSwitch({ value, onChange }: { value: Metric; onChange: (m: Metric) => void }) {
  return <Segmented size="small" value={value} onChange={(v) => onChange(v as Metric)}
    options={[{ value: 'margin', label: t('Margin') }, { value: 'profit', label: t('Profit') }, { value: 'perUnit', label: t('Per unit') }]} />;
}

export function Results() {
  return (
    <Flex vertical gap={12}>
      <MarginSummary />
      <QuantityTable />
      <MixGrid />
    </Flex>
  );
}

function Cell({ r, base, metric }: { r: OrderResult; base?: OrderResult; metric: Metric }) {
  const v = metricValue(r, metric);
  const d = base ? v - metricValue(base, metric) : 0;
  return (
    <Flex vertical align="flex-end">
      <Typography.Text type={r.profit < 0 ? 'danger' : undefined} strong>{metricText(v, metric)}</Typography.Text>
      <Typography.Text type="secondary" className="tiny">
        {metric === 'margin' ? tl(r.profit) : pct(r.margin)}
      </Typography.Text>
      {base && Math.abs(d) > 0.0005 && (
        <Typography.Text type={d > 0 ? 'success' : 'danger'} className="tiny">{signed(d, metric)}</Typography.Text>
      )}
    </Flex>
  );
}

function MarginSummary() {
  const { settings, calc, calcBase, whatIfOn, state } = useApp();
  const [metric, setMetric] = useState<Metric>('margin');
  const [maxQty, setMaxQty] = useState(12);
  const [picked, setPicked] = useState<string[]>([]);
  const [compare, setCompare] = useState(true);
  const qs = Array.from({ length: Math.min(Math.max(1, maxQty), 60) }, (_, i) => i + 1);
  const rows = settings.products.map((p) => ({
    key: p.id, name: p.name,
    results: qs.map((q) => calc({ [p.id]: q })),
    base: whatIfOn ? qs.map((q) => calcBase({ [p.id]: q })) : undefined,
  }));
  const shown = (picked.length ? picked : settings.products.slice(0, 3).map((p) => p.id)).filter((id) => rows.some((r) => r.key === id)).slice(0, 3);
  const anyOn = state.campaigns.some((c) => c.active);
  const series: ChartSeries[] = [];
  shown.forEach((id, i) => {
    const row = rows.find((r) => r.key === id)!;
    series.push({ id, name: row.name, slot: i + 1, points: row.results.map((r, j) => ({ x: qs[j], margin: r.margin, profit: r.profit })) });
    if (compare && (anyOn || whatIfOn)) {
      const ref = whatIfOn ? row.base! : qs.map((q) => calcOrder(settings, { [id]: q }, [], {}));
      series.push({ id: `${id}-ref`, name: `${row.name} · ${whatIfOn ? t('saved prices') : t('no campaign')}`, slot: i + 1, dashed: true, points: ref.map((r, j) => ({ x: qs[j], margin: r.margin, profit: r.profit })) });
    }
  });
  const columns: ColumnsType<(typeof rows)[number]> = [
    { key: 'name', title: t('Product'), dataIndex: 'name', fixed: 'left', width: 140, ellipsis: true },
    ...qs.map((q, i) => ({
      key: q, title: `${q} ${t('pcs')}`, align: 'right' as const, width: 96,
      render: (_: unknown, row: (typeof rows)[number]) => <Cell r={row.results[i]} base={row.base?.[i]} metric={metric} />,
    })),
  ];
  return (
    <Section id="summary" title={t('Margin by quantity')}
      sub={t('Margin = profit ÷ what the customer pays. Profit is after commission, shipping, packaging and cost of goods.')}
      extra={<Space wrap><MetricSwitch value={metric} onChange={setMetric} /><Space size={4}>{t('Up to')}<InputNumber size="small" min={1} max={60} value={maxQty} onChange={(v) => v && setMaxQty(v)} style={{ width: 64 }} /></Space></Space>}>
      <Flex wrap gap={12} align="center" style={{ marginBottom: 8 }}>
        <Select mode="multiple" size="small" maxCount={3} value={shown} onChange={setPicked} style={{ minWidth: 220 }}
          options={settings.products.map((p) => ({ value: p.id, label: p.name }))} aria-label={t('Products in the chart')} />
        {(anyOn || whatIfOn) && <Checkbox checked={compare} onChange={(e) => setCompare(e.target.checked)}>{whatIfOn ? t('Dashed: saved prices') : t('Dashed: no campaign')}</Checkbox>}
      </Flex>
      <MarginChart series={series} />
      <Table size="small" pagination={false} columns={columns} dataSource={rows} scroll={{ x: 'max-content' }} bordered style={{ marginTop: 12 }} />
    </Section>
  );
}

type Row = { key: number; q: number; r: OrderResult; delta: number; boxChange: boolean; base?: OrderResult };
type Col = { id: string; title: string; render: (row: Row) => React.ReactNode };
type Group = { id: string; title: string; summary: string; cols: Col[] };

function QuantityTable() {
  const { settings, calc, calcBase, whatIfOn, ui, setUi, label } = useApp();
  const { token } = theme.useToken();
  const products = settings.products;
  const [productId, setProductId] = useState(products[0]?.id ?? '');
  const [maxQty, setMaxQty] = useState(24);
  const product = products.find((p) => p.id === productId) ?? products[0];

  const rows: Row[] = useMemo(() => {
    if (!product) return [];
    const out: Row[] = [];
    let prev: OrderResult | null = null;
    for (let q = 1; q <= Math.min(Math.max(1, maxQty), 200); q++) {
      const cart: Cart = { [product.id]: q };
      const r = calc(cart);
      out.push({ key: q, q, r, delta: prev ? r.profit - prev.profit : r.profit, boxChange: !!prev && prev.desi !== r.desi, base: whatIfOn ? calcBase(cart) : undefined });
      prev = r;
    }
    return out;
  }, [product, maxQty, calc, calcBase, whatIfOn]);

  if (!product) return null;
  const neg = (v: number) => (v > 0.005 ? `−${tl(v)}` : '—');
  const groups: Group[] = [
    { id: 'order', title: t('Order'), summary: 'box', cols: [
      { id: 'box', title: t('Box'), render: (x) => <Tag>{boxText(x.r)}</Tag> },
      { id: 'desi', title: t('Desi'), render: (x) => tl0(x.r.desi) },
    ] },
    { id: 'result', title: t('Result'), summary: 'profit', cols: [
      { id: 'profit', title: t('Profit'), render: (x) => (
        <Flex vertical align="flex-end">
          <Typography.Text strong type={x.r.profit < 0 ? 'danger' : undefined}>{tl(x.r.profit)}</Typography.Text>
          {x.base && Math.abs(x.r.profit - x.base.profit) > 0.005 && <Typography.Text className="tiny" type={x.r.profit > x.base.profit ? 'success' : 'danger'}>{signed(x.r.profit - x.base.profit, 'profit')}</Typography.Text>}
        </Flex>
      ) },
      { id: 'margin', title: t('Margin'), render: (x) => <Typography.Text strong>{pct(x.r.margin)}</Typography.Text> },
      { id: 'perUnit', title: t('Per unit'), render: (x) => tl(x.r.profit / x.q) },
      { id: 'delta', title: t('+1 unit'), render: (x) => <Typography.Text type={x.delta < 0 ? 'danger' : 'success'}>{x.delta >= 0 ? '+' : '−'}{tl(Math.abs(x.delta))}</Typography.Text> },
    ] },
    { id: 'revenue', title: t('Revenue'), summary: 'pays', cols: [
      { id: 'list', title: t('List price'), render: (x) => tl(x.r.list) },
      { id: 'disc', title: t('Discounts'), render: (x) => neg(x.r.totalDiscount) },
      { id: 'products', title: t('Products'), render: (x) => tl(x.r.productRevenue) },
      { id: 'shipIn', title: t('Shipping fee'), render: (x) => (x.r.shippingCharged ? tl(x.r.shippingCharged) : <Tag color="green">{t('free')}</Tag>) },
      { id: 'pays', title: t('Customer pays'), render: (x) => (
        <Tooltip title={<>{t('Products')}: {tl(x.r.productRevenue)}<br />{t('Shipping fee')}: {tl(x.r.shippingCharged)}{x.r.totalDiscount > 0.005 && <><br />{t('Discounts')}: −{tl(x.r.totalDiscount)}</>}</>}>
          <span className="dotted">{tl(x.r.customerPays)}</span>
        </Tooltip>
      ) },
    ] },
    { id: 'costs', title: t('Costs'), summary: 'costs', cols: [
      { id: 'comm', title: t('Commission'), render: (x) => neg(x.r.commission) },
      { id: 'ship', title: t('Shipping cost'), render: (x) => neg(x.r.shippingCost) },
      { id: 'pack', title: t('Packaging'), render: (x) => neg(x.r.packaging) },
      { id: 'cogs', title: t('Cost of goods'), render: (x) => neg(x.r.cogs) },
      { id: 'costs', title: t('Total costs'), render: (x) => (
        <Tooltip title={<>{t('Commission')}: {tl(x.r.commission)}<br />{t('Shipping cost')}: {tl(x.r.shippingCost)}<br />{t('Packaging')}: {tl(x.r.packaging)}{x.r.orderFee > 0 && <><br />{t('Order fee')}: {tl(x.r.orderFee)}</>}<br />{t('Cost of goods')}: {tl(x.r.cogs)}</>}>
          <span className="dotted">{neg(x.r.costs)}</span>
        </Tooltip>
      ) },
    ] },
    { id: 'tax', title: t('VAT'), summary: 'vat', cols: [
      { id: 'vat', title: t('VAT payable'), render: (x) => tl(x.r.vatPayable) },
    ] },
    { id: 'camps', title: t('Campaigns'), summary: 'applied', cols: [
      { id: 'applied', title: t('Applied'), render: (x) => (
        <Flex wrap gap={2}>{x.r.applied.map((c) => <Tag key={c.id} color="blue">{label(c)}</Tag>)}
          {x.r.skipped.map((c) => <Tooltip key={c.id} title={t('Left out by combination rules')}><Tag>{label(c)}</Tag></Tooltip>)}</Flex>
      ) },
    ] },
  ];
  const tableId = 'qty';
  const hidden = new Set(ui.hiddenCols[tableId] ?? []);
  const open = new Set(ui.openGroups[tableId] ?? ['order', 'result']);
  const toggleGroup = (g: string) => setUi((u) => {
    const cur = new Set(u.openGroups[tableId] ?? ['order', 'result']);
    if (cur.has(g)) cur.delete(g); else cur.add(g);
    return { ...u, openGroups: { ...u.openGroups, [tableId]: [...cur] } };
  });
  const toggleCol = (c: string) => setUi((u) => {
    const cur = new Set(u.hiddenCols[tableId] ?? []);
    if (cur.has(c)) cur.delete(c); else cur.add(c);
    return { ...u, hiddenCols: { ...u.hiddenCols, [tableId]: [...cur] } };
  });

  const columns: ColumnsType<Row> = [
    { key: 'q', title: t('Qty'), dataIndex: 'q', fixed: 'left', width: 56, render: (q) => <b>{q}</b> },
    ...groups.map((g) => {
      const expanded = open.has(g.id) && g.cols.length > 1;
      const cols = (expanded ? g.cols : g.cols.filter((c) => c.id === g.summary)).filter((c) => !hidden.has(c.id));
      if (!cols.length) return null;
      return {
        key: g.id,
        title: g.cols.length > 1 ? (
          <Button type="text" size="small" icon={expanded ? <MinusSquareOutlined /> : <PlusSquareOutlined />} onClick={() => toggleGroup(g.id)}>{g.title}</Button>
        ) : g.title,
        children: cols.map((c): ColumnType<Row> => ({ key: c.id, title: c.title, align: c.id === 'box' || c.id === 'applied' ? 'left' : 'right', render: (_, row) => c.render(row) })),
      };
    }).filter(Boolean) as ColumnsType<Row>,
  ];

  const colMenu = (
    <div className="col-menu" style={{ background: token.colorBgElevated, boxShadow: token.boxShadowSecondary }}>
      {groups.map((g) => (
        <div key={g.id}>
          <Typography.Text type="secondary" className="tiny">{g.title}</Typography.Text>
          {g.cols.map((c) => <Checkbox key={c.id} checked={!hidden.has(c.id)} onChange={() => toggleCol(c.id)}>{c.title}</Checkbox>)}
        </div>
      ))}
    </div>
  );

  return (
    <Section id="byqty" title={t('By quantity')}
      sub={t('Every order size for one product. Click a column group to expand or shrink it. Rows where one more unit lowers profit are marked red.')}
      extra={
        <Space wrap>
          <Select size="small" value={product.id} onChange={(v: string) => setProductId(v)} style={{ width: 170 }} showSearch optionFilterProp="label" options={products.map((p) => ({ value: p.id, label: p.name }))} />
          <Space size={4}>{t('Up to')}<InputNumber size="small" min={1} max={200} value={maxQty} onChange={(v) => v && setMaxQty(v)} style={{ width: 64 }} /></Space>
          <Dropdown trigger={['click']} popupRender={() => colMenu}><Button size="small" icon={<SettingOutlined />}>{t('Columns')}</Button></Dropdown>
        </Space>
      }>
      <Table size="small" bordered pagination={false} columns={columns} dataSource={rows} scroll={{ x: 'max-content', y: 520 }}
        rowClassName={(r) => `${r.delta < 0 ? 'row-loss' : ''} ${r.boxChange ? 'row-box' : ''}`} />
    </Section>
  );
}

function MixGrid() {
  const { settings, calc } = useApp();
  const { token } = theme.useToken();
  const ps = settings.products;
  const [xId, setX] = useState(ps[0]?.id);
  const [yId, setY] = useState(ps[1]?.id);
  const [metric, setMetric] = useState<Metric>('margin');
  const [size, setSize] = useState(12);
  if (ps.length < 2) return null;
  const x = ps.find((p) => p.id === xId) ?? ps[0];
  const y = ps.find((p) => p.id === yId && p.id !== x.id) ?? ps.find((p) => p.id !== x.id)!;
  const n = Math.min(Math.max(1, size), 24);
  const grid = Array.from({ length: n + 1 }, (_, j) => Array.from({ length: n + 1 }, (__, i) => calc({ [x.id]: i, [y.id]: j })));
  const vals = grid.flat().filter((r) => r.qty > 0).map((r) => metricValue(r, metric));
  const max = Math.max(...vals, 0.0001);
  const bg = (v: number) => (v < 0 ? token.colorErrorBg : `color-mix(in srgb, ${token.colorPrimary} ${Math.round((v / max) * 35)}%, transparent)`);
  return (
    <Section id="mix" title={t('Mixed orders')}
      sub={t('Every combination of two products in one order, with all campaigns that are on. Hover a cell for details.')}
      extra={
        <Space wrap>
          <Select size="small" value={x.id} onChange={setX} options={ps.map((p) => ({ value: p.id, label: `→ ${p.name}` }))} style={{ width: 90 }} />
          <Select size="small" value={y.id} onChange={setY} options={ps.filter((p) => p.id !== x.id).map((p) => ({ value: p.id, label: `↓ ${p.name}` }))} style={{ width: 90 }} />
          <Space size={4}>{t('Up to')}<InputNumber size="small" min={1} max={24} value={size} onChange={(v) => v && setSize(v)} style={{ width: 60 }} /></Space>
          <MetricSwitch value={metric} onChange={setMetric} />
        </Space>
      }>
      <div className="mix-scroll">
        <table className="mix">
          <thead><tr><th>{y.name} ↓ · {x.name} →</th>{grid[0].map((_, i) => <th key={i}>{i}</th>)}</tr></thead>
          <tbody>
            {grid.map((row, j) => (
              <tr key={j}>
                <th>{j}</th>
                {row.map((r, i) => r.qty === 0 ? <td key={i} /> : (
                  <Tooltip key={i} title={<>{i} {x.name} + {j} {y.name}<br />{boxText(r)} · {r.desi} desi<br />{t('Customer pays')} {tl(r.customerPays)}<br />{t('Profit')} {tl(r.profit)} ({pct(r.margin)})</>}>
                    <td style={{ background: bg(metricValue(r, metric)) }}>{metric === 'margin' ? pct(r.margin) : tl0(metricValue(r, metric))}</td>
                  </Tooltip>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
