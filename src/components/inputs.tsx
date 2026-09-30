import { useEffect, useState } from 'react';

type NumProps = {
  id?: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  suffix?: string;
  width?: string;
  label?: string;
};

/** Number input that lets you type freely ("134.", "") and commits valid numbers. */
export function Num({ id, value, onChange, step = 1, min, suffix, width, label }: NumProps) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    if (parseFloat(text.replace(',', '.')) !== value) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <span className="num" style={width ? { width } : undefined}>
      <input
        id={id}
        aria-label={label}
        inputMode="decimal"
        value={text}
        step={step}
        onChange={(e) => {
          setText(e.target.value);
          const n = parseFloat(e.target.value.replace(',', '.'));
          if (!Number.isNaN(n) && (min === undefined || n >= min)) onChange(n);
        }}
        onBlur={() => setText(String(value))}
      />
      {suffix && <span className="suffix">{suffix}</span>}
    </span>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value}
          className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
