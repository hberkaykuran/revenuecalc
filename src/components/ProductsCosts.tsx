import { DeleteOutlined, DownloadOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Checkbox, Col, Flex, Input, Popconfirm, Radio, Row, Select, Space, Table, Typography, Upload } from 'antd';
import { useState } from 'react';
import { useApp } from '../context';
import { catalogSize, MESH_STICK_CATALOG } from '../catalog';
import { defaultStore } from '../defaults';
import { pct, t, uid } from '../i18n';
import { migrate } from '../store';
import type { Box, Product, Settings, TariffRow } from '../types';
import { Num } from './common';

export function ProductsCosts() {
  const { state, setState } = useApp();
  const s = state.settings;
  const [bulk, setBulk] = useState(55);
  const set = (patch: Partial<Settings>) => setState((st) => ({ ...st, settings: { ...st.settings, ...patch } }));
  const setProduct = (id: string, patch: Partial<Product>) => set({ products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const setBox = (id: string, patch: Partial<Box>) => set({ boxes: s.boxes.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  const setRow = (i: number, patch: Partial<TariffRow>) => set({ tariff: s.tariff.map((r, j) => (j === i ? { ...r, ...patch } : r)) });

  return (
    <Flex vertical gap={12}>
      <Card size="small" title={t('Products')} extra={
        <Space wrap>
          <Popconfirm title={t('Add the {n} Mesh Stick products with their Shopify prices?', { n: MESH_STICK_CATALOG.length })} description={t('Products you already have (same SKU) are kept; only their box size is filled in if it is still 1. Costs start at 0.')}
            okText={t('Add')} cancelText={t('Cancel')} onConfirm={() => {
              const bySku = new Map(MESH_STICK_CATALOG.map((c) => [c.sku, c]));
              const have = new Set(s.products.map((p) => p.sku).filter(Boolean));
              // products added before sizes were known keep everything but get their box size
              const kept = s.products.map((p) => { const c = p.sku ? bySku.get(p.sku) : undefined; return c && p.sizeUnits === 1 ? { ...p, sizeUnits: catalogSize(c) } : p; });
              const add = MESH_STICK_CATALOG.filter((c) => !have.has(c.sku)).map((c) => ({ id: uid(), sku: c.sku, barcode: c.barcode, name: c.name, cost: 0, price: c.price, vatRate: 1, sizeUnits: catalogSize(c) }));
              set({ products: [...kept, ...add] });
            }}>
            <Button size="small">{t('Add Mesh Stick products')}</Button>
          </Popconfirm>
          <Button size="small" icon={<PlusOutlined />} onClick={() => set({ products: [...s.products, { id: uid(), name: t('Product {n}', { n: s.products.length + 1 }), cost: 50, price: 120, vatRate: 1, sizeUnits: 1 }] })}>{t('Add product')}</Button>
        </Space>
      }>
        <Typography.Paragraph type="secondary">{t('Sale price and cost include VAT.')}</Typography.Paragraph>
        {s.products.some((p) => !p.cost) && (
          <Alert type="warning" showIcon style={{ marginBottom: 8 }} message={t('{n} products have no cost yet, so their margin reads too high.', { n: s.products.filter((p) => !p.cost).length })}
            action={
              <Space.Compact>
                <Num id="bulk-cost" label={t('Cost for all of them')} value={bulk} min={0} step={5} suffix="TL" width={110} onChange={setBulk} />
                <Button onClick={() => bulk > 0 && set({ products: s.products.map((p) => (p.cost ? p : { ...p, cost: bulk })) })}>{t('Set for all without cost')}</Button>
              </Space.Compact>
            } />
        )}
        <Table size="small" rowKey="id" pagination={s.products.length > 15 ? { pageSize: 15, size: 'small' } : false} dataSource={s.products} scroll={{ x: 'max-content' }}
          columns={[
            { key: 'name', title: t('Name'), render: (_, p) => <Input id={`p-name-${p.id}`} value={p.name} onChange={(e) => setProduct(p.id, { name: e.target.value })} style={{ width: 260 }} /> },
            { key: 'price', title: t('Sale price'), render: (_, p) => <Num id={`p-price-${p.id}`} value={p.price} min={0} step={5} suffix="TL" onChange={(v) => setProduct(p.id, { price: v })} /> },
            { key: 'cost', title: t('Cost'), render: (_, p) => <Num id={`p-cost-${p.id}`} value={p.cost} min={0} step={5} suffix="TL" onChange={(v) => setProduct(p.id, { cost: v })} /> },
            { key: 'gm', title: t('Gross margin'), align: 'right', render: (_, p) => (p.price > 0 ? pct((p.price - p.cost) / p.price) : '—') },
            { key: 'vat', title: t('Sale VAT'), render: (_, p) => <Num id={`p-vat-${p.id}`} value={p.vatRate} min={0} suffix="%" width={90} onChange={(v) => setProduct(p.id, { vatRate: v })} /> },
            { key: 'cvat', title: t('Purchase VAT'), render: (_, p) => <Num id={`p-cvat-${p.id}`} value={p.costVatRate ?? p.vatRate} min={0} suffix="%" width={90} onChange={(v) => setProduct(p.id, { costVatRate: v })} /> },
            { key: 'size', title: t('Box slots per unit'), render: (_, p) => <Num id={`p-size-${p.id}`} value={p.sizeUnits} min={0} step={0.1} width={90} onChange={(v) => setProduct(p.id, { sizeUnits: v })} /> },
            { key: 'x', title: '', render: (_, p) => (
              <Popconfirm title={t('Remove {p}?', { p: p.name })} okText={t('Remove')} cancelText={t('Cancel')} disabled={s.products.length <= 1} onConfirm={() => set({ products: s.products.filter((x) => x.id !== p.id) })}>
                <Button type="text" danger icon={<DeleteOutlined />} disabled={s.products.length <= 1} aria-label={t('Remove')} />
              </Popconfirm>
            ) },
          ]} />
      </Card>

      <Row gutter={[12, 12]}>
        <Col xs={24} xl={12}>
          <Card size="small" title={t('Boxes and packaging')} extra={<Button size="small" icon={<PlusOutlined />} onClick={() => set({ boxes: [...s.boxes, { id: uid(), name: t('New box'), desi: 6, capacity: 18, packagingCost: 10 }] })}>{t('Add box')}</Button>}>
            <Typography.Paragraph type="secondary">{t('An order goes in the smallest box that fits. Above the largest box it ships as several boxes, billed on total desi. Packaging is your cost per box (box, tape, label), VAT included.')}</Typography.Paragraph>
            <Table size="small" rowKey="id" pagination={false} dataSource={s.boxes} scroll={{ x: 'max-content' }}
              columns={[
                { key: 'n', title: t('Box'), render: (_, b) => <Input id={`b-name-${b.id}`} value={b.name} onChange={(e) => setBox(b.id, { name: e.target.value })} style={{ width: 110 }} /> },
                { key: 'd', title: t('Desi'), render: (_, b) => <Num id={`b-desi-${b.id}`} value={b.desi} min={0} width={80} onChange={(v) => setBox(b.id, { desi: v })} /> },
                { key: 'c', title: t('Holds'), render: (_, b) => <Num id={`b-cap-${b.id}`} value={b.capacity} min={1} suffix={t('pcs')} width={100} onChange={(v) => setBox(b.id, { capacity: v })} /> },
                { key: 'p', title: t('Packaging'), render: (_, b) => <Num id={`b-pack-${b.id}`} value={b.packagingCost} min={0} suffix="TL" width={100} onChange={(v) => setBox(b.id, { packagingCost: v })} /> },
                { key: 'x', title: '', render: (_, b) => <Button type="text" danger icon={<DeleteOutlined />} disabled={s.boxes.length <= 1} onClick={() => set({ boxes: s.boxes.filter((x) => x.id !== b.id) })} aria-label={t('Remove')} /> },
              ]} />
            <Checkbox style={{ marginTop: 12 }} checked={s.overflowRemainderBestFit} onChange={(e) => set({ overflowRemainderBestFit: e.target.checked })}>
              {t('Put leftover units in the smallest box that fits (13 pcs = large + small). Off: whole large boxes only.')}
            </Checkbox>
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card size="small" title={t('Fees and VAT')}>
            <Row gutter={[12, 12]}>
              {([
                ['customerShippingFee', 'Shipping fee to customer', 'TL', 'VAT included'],
                ['freeShippingThreshold', 'Free shipping from', 'TL', 'Product total after all discounts'],
                ['commissionRate', 'Platform commission', '%', 'On products after discounts'],
                ['orderFee', 'Fee per order', 'TL', 'Fixed platform fee per order, VAT included'],
                ['ephRate', 'EPH', '%', 'Added to the shipping tariff'],
                ['shippingVatRate', 'Shipping VAT', '%', 'Added to the shipping tariff'],
                ['commissionVatRate', 'VAT inside commission', '%', 'Shopify invoices from abroad without Turkish VAT, so 0. Only for the separate VAT figure.'],
                ['packagingVatRate', 'VAT inside packaging', '%', 'Only for the separate VAT figure; profit does not change'],
              ] as const).map(([k, label, unit, hint]) => (
                <Col key={k} xs={12} md={8}>
                  <Typography.Text className="tiny">{t(label)}</Typography.Text><br />
                  <Num id={`f-${k}`} value={s[k]} min={0} step={unit === '%' ? 0.1 : 5} suffix={unit} width="100%" onChange={(v) => set({ [k]: v } as Partial<Settings>)} />
                  {hint && <Typography.Text type="secondary" className="tiny">{t(hint)}</Typography.Text>}
                </Col>
              ))}
            </Row>
            <Typography.Text strong style={{ display: 'block', marginTop: 16 }}>{t('VAT in profit')}</Typography.Text>
            <Radio.Group value={s.vatMode} onChange={(e) => set({ vatMode: e.target.value })} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
              <Radio value="gross">{t('Leave VAT out of profit. Prices and costs count as paid; VAT is shown separately.')}</Radio>
              <Radio value="recoverable">{t('VAT is settled and credit comes back. VAT you owe lowers profit; excess VAT you paid (devreden KDV) raises it, because you get it refunded or use it later.')}</Radio>
              <Radio value="notRecoverable">{t('VAT is settled but credit is lost. VAT you owe lowers profit; excess VAT you paid is never recovered.')}</Radio>
            </Radio.Group>
          </Card>
        </Col>
      </Row>

      <Card size="small" title={t('Shipping tariff')} extra={
        <Space>{t('Zone')}<Select size="small" value={s.zoneIndex} onChange={(v) => set({ zoneIndex: v })} options={s.zones.map((z, i) => ({ value: i, label: z }))} style={{ width: 120 }} /></Space>
      }>
        <Typography.Paragraph type="secondary">{t('TL per shipment by total desi, VAT and EPH excluded. Tick "per desi" for rows priced per desi.')}</Typography.Paragraph>
        <Table size="small" pagination={false} rowKey={(_, i) => String(i)} dataSource={s.tariff} scroll={{ x: 'max-content' }}
          columns={[
            { key: 'f', title: t('From'), render: (_, r, i) => <Num id={`t-f-${i}`} value={r.from} min={0} width={80} onChange={(v) => setRow(i, { from: v })} /> },
            { key: 't', title: t('To'), render: (_, r, i) => <Num id={`t-t-${i}`} value={r.to} min={0} width={90} onChange={(v) => setRow(i, { to: v })} /> },
            ...s.zones.map((z, zi) => ({ key: `z${zi}`, title: zi === s.zoneIndex ? <b>{z}</b> : z, render: (_: unknown, r: TariffRow, i: number) => (
              <Num id={`t-${i}-${zi}`} value={r.prices[zi] ?? 0} min={0} width={90} onChange={(v) => setRow(i, { prices: s.zones.map((__, k) => (k === zi ? v : r.prices[k] ?? 0)) })} />
            ) })),
            { key: 'pd', title: t('Per desi'), render: (_, r, i) => <Checkbox checked={r.perDesi} onChange={(e) => setRow(i, { perDesi: e.target.checked })} /> },
            { key: 'x', title: '', render: (_, __, i) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => set({ tariff: s.tariff.filter((_, j) => j !== i) })} aria-label={t('Remove')} /> },
          ]} />
        <Space style={{ marginTop: 8 }}>
          <Button size="small" icon={<PlusOutlined />} onClick={() => { const l = s.tariff[s.tariff.length - 1]; set({ tariff: [...s.tariff, { from: (l?.to ?? 0) + 1, to: (l?.to ?? 0) + 5, prices: s.zones.map(() => 0), perDesi: false }] }); }}>{t('Add row')}</Button>
          <Button size="small" onClick={() => { const p = s.tariff.map((r) => r.prices[s.zoneIndex] ?? 0); set({ tariff: s.tariff.map((r, i) => ({ ...r, prices: s.zones.map(() => p[i]) })) }); }}>{t("Copy this zone's prices to all zones")}</Button>
        </Space>
      </Card>

      <DataCard />
    </Flex>
  );
}

type Downloads = { save: (f: { filename: string; data: Blob }) => Promise<unknown> };

/** Save a file through the claude.ai viewer inside an artifact, else with a normal download link. */
async function saveJson(filename: string, data: Blob): Promise<'saved' | 'declined'> {
  const w = window as unknown as { claude?: { use: (n: string) => Promise<Downloads | null> } };
  const dl = w.claude ? await w.claude.use('downloads').catch(() => null) : null;
  if (dl) {
    try { await dl.save({ filename, data }); return 'saved'; } catch { return 'declined'; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(data);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return 'saved';
}

function DataCard() {
  const { store, setStore } = useApp();
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [text, setText] = useState('');
  const load = (raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed?.settings && !Array.isArray(parsed?.channels)) throw new Error('bad');
      setStore(() => migrate(parsed));
      setMsg({ type: 'success', text: t('Loaded.') });
    } catch { setMsg({ type: 'error', text: t('That is not saved calculator data. Use a file or text made with Export.') }); }
  };
  const exportFile = async () => {
    const res = await saveJson(`revenuecalc-${new Date().toISOString().slice(0, 10)}.json`, new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' }));
    setMsg(res === 'saved' ? { type: 'success', text: t('Exported.') } : { type: 'error', text: t('The download was not saved.') });
  };
  return (
    <Card size="small" title={t('Save and move data')}>
      <Typography.Paragraph type="secondary">{t('Everything saves automatically in this browser. Export a file to keep a backup or to open the same setup on another computer.')}</Typography.Paragraph>
      <Space wrap>
        <Button icon={<DownloadOutlined />} onClick={exportFile}>{t('Export file')}</Button>
        <Upload accept="application/json,.json" showUploadList={false} beforeUpload={(f) => { f.text().then(load); return false; }}>
          <Button icon={<UploadOutlined />}>{t('Import file')}</Button>
        </Upload>
        <Button onClick={async () => {
          const json = JSON.stringify(store);
          setText(json);
          try { await navigator.clipboard.writeText(json); setMsg({ type: 'success', text: t('Copied to clipboard.') }); } catch { setMsg({ type: 'success', text: t('Select the text below and copy it.') }); }
        }}>{t('Copy as text')}</Button>
        <Popconfirm title={t('Replace everything with the defaults?')} okText={t('Reset')} cancelText={t('Cancel')} onConfirm={() => { setStore(() => structuredClone(defaultStore)); setMsg({ type: 'success', text: t('Reset.') }); }}>
          <Button danger>{t('Reset to defaults')}</Button>
        </Popconfirm>
      </Space>
      <Input.TextArea style={{ marginTop: 12 }} rows={3} value={text} placeholder={t('Or paste saved text here')} onChange={(e) => setText(e.target.value)} />
      <Button style={{ marginTop: 8 }} disabled={!text.trim()} onClick={() => load(text)}>{t('Load pasted text')}</Button>
      {msg && <Alert style={{ marginTop: 12 }} type={msg.type} message={msg.text} showIcon closable onClose={() => setMsg(null)} />}
    </Card>
  );
}
