import { CheckCircleOutlined, TagsOutlined, WarningOutlined } from '@ant-design/icons';
import { App as AntApp, Badge, Button, Col, ConfigProvider, Drawer, Flex, Grid, Layout, Row, Segmented, Tabs, Tag, theme, Typography } from 'antd';
import enUS from 'antd/locale/en_US';
import trTR from 'antd/locale/tr_TR';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CampaignSidebar } from './components/CampaignSidebar';
import { Ideas } from './components/Ideas';
import { Lab } from './components/Lab';
import { OrderView } from './components/OrderView';
import { ProductsCosts } from './components/ProductsCosts';
import { Results } from './components/Results';
import { WhatIf } from './components/WhatIf';
import { Ctx, type AppCtx, type WhatIf as WhatIfState } from './context';
import { calcOrder } from './engine';
import { setLang, t } from './i18n';
import { campaignLabel } from './labels';
import { useAppState, useUiPrefs } from './store';
import type { Campaign, Cart } from './types';

type TabId = 'results' | 'order' | 'lab' | 'ideas' | 'costs';
const WITH_CAMPAIGNS: TabId[] = ['results', 'order', 'lab'];

function useDarkMode() {
  const q = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-color-scheme: dark)') : undefined;
  const [dark, setDark] = useState(!!q?.matches);
  useEffect(() => {
    if (!q) return;
    const f = (e: MediaQueryListEvent) => setDark(e.matches);
    q.addEventListener('change', f);
    return () => q.removeEventListener('change', f);
  }, [q]);
  return dark;
}

export function App() {
  const [state, setState, saveStatus] = useAppState();
  const [ui, setUi] = useUiPrefs();
  const [whatIf, setWhatIf] = useState<WhatIfState>({ prices: {} });
  const [tab, setTab] = useState<TabId>(() => (['results', 'order', 'lab', 'ideas', 'costs'].includes(location.hash.slice(1)) ? location.hash.slice(1) as TabId : 'results'));
  const [drawer, setDrawer] = useState(false);
  const screens = Grid.useBreakpoint();
  const dark = useDarkMode();
  setLang(ui.lang);
  const { token } = theme.useToken();

  useEffect(() => { try { history.replaceState(null, '', `#${tab}`); } catch { /* ignore */ } }, [tab]);
  useEffect(() => { document.documentElement.lang = ui.lang; }, [ui.lang]);

  const whatIfOn = Object.values(whatIf.prices).some((v) => v !== undefined);
  const settings = useMemo(() => (whatIfOn
    ? { ...state.settings, products: state.settings.products.map((p) => ({ ...p, price: whatIf.prices[p.id] ?? p.price })) }
    : state.settings), [state.settings, whatIf, whatIfOn]);
  const calc = useCallback((cart: Cart) => calcOrder(settings, cart, state.campaigns, state.stack), [settings, state.campaigns, state.stack]);
  const calcBase = useCallback((cart: Cart) => calcOrder(state.settings, cart, state.campaigns, state.stack), [state.settings, state.campaigns, state.stack]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const label = useCallback((c: Campaign) => campaignLabel(c, state.settings.products), [state.settings.products, ui.lang]);

  const ctx: AppCtx = { state, setState, ui, setUi, settings, baseSettings: state.settings, whatIf, setWhatIf, whatIfOn, calc, calcBase, label };
  const activeCount = state.campaigns.filter((c) => c.active).length;
  const showSide = WITH_CAMPAIGNS.includes(tab);
  const wide = !!screens.lg;

  const content = {
    results: <Results />, order: <OrderView />, lab: <Lab />, ideas: <Ideas />, costs: <ProductsCosts />,
  }[tab];

  return (
    <ConfigProvider locale={ui.lang === 'tr' ? trTR : enUS} theme={{ algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
      <AntApp>
        <Ctx.Provider value={ctx}>
          <Layout className="layout">
            <Layout.Header className="header" style={{ background: dark ? '#141414' : token.colorBgContainer, borderBottom: `1px solid ${dark ? '#303030' : token.colorBorderSecondary}` }}>
              <Flex justify="space-between" align="center" wrap gap={8} style={{ width: '100%' }}>
                <Typography.Title level={4} style={{ margin: 0 }}>{t('Revenue calculator')}</Typography.Title>
                <Flex gap={8} align="center">
                  {saveStatus === 'saved'
                    ? <Tag icon={<CheckCircleOutlined />} color="success">{t('Saved in this browser')}</Tag>
                    : <Tag icon={<WarningOutlined />} color="warning">{t('This browser is not saving. Export a file to keep your data.')}</Tag>}
                  <Segmented size="small" value={ui.lang} onChange={(v) => setUi((u) => ({ ...u, lang: v as 'en' | 'tr' }))} options={[{ value: 'tr', label: 'TR' }, { value: 'en', label: 'EN' }]} />
                </Flex>
              </Flex>
            </Layout.Header>
            <Layout.Content className="content">
              <Tabs activeKey={tab} onChange={(k) => setTab(k as TabId)}
                tabBarExtraContent={showSide && (!wide || !ui.sidebar) ? (
                  <Badge count={activeCount} size="small"><Button icon={<TagsOutlined />} onClick={() => (wide ? setUi((u) => ({ ...u, sidebar: true })) : setDrawer(true))}>{t('Campaigns')}</Button></Badge>
                ) : wide && showSide ? <Button type="link" onClick={() => setUi((u) => ({ ...u, sidebar: false }))}>{t('Hide campaigns')}</Button> : null}
                items={[
                  { key: 'results', label: t('Results') },
                  { key: 'order', label: t('Order calculator') },
                  { key: 'lab', label: t('Campaign lab') },
                  { key: 'ideas', label: t('Ideas') },
                  { key: 'costs', label: t('Products & costs') },
                ]} />
              {showSide && <div style={{ marginBottom: 12 }}><WhatIf /></div>}
              {showSide && wide && ui.sidebar ? (
                <Row gutter={12} wrap={false}>
                  <Col flex="360px" className="side-col"><CampaignSidebar /></Col>
                  <Col flex="auto" style={{ minWidth: 0 }}>{content}</Col>
                </Row>
              ) : content}
              <Drawer title={t('Campaigns')} open={drawer && !wide} onClose={() => setDrawer(false)} width={Math.min(420, window.innerWidth)} styles={{ body: { padding: 12 } }}>
                <CampaignSidebar />
              </Drawer>
            </Layout.Content>
          </Layout>
        </Ctx.Provider>
      </AntApp>
    </ConfigProvider>
  );
}
