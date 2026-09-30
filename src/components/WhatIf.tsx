import { ExperimentOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Flex, Space, Typography } from 'antd';
import { useApp } from '../context';
import { t, tl } from '../i18n';
import { Num } from './common';

/** Try a different sale price without changing the saved one. */
export function WhatIf() {
  const { baseSettings, whatIf, setWhatIf, whatIfOn, setState } = useApp();
  return (
    <Card size="small" className="whatif">
      <Flex wrap gap={12} align="center">
        <Space><ExperimentOutlined /><Typography.Text strong>{t('Test prices')}</Typography.Text></Space>
        {baseSettings.products.map((p) => (
          <Space key={p.id} size={4}>
            <Typography.Text>{p.name}</Typography.Text>
            <Num id={`wi-${p.id}`} label={t('Test price for {p}', { p: p.name })} value={whatIf.prices[p.id]} placeholder={tl(p.price)} min={0} step={5} suffix="TL" width={130}
              onChange={(v) => setWhatIf({ prices: { ...whatIf.prices, [p.id]: v } })}
              onClear={() => setWhatIf({ prices: { ...whatIf.prices, [p.id]: undefined } })} />
          </Space>
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
