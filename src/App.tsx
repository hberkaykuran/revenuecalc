import {
  AppstoreOutlined, BarChartOutlined, BulbOutlined, CalculatorOutlined, CalendarOutlined, CheckCircleOutlined, ExperimentOutlined,
  MenuFoldOutlined, ShoppingCartOutlined, SwapOutlined, TagsOutlined, WarningOutlined,
} from '@ant-design/icons';
import { App as AntApp, Badge, Button, ConfigProvider, Drawer, Flex, Grid, Layout, Menu, Segmented, Tag, theme, Tooltip, Typography } from 'antd';
import enUS from 'antd/locale/en_US';
import trTR from 'antd/locale/tr_TR';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CampaignSidebar } from './components/CampaignSidebar';
import { Compare } from './components/Compare';
import { Ideas } from './components/Ideas';
import { Lab } from './components/Lab';
import { Monthly } from './components/Monthly';
import { OrderView } from './components/OrderView';
import { ProductsCosts } from './components/ProductsCosts';
import { Results } from './components/Results';
import { WhatIf } from './components/WhatIf';
import { Ctx, type AppCtx, type WhatIf as WhatIfState } from './context';
import { calcOrder } from './engine';
import { setLang, t } from './i18n';
import { campaignLabel } from './labels';
import { fromView, toView, useStore, useUiPrefs } from './store';
import type { AppState, Campaign, Cart } from './types';

type TabId = 'results' | 'compare' | 'order' | 'monthly' | 'lab' | 'ideas' | 'costs';
const TABS: TabId[] = ['results', 'compare', 'order', 'monthly', 'lab', 'ideas', 'costs'];
const WITH_CAMPAIGNS: TabId[] = ['results', 'compare', 'order', 'monthly', 'lab'];

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
  const dark = useDarkMode();
  return (
    <ConfigProvider theme={{ algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
      <Shell dark={dark} />
    </ConfigProvider>
  );
}

function Shell({ dark }: { dark: boolean }) {
  const [store, setStore, saveStatus] = useStore();
  const state = useMemo(() => toView(store), [store]);
  const setState = useCallback((f: (s: AppState) => AppState) => setStore((st) => fromView(st, f(toView(st)))), [setStore]);
  const [ui, setUi] = useUiPrefs();
  const [whatIf, setWhatIf] = useState<WhatIfState>({ prices: {} });
  const [tab, setTab] = useState<TabId>(() => (TABS.includes(location.hash.slice(1) as TabId) ? location.hash.slice(1) as TabId : 'results'));
  const [drawer, setDrawer] = useState(false);
  const screens = Grid.useBreakpoint();
  const { token } = theme.useToken();
  setLang(ui.lang);

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
  const ctx: AppCtx = { store, setStore, state, setState, ui, setUi, settings, baseSettings: state.settings, whatIf, setWhatIf, whatIfOn, calc, calcBase, label };

  const activeCount = state.campaigns.filter((c) => c.active).length;
  const showSide = WITH_CAMPAIGNS.includes(tab);
  const wide = !!screens.lg;
  const navItems = [
    { key: 'results', icon: <BarChartOutlined />, label: t('Results') },
    { key: 'compare', icon: <SwapOutlined />, label: t('Compare') },
    { key: 'order', icon: <ShoppingCartOutlined />, label: t('Order calculator') },
    { key: 'monthly', icon: <CalendarOutlined />, label: t('Monthly') },
    { key: 'lab', icon: <ExperimentOutlined />, label: t('Campaign lab') },
    { key: 'ideas', icon: <BulbOutlined />, label: t('Ideas') },
    { key: 'costs', icon: <AppstoreOutlined />, label: t('Products & costs') },
  ];
  const content = { results: <Results />, compare: <Compare />, order: <OrderView />, monthly: <Monthly />, lab: <Lab />, ideas: <Ideas />, costs: <ProductsCosts /> }[tab];
  const title = navItems.find((n) => n.key === tab)?.label;
  const navCollapsed = wide ? !!ui.nav : true;

  return (
    <ConfigProvider locale={ui.lang === 'tr' ? trTR : enUS}>
      <AntApp>
        <Ctx.Provider value={ctx}>
          <Layout className="shell">
            <Layout.Sider theme="light" width={220} collapsedWidth={wide ? 64 : 0} collapsed={navCollapsed} trigger={null}
              style={{ borderRight: `1px solid ${token.colorBorderSecondary}` }} className="nav">
              <Flex vertical style={{ height: '100%' }}>
                <Flex align="center" gap={8} className="brand">
                  <CalculatorOutlined style={{ fontSize: 20, color: token.colorPrimary }} />
                  {!navCollapsed && <Typography.Text strong style={{ fontSize: 16 }}>{t('Revenue calculator')}</Typography.Text>}
                </Flex>
                <Menu mode="inline" selectedKeys={[tab]} items={navItems} onClick={(e) => { setTab(e.key as TabId); }} style={{ borderInlineEnd: 0, flex: 1 }} />
                <Flex vertical gap={8} className="nav-foot" align={navCollapsed ? 'center' : 'stretch'}>
                  {saveStatus === 'saved'
                    ? (navCollapsed ? <Tooltip title={t('Saved in this browser')} placement="right"><CheckCircleOutlined style={{ color: token.colorSuccess }} /></Tooltip> : <Tag icon={<CheckCircleOutlined />} color="success" style={{ margin: 0, whiteSpace: 'normal' }}>{t('Saved in this browser')}</Tag>)
                    : <Tooltip title={t('This browser is not saving. Export a file to keep your data.')} placement="right"><Tag icon={<WarningOutlined />} color="warning" style={{ margin: 0 }}>{navCollapsed ? '' : t('Not saving')}</Tag></Tooltip>}
                  <Segmented size="small" block={!navCollapsed} vertical={navCollapsed} value={ui.lang} onChange={(v) => setUi((u) => ({ ...u, lang: v as 'en' | 'tr' }))} options={[{ value: 'tr', label: 'TR' }, { value: 'en', label: 'EN' }]} />
                  {wide && (
                    <Button type="text" size="small" icon={<MenuFoldOutlined rotate={navCollapsed ? 180 : 0} />} onClick={() => setUi((u) => ({ ...u, nav: !u.nav }))} aria-label={navCollapsed ? t('Expand') : t('Collapse')}>
                      {navCollapsed ? '' : t('Collapse')}
                    </Button>
                  )}
                </Flex>
              </Flex>
            </Layout.Sider>

            <Layout style={{ minWidth: 0 }}>
              <div className="topbar" style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, background: token.colorBgContainer }}>
                {!wide && (
                  <Segmented size="small" value={tab} onChange={(v) => setTab(v as TabId)} options={navItems.map((n) => ({ value: n.key, icon: n.icon, title: n.label }))} />
                )}
                {wide && <Typography.Title level={5} style={{ margin: 0 }}>{title}</Typography.Title>}
                <Flex gap={8} align="center" style={{ marginLeft: 'auto' }}>
                  {showSide && (!wide || !ui.sidebar) && (
                    <Badge count={activeCount} size="small">
                      <Button icon={<TagsOutlined />} onClick={() => (wide ? setUi((u) => ({ ...u, sidebar: true })) : setDrawer(true))}>{t('Campaigns')}</Button>
                    </Badge>
                  )}
                </Flex>
              </div>
              <Layout.Content className="main">
                {showSide && <div style={{ marginBottom: 12 }}><WhatIf /></div>}
                {content}
              </Layout.Content>
            </Layout>

            {showSide && wide && ui.sidebar && (
              <Layout.Sider width={380} theme="light" className="campaign-side" style={{ background: token.colorBgLayout, borderLeft: `1px solid ${token.colorBorderSecondary}` }}>
                <CampaignSidebar onHide={() => setUi((u) => ({ ...u, sidebar: false }))} />
              </Layout.Sider>
            )}
            <Drawer title={t('Campaigns')} open={drawer && !wide} onClose={() => setDrawer(false)} width={Math.min(420, window.innerWidth)} styles={{ body: { padding: 12 } }}>
              <CampaignSidebar />
            </Drawer>
          </Layout>
        </Ctx.Provider>
      </AntApp>
    </ConfigProvider>
  );
}
