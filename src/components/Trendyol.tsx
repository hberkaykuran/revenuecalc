import { DeleteOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { Alert, Button, Empty, Flex, Popconfirm, Radio, Segmented, Space, Table, Tag, Tooltip, Typography, Upload } from 'antd';
import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../context';
import { saveFile } from '../download';
import { pct, pctOf, t, tl, uid } from '../i18n';
import { toView } from '../store';
import { evaluateOptions, parseTariff, type OptionResult } from '../tariff';
import type { Store, TariffOffer, TariffSnapshot } from '../types';
import { Num, Section } from './common';

const TRENDYOL = 'trendyol';

/** Put an imported tariff into the store: products, Trendyol prices and bands, and the history. */
export function applyTariff(s: Store, period: string, offers: TariffOffer[]): { store: Store; added: number } {
  const products = [...s.products];
  let added = 0;
  const idFor = (o: TariffOffer) => {
    const hit = products.find((p) => p.barcode && p.barcode === o.barcode);
    if (hit) return hit.id;
    const id = uid();
    products.push({ id, name: o.name, barcode: o.barcode, cost: 0, vatRate: 20, sizeUnits: 1, price: o.listPrice });
    added++;
    return id;
  };
  const ids = offers.map(idFor);
  const channels = s.channels.map((c) => {
    if (c.id !== TRENDYOL) return c;
    const prices = { ...c.prices }, bands = { ...c.bands };
    offers.forEach((o, i) => { prices[ids[i]] = o.customerPrice; bands[ids[i]] = o.bands; });
    return { ...c, prices, bands };
  });
  const snap: TariffSnapshot = { period, importedAt: new Date().toISOString(), offers };
  const history = [...s.tariffHistory.filter((h) => h.period !== period), snap];
  return { store: { ...s, products, channels, tariffHistory: history }, added };
}

type FileState = { name: string; wb: XLSX.WorkBook; sheet: string; newPriceColumn: number; barcodeColumn: number; headerRow: number };

export function Trendyol() {
  const { store, setStore } = useApp();
  const [file, setFile] = useState<FileState | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [qty, setQty] = useState(1);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const latest = store.tariffHistory[store.tariffHistory.length - 1];
  const settings = useMemo(() => toView({ ...store, channelId: TRENDYOL }).settings, [store]);

  const importFile = async (f: File) => {
    try {
      const wb = XLSX.read(await f.arrayBuffer());
      const sheet = wb.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheet], { header: 1, raw: true, defval: null });
      const parsed = parseTariff(rows);
      const { store: next, added } = applyTariff(store, parsed.period || f.name, parsed.offers);
      setStore(() => next);
      setFile({ name: f.name, wb, sheet, newPriceColumn: parsed.newPriceColumn, barcodeColumn: parsed.barcodeColumn, headerRow: parsed.headerRow });
      setChoice({});
      setMsg({ type: 'success', text: t('Imported {n} products for {period}.', { n: parsed.offers.length, period: parsed.period }) + (added ? ' ' + t('{n} new products were added. Enter their cost below.', { n: added }) : '') });
    } catch {
      setMsg({ type: 'error', text: t('This is not a Trendyol commission tariff file. Download it from Trendyol (Komisyon Tarifeleri) and import the .xlsx as it is.') });
    }
  };

  const rows = useMemo(() => {
    if (!latest) return [];
    return latest.offers.map((o) => {
      const p = settings.products.find((x) => x.barcode === o.barcode);
      const opts = p ? evaluateOptions(settings, p.id, o, qty) : [];
      const best = opts.reduce<OptionResult | null>((b, x) => (!b || x.profit > b.profit ? x : b), null);
      return { key: o.barcode, o, p, opts, best, now: opts.find((x) => x.current) };
    });
  }, [latest, settings, qty]);

  const setCost = (id: string, cost: number) => setStore((s) => ({ ...s, products: s.products.map((p) => (p.id === id ? { ...p, cost } : p)) }));
  const chosen = (r: (typeof rows)[number]) => r.opts.find((x) => x.key === (choice[r.key] ?? (r.now?.key ?? ''))) ?? r.now;
  const withCost = rows.filter((r) => r.p && r.p.cost > 0);
  const avg = (f: (r: (typeof rows)[number]) => number | undefined) => {
    const v = withCost.map(f).filter((x): x is number => x !== undefined);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
  };
  const maxBands = Math.max(0, ...rows.map((r) => r.opts.filter((x) => x.bandIndex >= 0).length));

  const applyPrices = () => {
    setStore((s) => ({
      ...s, channels: s.channels.map((c) => {
        if (c.id !== TRENDYOL) return c;
        const prices = { ...c.prices };
        for (const r of rows) { const ch = chosen(r); if (r.p && ch) prices[r.p.id] = ch.price; }
        return { ...c, prices };
      }),
    }));
    setMsg({ type: 'success', text: t('Trendyol prices updated. Switch to Trendyol at the top to see results with them.') });
  };

  const exportFile = async () => {
    if (!file) return;
    const ws = file.wb.Sheets[file.sheet];
    const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
    const byBarcode = new Map(rows.map((r) => [r.key, { ch: chosen(r), list: r.o.listPrice }]));
    for (let R = file.headerRow + 1; R <= range.e.r; R++) {
      const bc = ws[XLSX.utils.encode_cell({ r: R, c: file.barcodeColumn })]?.v;
      const hit = bc !== undefined ? byBarcode.get(String(bc).trim()) : undefined;
      const addr = XLSX.utils.encode_cell({ r: R, c: file.newPriceColumn });
      // only real changes: a price equal to today's list price would change nothing
      if (hit?.ch && !hit.ch.current && Math.abs(hit.ch.price - hit.list) > 0.005) ws[addr] = { t: 'n', v: hit.ch.price };
    }
    const out = XLSX.write(file.wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    const res = await saveFile(file.name.replace(/\.xlsx$/i, '') + '-yeni-fiyat.xlsx', new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    setMsg(res === 'saved' ? { type: 'success', text: t('Saved. Check the new prices, pick the tariff in Trendyol, then upload the file there.') } : { type: 'error', text: t('The download was not saved.') });
  };

  const optCell = (r: (typeof rows)[number], o: OptionResult | undefined) => {
    if (!o) return '—';
    const isBest = r.best && o.key === r.best.key;
    return (
      <Radio checked={chosen(r)?.key === o.key} onChange={() => setChoice({ ...choice, [r.key]: o.key })} style={{ alignItems: 'flex-start' }}>
        <Flex vertical>
          <Space size={4}><Typography.Text strong type={o.margin < 0 ? 'danger' : undefined}>{pct(o.margin)}</Typography.Text>{isBest && <Tag color="green">{t('best')}</Tag>}</Space>
          {!o.current && r.o.promo && o.price > r.o.customerPrice + 0.005 && (
            <Tooltip title={t('The customer sees a promotion price now. This price only applies if you leave the promotion.')}><Tag color="orange" style={{ width: 'fit-content' }}>{t('without promotion')}</Tag></Tooltip>
          )}
          <Typography.Text className="tiny">{tl(o.price)} TL · {t('commission')} {pctOf(o.rate, 1)}</Typography.Text>
          <Typography.Text className="tiny" type="secondary">{t('profit')} {tl(o.profit)}</Typography.Text>
        </Flex>
      </Radio>
    );
  };

  return (
    <Flex vertical gap={12}>
      <Section id="ty-import" title={t('Commission tariff')}
        sub={t('Import the weekly "Komisyon Tarifeleri" file from Trendyol. For each product you see your margin at today\'s price and at the top price of each commission band, using the Trendyol costs in Products & costs.')}
        extra={<Upload accept=".xlsx" showUploadList={false} beforeUpload={(f) => { importFile(f); return false; }}><Button type="primary" icon={<UploadOutlined />}>{t('Import tariff file')}</Button></Upload>}>
        {msg && <Alert type={msg.type} showIcon closable onClose={() => setMsg(null)} message={msg.text} style={{ marginBottom: 12 }} />}
        {!latest ? <Empty description={t('No tariff imported yet.')} /> : (
          <>
            <Flex wrap gap={16} align="center" style={{ marginBottom: 12 }}>
              <Typography.Text><b>{latest.period}</b> · {t('{n} products', { n: latest.offers.length })}</Typography.Text>
              <Space>{t('Order of')}<Segmented size="small" value={qty} onChange={(v) => setQty(v as number)} options={[1, 2, 3, 4, 6].map((q) => ({ value: q, label: `${q} ${t('pcs')}` }))} /></Space>
              {withCost.length > 0 && (
                <Typography.Text>{t('Average margin')}: {t('today')} <b>{pct(avg((r) => r.now?.margin))}</b> → {t('chosen')} <b>{pct(avg((r) => chosen(r)?.margin))}</b> · {t('best')} <b>{pct(avg((r) => r.best?.margin))}</b></Typography.Text>
              )}
              <Button size="small" onClick={() => setChoice(Object.fromEntries(rows.filter((r) => r.best).map((r) => [r.key, r.best!.key])))}>{t('Choose the best for all')}</Button>
            </Flex>
            {rows.some((r) => r.p && !r.p.cost) && <Alert type="warning" showIcon style={{ marginBottom: 12 }} message={t('Some products have no cost yet, so their margin is too high. Enter the cost in the table.')} />}
            <Table size="small" bordered pagination={false} scroll={{ x: 'max-content', y: 600 }} dataSource={rows}
              columns={[
                { key: 'n', title: t('Product'), fixed: 'left', width: 240, render: (_, r) => (
                  <Flex vertical><Typography.Text ellipsis={{ tooltip: r.o.name }} style={{ maxWidth: 230 }}>{r.o.name}</Typography.Text>
                    <Typography.Text type="secondary" className="tiny">{r.o.barcode}{r.o.promo ? ` · ${r.o.promo}` : ''}</Typography.Text></Flex>
                ) },
                { key: 'c', title: t('Cost'), width: 120, render: (_, r) => r.p ? <Num id={`ty-cost-${r.key}`} value={r.p.cost} min={0} step={5} suffix="TL" width={110} onChange={(v) => setCost(r.p!.id, v)} /> : '—' },
                { key: 'now', title: t('Today'), width: 170, render: (_, r) => optCell(r, r.now) },
                ...Array.from({ length: maxBands }, (_, i) => ({
                  key: `b${i}`, title: <Tooltip title={t('The highest price that still gets this band\'s commission.')}><span className="dotted">{t('Band {n}', { n: i + 1 })}</span></Tooltip>, width: 170,
                  render: (_: unknown, r: (typeof rows)[number]) => optCell(r, r.opts.find((x) => x.bandIndex === i && !x.current)),
                })),
              ]} />
            <Space style={{ marginTop: 12 }} wrap>
              <Button onClick={applyPrices}>{t('Use the chosen prices for Trendyol')}</Button>
              <Tooltip title={file ? '' : t('Import the file again in this session to export it.')}>
                <Button icon={<DownloadOutlined />} disabled={!file} onClick={exportFile}>{t('Export tariff file with new prices')}</Button>
              </Tooltip>
            </Space>
            <Typography.Paragraph type="secondary" className="tiny" style={{ marginTop: 8 }}>
              {t('The export fills the "YENİ TSF" column for products where you picked a new price, and leaves the rest of the file as it was. Choose the tariff in Trendyol as usual.')}
            </Typography.Paragraph>
          </>
        )}
      </Section>
      <History />
    </Flex>
  );
}

/** What past tariffs say about how Trendyol sets the bands. */
function History() {
  const { store, setStore } = useApp();
  const h = store.tariffHistory;
  if (!h.length) return null;
  const ratios = h[h.length - 1].offers.map((o) => ({ o, top: (o.bands[0]?.min ?? NaN) / o.listPrice, bottom: (o.bands[o.bands.length - 1]?.max ?? NaN) / o.listPrice })).filter((x) => Number.isFinite(x.top));
  const avgTop = ratios.reduce((a, x) => a + x.top, 0) / (ratios.length || 1);
  const pairs: { name: string; from: string; to: string; price: number; floor: number }[] = [];
  for (let i = 1; i < h.length; i++) {
    for (const o of h[i].offers) {
      const prev = h[i - 1].offers.find((x) => x.barcode === o.barcode);
      if (!prev || !prev.bands[0]?.min || !o.bands[0]?.min) continue;
      pairs.push({ name: o.name, from: h[i - 1].period, to: h[i].period, price: o.customerPrice / prev.customerPrice - 1, floor: o.bands[0].min / prev.bands[0].min - 1 });
    }
  }
  const moved = pairs.filter((p) => Math.abs(p.price) > 0.01);
  const followed = moved.filter((p) => Math.sign(p.floor) === Math.sign(p.price) && Math.abs(p.floor) > 0.005);
  return (
    <Section id="ty-history" title={t('Tariff history')}
      sub={t('Every file you import is kept here. With a few weeks of files you can see how the band limits move when your price changes.')}>
      <Flex vertical gap={8}>
        <Alert type="info" showIcon message={t('In the latest file, the highest-commission band starts on average at {p} of your list price (from {lo} to {hi}). Below that price the commission drops.', {
          p: pct(avgTop), lo: pct(Math.min(...ratios.map((x) => x.top))), hi: pct(Math.max(...ratios.map((x) => x.top))),
        })} />
        {h.length < 2 ? (
          <Alert type="warning" showIcon message={t('Import next week\'s file too. With two or more weeks this shows whether the band limits follow your price.')} />
        ) : moved.length === 0 ? (
          <Alert type="warning" showIcon message={t('Your prices did not change between these files, so there is nothing to compare yet.')} />
        ) : (
          <Alert type={followed.length / moved.length > 0.6 ? 'warning' : 'success'} showIcon message={t('When your price changed, the band limits moved the same way in {a} of {b} cases.', { a: followed.length, b: moved.length })}
            description={followed.length / moved.length > 0.6 ? t('The limits seem to follow your own price, so a price cut can lower next week\'s limits too.') : t('The limits do not seem to follow your own price closely.')} />
        )}
        <Table size="small" rowKey={(r) => r.period} pagination={false} dataSource={[...h].reverse()}
          columns={[
            { key: 'p', title: t('Week'), dataIndex: 'period' },
            { key: 'n', title: t('Products'), render: (_, r) => r.offers.length },
            { key: 'r', title: t('Highest band starts at'), render: (_, r) => {
              const v = r.offers.map((o) => (o.bands[0]?.min ?? NaN) / o.listPrice).filter(Number.isFinite);
              return v.length ? t('{p} of list price', { p: pct(v.reduce((a, b) => a + b, 0) / v.length) }) : '—';
            } },
            { key: 'x', title: '', width: 50, render: (_, r) => (
              <Popconfirm title={t('Remove this week?')} okText={t('Remove')} cancelText={t('Cancel')} onConfirm={() => setStore((s) => ({ ...s, tariffHistory: s.tariffHistory.filter((x) => x.period !== r.period) }))}>
                <Button type="text" danger size="small" icon={<DeleteOutlined />} aria-label={t('Remove')} />
              </Popconfirm>
            ) },
          ]} />
      </Flex>
    </Section>
  );
}
