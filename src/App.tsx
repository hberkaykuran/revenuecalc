import { useEffect, useState } from 'react';
import { Campaigns } from './components/Campaigns';
import { CartView } from './components/CartView';
import { Ideas } from './components/Ideas';
import { Lab } from './components/Lab';
import { Results } from './components/Results';
import { SettingsView } from './components/SettingsView';
import { SetupBar } from './components/SetupBar';
import { useAppState } from './store';

const TABS = [
  { id: 'results', label: 'Results', bar: true },
  { id: 'lab', label: 'Campaign lab', bar: true },
  { id: 'ideas', label: 'Ideas', bar: false },
  { id: 'cart', label: 'Order calculator', bar: true },
  { id: 'campaigns', label: 'Campaigns', bar: false },
  { id: 'settings', label: 'Settings', bar: false },
] as const;
type Tab = (typeof TABS)[number]['id'];

const initialTab = (): Tab => {
  const h = location.hash.slice(1);
  return (TABS.find((t) => t.id === h)?.id ?? 'results') as Tab;
};

export function App() {
  const [state, setState] = useAppState();
  const [tab, setTab] = useState<Tab>(initialTab);
  const current = TABS.find((t) => t.id === tab)!;

  useEffect(() => {
    try { history.replaceState(null, '', `#${tab}`); } catch { /* ignore */ }
  }, [tab]);

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="mark" aria-hidden="true" />
          <div>
            <h1>Revenue calculator</h1>
            <p className="sub">Profit per order after campaigns, commission, shipping, packaging and VAT</p>
          </div>
        </div>
      </header>
      <nav className="tabs" aria-label="Sections">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={t.id === tab ? 'on' : ''} aria-current={t.id === tab ? 'page' : undefined} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      {current.bar && <SetupBar state={state} setState={setState} />}
      <main>
        {tab === 'results' && <Results state={state} />}
        {tab === 'lab' && <Lab state={state} setState={setState} />}
        {tab === 'ideas' && <Ideas state={state} setState={setState} />}
        {tab === 'cart' && <CartView state={state} />}
        {tab === 'campaigns' && <Campaigns state={state} setState={setState} />}
        {tab === 'settings' && <SettingsView state={state} setState={setState} />}
      </main>
    </div>
  );
}
