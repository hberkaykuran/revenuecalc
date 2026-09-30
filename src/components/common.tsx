import { DownOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Card, Grid, InputNumber } from 'antd';
import type { ReactNode } from 'react';
import { useApp } from '../context';
import { getLang, t } from '../i18n';

type NumProps = {
  id?: string;
  value: number | undefined;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  width?: number | string;
  label?: string;
  placeholder?: string;
  onClear?: () => void;
};

export function Num({ id, value, onChange, min, max, step, suffix, width = 120, label, placeholder, onClear }: NumProps) {
  return (
    <InputNumber id={id} aria-label={label} value={value} min={min} max={max} step={step ?? 1} placeholder={placeholder}
      decimalSeparator={getLang() === 'tr' ? ',' : '.'} suffix={suffix} style={{ width }}
      onChange={(v) => { if (typeof v === 'number') onChange(v); else if (v === null && onClear) onClear(); }} />
  );
}

/** A card whose body collapses; remembered per browser. */
export function Section({ id, title, extra, children, sub }: { id: string; title: ReactNode; extra?: ReactNode; children: ReactNode; sub?: ReactNode }) {
  const { ui, setUi } = useApp();
  const collapsed = !!ui.collapsed[id];
  const narrow = !Grid.useBreakpoint().md;
  return (
    <Card
      size="small"
      title={
        <span className="section-title">
          <Button type="text" size="small" aria-expanded={!collapsed} aria-label={collapsed ? t('Expand') : t('Collapse')}
            icon={collapsed ? <RightOutlined /> : <DownOutlined />}
            onClick={() => setUi((u) => ({ ...u, collapsed: { ...u.collapsed, [id]: !collapsed } }))} />
          {title}
        </span>
      }
      extra={collapsed || narrow ? null : extra}
      styles={{ body: collapsed ? { display: 'none' } : undefined }}
    >
      {narrow && extra && <div style={{ marginBottom: 10 }}>{extra}</div>}
      {sub && <div className="section-sub">{sub}</div>}
      {children}
    </Card>
  );
}
