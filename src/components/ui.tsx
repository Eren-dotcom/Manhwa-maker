import React, { useEffect, useRef } from 'react';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

// ---------------------------------------------------------------------------
// Icons — 24px stroke set, no icon library dependency.
// ---------------------------------------------------------------------------
const PATHS: Record<string, React.ReactNode> = {
  spark: <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3zM18.5 15.5l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9.9-2.3z" />,
  arrow: <><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>,
  arrowLeft: <><path d="M19 12H5" /><path d="M11 18l-6-6 6-6" /></>,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v5M14 11v5" /></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 012-2h8" /></>,
  download: <><path d="M12 3v12" /><path d="M7 11l5 5 5-5" /><path d="M4 20h16" /></>,
  upload: <><path d="M12 20V8" /><path d="M7 12l5-5 5 5" /><path d="M4 4h16" /></>,
  check: <path d="M4 12.5l5 5L20 6.5" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  close: <><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>,
  book: <><path d="M4 4h7a3 3 0 013 3v13a2.5 2.5 0 00-2.5-2.5H4z" /><path d="M20 4h-7a3 3 0 00-3 3v13a2.5 2.5 0 012.5-2.5H20z" /></>,
  layers: <><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /><path d="M3 17l9 5 9-5" /></>,
  type: <><path d="M4 6h16" /><path d="M12 6v13" /><path d="M8 19h8" /></>,
  shield: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-2.9 1.2V21a2 2 0 11-4 0v-.1A1.7 1.7 0 007 19.4a1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.7 1.7 0 002.6 14H2.5a2 2 0 110-4h.1A1.7 1.7 0 004.6 7a1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1A1.7 1.7 0 0010 2.6V2.5a2 2 0 114 0v.1A1.7 1.7 0 0017 4.6a1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1A1.7 1.7 0 0021.4 10h.1a2 2 0 110 4h-.1a1.7 1.7 0 00-1.9 1z" /></>,
  refresh: <><path d="M21 12a9 9 0 11-3-6.7" /><path d="M21 4v5h-5" /></>,
  undo: <><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 010 12H9" /></>,
  redo: <><path d="M15 14l5-5-5-5" /><path d="M20 9H10a6 6 0 000 12h5" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></>,
  users: <><circle cx="9" cy="8" r="3.4" /><path d="M2.5 20c0-3.4 2.9-6 6.5-6s6.5 2.6 6.5 6" /><path d="M16 5.2a3.4 3.4 0 010 6.6" /><path d="M17.5 14.4c2.4.5 4 2.4 4 4.6" /></>,
  film: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M3 15h18M8 4v16M16 4v16" /></>,
  panel: <><rect x="4" y="3" width="16" height="8" rx="1.5" /><rect x="4" y="14" width="16" height="7" rx="1.5" /></>,
  wand: <><path d="M15 4V2M15 10V8M11 6H9M21 6h-2M17.5 8.5l1.5 1.5M17.5 3.5L19 2M12.5 8.5L11 10" /><path d="M3 21l9-9" /></>,
  play: <path d="M7 4l13 8-13 8V4z" />,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  external: <><path d="M14 4h6v6" /><path d="M20 4l-9 9" /><path d="M19 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h5" /></>,
  dot: <circle cx="12" cy="12" r="4" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  key: <><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9" /><path d="M17 3l3 3" /></>,
  chat: <><path d="M21 12a8 8 0 01-8 8H7l-4 3v-7a8 8 0 018-11h2a8 8 0 018 8z" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.5" /><path d="M21 15l-5-4-8 7" /></>,
  move: <><path d="M12 3v18M3 12h18" /><path d="M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><circle cx="12" cy="8" r=".8" fill="currentColor" /></>,
  warn: <><path d="M12 3l9.5 17H2.5L12 3z" /><path d="M12 9v5" /><circle cx="12" cy="17.5" r=".8" fill="currentColor" /></>,
  flame: <path d="M12 3s5 4.5 5 9a5 5 0 01-10 0c0-2 1-3.5 2-4.5 0 2 1 3 1 3s-1-4 2-7.5z" />,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></>,
};

export function Icon({
  name,
  size = 18,
  className,
  fill,
}: {
  name: keyof typeof PATHS | string;
  size?: number;
  className?: string;
  fill?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx('icon', className)}
      aria-hidden="true"
    >
      {PATHS[name] ?? PATHS.dot}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Buttons + inputs
// ---------------------------------------------------------------------------
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline' | 'danger' | 'soft';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  loading?: boolean;
  full?: boolean;
};

export function Btn({ variant = 'outline', size = 'md', icon, loading, full, children, className, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={cx('btn', `btn-${variant}`, `btn-${size}`, full && 'btn-full', loading && 'is-loading', className)}
      disabled={rest.disabled || loading}
    >
      {loading ? <span className="spinner" aria-hidden /> : icon ? <Icon name={icon} size={size === 'sm' ? 14 : 16} /> : null}
      {children && <span>{children}</span>}
    </button>
  );
}

export function IconBtn({
  icon,
  label,
  active,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; label: string; active?: boolean }) {
  return (
    <button {...rest} className={cx('icon-btn', active && 'is-active')} title={label} aria-label={label}>
      <Icon name={icon} size={17} />
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
  htmlFor,
  right,
}: {
  label?: string;
  hint?: string;
  children: React.ReactNode;
  htmlFor?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="field">
      {(label || right) && (
        <div className="field-head">
          {label && <label className="field-label" htmlFor={htmlFor}>{label}</label>}
          {right}
        </div>
      )}
      {children}
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

export const TextInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => <input ref={ref} {...rest} className={cx('input', className)} />,
);
TextInput.displayName = 'TextInput';

export const TextArea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...rest }, ref) => <textarea ref={ref} {...rest} className={cx('input', 'textarea', className)} />,
);
TextArea.displayName = 'TextArea';

export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="select-wrap">
      <select {...rest} className={cx('input', 'select', className)}>
        {children}
      </select>
      <Icon name="chevronDown" size={14} className="select-arrow" />
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  hint?: string;
}) {
  return (
    <div className="slider">
      <div className="field-head">
        <label className="field-label">{label}</label>
        <span className="slider-val">{format ? format(value) : value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
  multi,
  size = 'md',
}: {
  options: { id: T; label: string }[];
  value: T | T[];
  onChange: (v: T) => void;
  multi?: boolean;
  size?: 'sm' | 'md';
}) {
  const isOn = (id: T) => (Array.isArray(value) ? value.includes(id) : value === id);
  return (
    <div className={cx('chips', `chips-${size}`)}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={cx('chip', isOn(o.id) && 'is-on')}
          onClick={() => onChange(o.id)}
          aria-pressed={isOn(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  dot,
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'accent' | 'ok' | 'warn' | 'err' | 'info';
  dot?: boolean;
}) {
  return (
    <span className={cx('badge', `badge-${tone}`)}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
}

export function Card({
  children,
  className,
  as: Tag = 'div',
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { as?: React.ElementType }) {
  return (
    <Tag {...rest} className={cx('card', className)}>
      {children}
    </Tag>
  );
}

export function SectionHead({
  eyebrow,
  title,
  desc,
  right,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  desc?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <header className="section-head">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2 className="section-title">{title}</h2>
        {desc && <p className="section-desc">{desc}</p>}
      </div>
      {right && <div className="section-right">{right}</div>}
    </header>
  );
}

export function Empty({ icon = 'spark', title, desc, action }: { icon?: string; title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icon} size={22} /></div>
      <h3>{title}</h3>
      {desc && <p>{desc}</p>}
      {action}
    </div>
  );
}

export function ProgressRing({ value, size = 62, stroke = 5, label }: { value: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.09)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="ring-label">{label ?? `${Math.round(pct)}`}</span>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
  footer?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cx('modal', wide && 'modal-wide')} ref={ref} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>{title}</h3>
          <IconBtn icon="close" label="Close" onClick={onClose} />
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track"><span className="toggle-thumb" /></span>
      <span className="toggle-label">{label}</span>
    </label>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}
