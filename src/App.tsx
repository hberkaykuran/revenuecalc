import { useEffect, useState } from 'react';
import { Campaigns } from './components/Campaigns';
import { CartView } from './components/CartView';
import { Results } from './components/Results';
import { SettingsView } from './components/SettingsView';
import { useAppState } from './store';

const TABS = [
  { id: 'results', label: 'Results' },
  { id: 'cart', label: 'Order calculator' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'settings', label: 'Settings' },
] as const;
type Tab = (typeof TABS)[number]['id'];

const initialTab = (): Tab => {
  const h = location.hash.slice(1);
  return (TABS.find((t) => t.id === h)?.id ?? 'results') as Tab;
};

export function App() {
  const [state, setState] = useAppState();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [scenarioId, setScenarioId] = useState(state.scenarios[0]?.id);
  const scenario = state.scenarios.find((s) => s.id === scenarioId) ?? state.scenarios[0];

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
            <p className="sub">Profit per order after campaigns, commission, shipping and VAT</p>
          </div>
        </div>
        {(tab === 'results' || tab === 'cart') && scenario && (
          <label className="scenario-pick">
            <span>Scenario</span>
            <select id="scenario" value={scenario.id} onChange={(e) => setScenarioId(e.target.value)}>
              {state.scenarios.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        )}
      </header>
      <nav className="tabs" aria-label="Sections">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={t.id === tab ? 'on' : ''} aria-current={t.id === tab ? 'page' : undefined} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      <main>
        {tab === 'results' && scenario && <Results state={state} scenario={scenario} />}
        {tab === 'cart' && scenario && <CartView state={state} scenario={scenario} />}
        {tab === 'campaigns' && <Campaigns state={state} setState={setState} />}
        {tab === 'settings' && <SettingsView state={state} setState={setState} />}
      </main>
    </div>
  );
}
