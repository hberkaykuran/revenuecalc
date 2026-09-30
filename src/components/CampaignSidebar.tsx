import { CopyOutlined, DeleteOutlined, EditOutlined, MenuUnfoldOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Checkbox, Collapse, Empty, Flex, Input, List, Popconfirm, Space, Switch, Table, Tag, Tooltip, Typography } from 'antd';
import { useState } from 'react';
import { useApp } from '../context';
import { defaultMechanic, defaultStacks, isCart, pairKey, stacks } from '../engine';
import { t, uid } from '../i18n';
import { TYPE_LABELS } from '../labels';
import type { Campaign, Mechanic } from '../types';
import { MechanicEditor } from './MechanicEditor';

export function CampaignSidebar({ onHide }: { onHide?: () => void }) {
  const { state, setState, label } = useApp();
  const products = state.settings.products;
  const [draft, setDraft] = useState<{ mechanic: Mechanic; productIds: string[] } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const active = state.campaigns.filter((c) => c.active);
  const update = (id: string, patch: Partial<Campaign>) =>
    setState((s) => ({ ...s, campaigns: s.campaigns.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));

  return (
    <Flex vertical gap={12}>
      <Card size="small" title={<>{t('Campaigns')} <Tag color={active.length ? 'blue' : undefined}>{t('{n} on', { n: active.length })}</Tag></>}
        extra={
          <Space size={4}>
            {!draft && <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setDraft({ mechanic: defaultMechanic('percentOff'), productIds: [] })}>{t('Add')}</Button>}
            {onHide && <Tooltip title={t('Hide campaigns')}><Button type="text" size="small" icon={<MenuUnfoldOutlined />} aria-label={t('Hide campaigns')} onClick={onHide} /></Tooltip>}
          </Space>
        }>
        {draft && (
          <Card size="small" type="inner" title={t('New campaign')} style={{ marginBottom: 12 }}>
            <MechanicEditor idPrefix="draft" mechanic={draft.mechanic} productIds={draft.productIds} products={products}
              onChange={(mechanic, productIds) => setDraft({ mechanic, productIds })} />
            <Space style={{ marginTop: 12 }}>
              <Button type="primary" onClick={() => {
                setState((s) => ({ ...s, campaigns: [{ id: uid(), name: '', active: true, ...draft }, ...s.campaigns] }));
                setDraft(null);
              }}>{t('Add and turn on')}</Button>
              <Button onClick={() => setDraft(null)}>{t('Cancel')}</Button>
            </Space>
          </Card>
        )}
        {state.campaigns.length === 0 && !draft && <Empty description={t('No campaigns yet. Add one to see its effect on every result.')} />}
        <List size="small" dataSource={state.campaigns} split
          renderItem={(c) => (
            <List.Item style={{ display: 'block', paddingInline: 0 }}>
              <Flex align="center" gap={8}>
                <Switch size="small" checked={c.active} aria-label={t('Turn on {name}', { name: label(c) })} onChange={(v) => update(c.id, { active: v })} />
                <Flex vertical style={{ flex: 1, minWidth: 0 }}>
                  <Typography.Text ellipsis={{ tooltip: label(c) }} strong={c.active}>{label(c)}</Typography.Text>
                  <Typography.Text type="secondary" className="tiny">{t(TYPE_LABELS[c.mechanic.type])}{isCart(c.mechanic) ? ` · ${t('cart')}` : ''}</Typography.Text>
                </Flex>
                <Tooltip title={t('Edit')}><Button type="text" size="small" icon={<EditOutlined />} aria-expanded={open === c.id} onClick={() => setOpen(open === c.id ? null : c.id)} /></Tooltip>
                <Tooltip title={t('Duplicate')}><Button type="text" size="small" icon={<CopyOutlined />} onClick={() => setState((s) => ({ ...s, campaigns: [...s.campaigns, { ...c, id: uid(), active: false }] }))} /></Tooltip>
                <Popconfirm title={t('Delete this campaign?')} okText={t('Delete')} cancelText={t('Cancel')} onConfirm={() => setState((s) => ({ ...s, campaigns: s.campaigns.filter((x) => x.id !== c.id) }))}>
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label={t('Delete')} />
                </Popconfirm>
              </Flex>
              {open === c.id && (
                <div style={{ marginTop: 10 }}>
                  <Input id={`name-${c.id}`} addonBefore={t('Name')} placeholder={label({ ...c, name: '' })} value={c.name} onChange={(e) => update(c.id, { name: e.target.value })} style={{ marginBottom: 10 }} />
                  <MechanicEditor idPrefix={c.id} mechanic={c.mechanic} productIds={c.productIds} products={products}
                    onChange={(mechanic, productIds) => update(c.id, { mechanic, productIds })} />
                </div>
              )}
            </List.Item>
          )} />
      </Card>
      <Scenarios />
      <Combinations active={active} />
    </Flex>
  );
}

function Combinations({ active }: { active: Campaign[] }) {
  const { state, setState, label } = useApp();
  const toggle = (a: Campaign, b: Campaign) => {
    const key = pairKey(a.id, b.id);
    const now = stacks(state.stack, a, b);
    setState((s) => {
      const next = { ...s.stack };
      if (!now === defaultStacks(a, b)) delete next[key]; else next[key] = !now;
      return { ...s, stack: next };
    });
  };
  return (
    <Card size="small" title={t('Combinations')}
      extra={Object.keys(state.stack).length > 0 && <Button size="small" type="link" onClick={() => setState((s) => ({ ...s, stack: {} }))}>{t('Reset')}</Button>}>
      {active.length < 2 ? (
        <Typography.Text type="secondary">{t('Turn on two or more campaigns to choose which ones stack.')}</Typography.Text>
      ) : (
        <Collapse size="small" ghost defaultActiveKey={['m']} items={[{
          key: 'm', label: t('Which campaigns stack'), children: (
            <>
              <Typography.Paragraph type="secondary" className="tiny">{t('Tick a pair to let them apply to the same order. When campaigns clash, the customer gets the combination that saves them the most.')}</Typography.Paragraph>
              <Table size="small" pagination={false} rowKey="id" scroll={{ x: true }} dataSource={active}
                columns={[
                  { key: 'n', title: '', render: (_, c, i) => <Tooltip title={label(c)}><Tag>{i + 1}</Tag></Tooltip>, width: 40 },
                  ...active.map((b, j) => ({
                    key: b.id, title: <Tooltip title={label(b)}>{j + 1}</Tooltip>, align: 'center' as const,
                    render: (_: unknown, a: Campaign) => a.id === b.id ? '·' : (
                      <Checkbox checked={stacks(state.stack, a, b)} aria-label={`${label(a)} + ${label(b)}`} onChange={() => toggle(a, b)} />
                    ),
                  })),
                ]} />
              <ol className="legend">
                {active.map((c) => {
                  const no = active.filter((o) => o.id !== c.id && !stacks(state.stack, c, o)).map((o) => active.indexOf(o) + 1);
                  return <li key={c.id}>{label(c)}{no.length > 0 && <Typography.Text type="secondary"> · {t('not with')} {no.join(', ')}</Typography.Text>}</li>;
                })}
              </ol>
            </>
          ),
        }]} />
      )}
    </Card>
  );
}

function Scenarios() {
  const { state, setState } = useApp();
  const [name, setName] = useState('');
  const active = state.campaigns.filter((c) => c.active);
  const save = () => {
    if (!active.length) return;
    const n = name.trim() || t('Scenario {n}', { n: state.scenarios.length + 1 });
    setState((s) => ({ ...s, scenarios: [...s.scenarios, { id: uid(), name: n, campaigns: s.campaigns.filter((c) => c.active), stack: { ...s.stack } }] }));
    setName('');
  };
  return (
    <Card size="small" title={t('Saved scenarios')}>
      <Space.Compact style={{ width: '100%' }}>
        <Input id="scenario-name" placeholder={t('Name for the campaigns that are on')} value={name} onChange={(e) => setName(e.target.value)} onPressEnter={save} />
        <Button type="primary" disabled={!active.length} onClick={save}>{t('Save')}</Button>
      </Space.Compact>
      <List size="small" dataSource={state.scenarios} locale={{ emptyText: t('Save the campaigns that are on as a combination, then compare combinations in the Compare tab.') }}
        renderItem={(sc) => (
          <List.Item actions={[
            <Button key="l" size="small" type="link" onClick={() => setState((s) => {
              const ids = new Set(sc.campaigns.map((c) => c.id));
              const kept = s.campaigns.filter((c) => !ids.has(c.id)).map((c) => ({ ...c, active: false }));
              return { ...s, campaigns: [...sc.campaigns.map((c) => ({ ...c, active: true })), ...kept], stack: { ...s.stack, ...sc.stack } };
            })}>{t('Load')}</Button>,
            <Button key="d" size="small" type="text" danger icon={<DeleteOutlined />} aria-label={t('Delete')} onClick={() => setState((s) => ({ ...s, scenarios: s.scenarios.filter((x) => x.id !== sc.id) }))} />,
          ]}>
            {sc.name} <Typography.Text type="secondary">· {t('{n} campaigns', { n: sc.campaigns.length })}</Typography.Text>
          </List.Item>
        )} />
    </Card>
  );
}
