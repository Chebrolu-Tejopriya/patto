import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { Icon } from './Icon';

export function Section({ title, children, right, help }: { title: string; children: ReactNode; right?: ReactNode; help?: string }) {
  const [open, setOpen] = useState(!['Orb', 'Waves', 'Grain', 'Vignette'].includes(title));
  const id = useId();
  return (
    <section className="sec" data-section={title.toLowerCase()}>
      <header>
        <button className="sectionToggle" title={help} aria-description={help} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}><span className="sectionLabel"><Icon name={title === 'Ombre' ? 'gradient' : title === 'Pattern' ? 'grid' : ['Motion', 'Cursor', 'Waves'].includes(title) ? 'motion' : 'sliders'} />{title === 'Ombre' ? 'Gradient' : title}</span><span className={'chevron' + (open ? ' open' : '')} aria-hidden="true"><Icon name="chevron" /></span></button>
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
    <label className="row sliderRow">
      <span>{label}</span>
      <input type="range" aria-label={label} min={min} max={max} step={step} value={value} style={{ '--range-progress': `${Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))}%` } as CSSProperties} onChange={(e) => onChange(+e.target.value)} />
      <code>{fmt ? fmt(value) : step >= 1 ? value.toFixed(0) : value.toFixed(2)}</code>
    </label>
  );
}

export function Toggle({ label, value, onChange, ariaLabel, help }: { label: string; value: boolean; onChange: (v: boolean) => void; ariaLabel?: string; help?: string }) {
  return (
    <button className={'toggle' + (value ? ' on' : '')} title={help} aria-description={help} onClick={() => onChange(!value)} aria-pressed={value} aria-label={ariaLabel || label || 'Enable effect'}>
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
