import { ExperimentOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Flex, Select, Space, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useApp } from '../context';
import { t, tl } from '../i18n';
import { Num } from './common';

/** Try a different sale price without changing the saved one. */
export function WhatIf() {
  const { baseSettings, whatIf, setWhatIf, whatIfOn, setState } = useApp();
  const ps = baseSettings.products;
  const [pid, setPid] = useState<string | undefined>(ps[0]?.id);
  const product = ps.find((p) => p.id === pid) ?? ps[0];
  const tests = ps.filter((p) => whatIf.prices[p.id] !== undefined);
  const setPrice = (id: string, v: number | undefined) => setWhatIf({ prices: { ...whatIf.prices, [id]: v } });
  if (!product) return null;
  return (
    <Card size="small" className="whatif">
      <Flex wrap gap={12} align="center">
        <Space><ExperimentOutlined /><Typography.Text strong>{t('Test prices')}</Typography.Text></Space>
        {ps.length > 1 && (
          <Select size="small" value={product.id} onChange={setPid} style={{ width: 220 }} showSearch optionFilterProp="label"
            options={ps.map((p) => ({ value: p.id, label: p.name }))} aria-label={t('Product')} />
        )}
        <Num id="wi-price" label={t('Test price for {p}', { p: product.name })} value={whatIf.prices[product.id]} placeholder={tl(product.price)} min={0} step={5} suffix="TL" width={130}
          onChange={(v) => setPrice(product.id, v)} onClear={() => setPrice(product.id, undefined)} />
        {tests.map((p) => (
          <Tag key={p.id} closable onClose={() => setPrice(p.id, undefined)} color="blue">{p.name}: {tl(p.price)} → {tl(whatIf.prices[p.id]!)}</Tag>
        ))}
        {whatIfOn && (
          <Space>
            <Button size="small" onClick={() => {
              setState((s) => ({ ...s, settings: { ...s.settings, products: s.settings.products.map((p) => ({ ...p, price: whatIf.prices[p.id] ?? p.price })) } }));
              setWhatIf({ prices: {} });
            }}>{t('Keep these prices')}</Button>
            <Button size="small" type="link" onClick={() => setWhatIf({ prices: {} })}>{t('Reset')}</Button>
          </Space>
        )}
      </Flex>
      {whatIfOn && <Alert style={{ marginTop: 8 }} type="info" showIcon message={t('Showing results with test prices. The small figures show the change from your saved prices.')} />}
    </Card>
  );
}
