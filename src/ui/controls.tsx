import { useId, useState, type ReactNode } from 'react';

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  const [open, setOpen] = useState(!['Orb', 'Waves', 'Grain', 'Vignette'].includes(title));
  const id = useId();
  return (
    <section className="sec" data-section={title.toLowerCase()}>
      <header>
        <button className="sectionToggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}><span>{title === 'Ombre' ? 'Gradient' : title}</span><span className={'chevron' + (open ? ' open' : '')} aria-hidden="true" /></button>
        {right}
      </header>
      <div id={id} className="sectionContent" hidden={!open}>{children}</div>
    </section>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  fmt,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  fmt?: (v: number) => string;
}) {
  return (
    <label className="row">
      <span>{label}</span>
      <input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
      <code>{fmt ? fmt(value) : step >= 1 ? value.toFixed(0) : value.toFixed(2)}</code>
    </label>
  );
}

export function Toggle({ label, value, onChange, ariaLabel }: { label: string; value: boolean; onChange: (v: boolean) => void; ariaLabel?: string }) {
  return (
    <button className={'toggle' + (value ? ' on' : '')} onClick={() => onChange(!value)} aria-pressed={value} aria-label={ariaLabel || label || 'Enable effect'}>
      <i />
      <span>{label}</span>
    </button>
  );
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: T[]; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o} className={o === value ? 'on' : ''} aria-pressed={o === value} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}
