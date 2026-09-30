import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Flex, Select, Space, Tag, Typography } from 'antd';
import { CART_MECHANICS, defaultMechanic, hasScope, PARAMS, PRODUCT_MECHANICS } from '../engine';
import { t } from '../i18n';
import { mechanicLabel, TYPE_LABELS } from '../labels';
import { presets } from '../presets';
import type { Mechanic, MechanicType, Product } from '../types';
import { Num } from './common';

type Props = {
  idPrefix: string;
  mechanic: Mechanic;
  productIds: string[];
  products: Product[];
  onChange: (m: Mechanic, productIds: string[]) => void;
};

const same = (a: Mechanic, b: Mechanic) => JSON.stringify(a) === JSON.stringify(b);
const unit = (u: string) => (u === 'pcs' ? t('pcs') : u);

/** Choose a campaign type, pick a preset, then adjust the numbers. */
export function MechanicEditor({ idPrefix, mechanic: m, productIds, products, onChange }: Props) {
  const scoped = products.filter((p) => !productIds.length || productIds.includes(p.id));
  const refPrice = scoped[0]?.price ?? products[0]?.price ?? 100;
  const set = (next: Mechanic) => onChange(next, productIds);
  const setType = (type: MechanicType) => onChange(defaultMechanic(type, refPrice), hasScope(type) ? productIds : []);
  const label = (s: string) => <Typography.Text type="secondary" className="mini-label">{s}</Typography.Text>;

  return (
    <Flex vertical gap={10}>
      <div>
        {label(t('Type'))}
        <Select id={`${idPrefix}-type`} value={m.type} onChange={setType} style={{ width: '100%' }}
          options={[
            { label: t('Product campaigns'), options: PRODUCT_MECHANICS.map((x) => ({ value: x, label: t(TYPE_LABELS[x]) })) },
            { label: t('Cart campaigns'), options: CART_MECHANICS.map((x) => ({ value: x, label: t(TYPE_LABELS[x]) })) },
          ]} />
      </div>
      <div>
        {label(t('Presets'))}
        <Flex wrap gap={4}>
          {presets(m.type, refPrice).map((p, i) => (
            <Tag.CheckableTag key={i} checked={same(p, m)} onChange={() => set(p)}>{mechanicLabel(p)}</Tag.CheckableTag>
          ))}
        </Flex>
      </div>
      <div>
        {label(t('Custom'))}
        <Flex wrap gap={8}>
          {PARAMS[m.type].map((p) => (
            <Space key={p.key} direction="vertical" size={0}>
              <Typography.Text className="tiny">{t(p.label)}</Typography.Text>
              <Num id={`${idPrefix}-${p.key}`} value={(m as unknown as Record<string, number>)[p.key] ?? 0} min={p.min} step={p.step} suffix={unit(p.unit)} width={118}
                onChange={(v) => set({ ...m, [p.key]: v } as Mechanic)} />
            </Space>
          ))}
          {m.type === 'qtyTiers' && m.tiers.map((tier, i) => (
            <Space.Compact key={i}>
              <Num id={`${idPrefix}-q${i}`} label={t('From qty')} value={tier.minQty} min={1} suffix={`${t('pcs')}+`} width={100}
                onChange={(v) => set({ ...m, tiers: m.tiers.map((x, j) => (j === i ? { ...x, minQty: Math.floor(v) } : x)) })} />
              <Num id={`${idPrefix}-p${i}`} label={t('Discount')} value={tier.percent} min={0} suffix="%" width={88}
                onChange={(v) => set({ ...m, tiers: m.tiers.map((x, j) => (j === i ? { ...x, percent: v } : x)) })} />
              {m.tiers.length > 1 && <Button aria-label={t('Remove step')} icon={<DeleteOutlined />} onClick={() => set({ ...m, tiers: m.tiers.filter((_, j) => j !== i) })} />}
            </Space.Compact>
          ))}
          {m.type === 'cartTiers' && (
            <>
              <Select id={`${idPrefix}-mode`} value={m.mode} onChange={(mode) => set({ ...m, mode })} style={{ width: 110 }}
                options={[{ value: 'amount', label: t('TL off') }, { value: 'percent', label: t('% off') }]} />
              {m.tiers.map((tier, i) => (
                <Space.Compact key={i}>
                  <Num id={`${idPrefix}-a${i}`} label={t('Cart over')} value={tier.minAmount} min={0} step={50} suffix="TL+" width={120}
                    onChange={(v) => set({ ...m, tiers: m.tiers.map((x, j) => (j === i ? { ...x, minAmount: v } : x)) })} />
                  <Num id={`${idPrefix}-v${i}`} label={t('Discount')} value={tier.value} min={0} suffix={m.mode === 'percent' ? '%' : 'TL'} width={96}
                    onChange={(v) => set({ ...m, tiers: m.tiers.map((x, j) => (j === i ? { ...x, value: v } : x)) })} />
                  {m.tiers.length > 1 && <Button aria-label={t('Remove step')} icon={<DeleteOutlined />} onClick={() => set({ ...m, tiers: m.tiers.filter((_, j) => j !== i) })} />}
                </Space.Compact>
              ))}
            </>
          )}
          {(m.type === 'qtyTiers' || m.type === 'cartTiers') && (
            <Button icon={<PlusOutlined />} onClick={() => {
              if (m.type === 'qtyTiers') { const l = m.tiers[m.tiers.length - 1]; set({ ...m, tiers: [...m.tiers, { minQty: (l?.minQty ?? 0) + 3, percent: (l?.percent ?? 0) + 5 }] }); }
              if (m.type === 'cartTiers') { const l = m.tiers[m.tiers.length - 1]; set({ ...m, tiers: [...m.tiers, { minAmount: (l?.minAmount ?? 0) + 500, value: (l?.value ?? 0) + (m.mode === 'percent' ? 5 : 50) }] }); }
            }}>{t('Add step')}</Button>
          )}
        </Flex>
      </div>
      {hasScope(m) && (
        <div>
          {label(t('Applies to'))}
          <Select id={`${idPrefix}-scope`} mode="multiple" allowClear value={productIds} placeholder={t('All products')} style={{ width: '100%' }}
            onChange={(ids: string[]) => onChange(m, ids.length === products.length ? [] : ids)}
            options={products.map((p) => ({ value: p.id, label: p.name }))} />
          <Typography.Text type="secondary" className="tiny">{m.type === 'mixBuyXPayY' ? t('Pieces of all selected products count together; the cheapest ones are free.') : t('Runs on each selected product separately.')}</Typography.Text>
        </div>
      )}
    </Flex>
  );
}
