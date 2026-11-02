// EXAMFORGE — shared UI primitives.

import { useState, type ReactNode } from 'react';
import { STATUS_LABELS, type TopicStatus } from '../data/types';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function CardHead({
  title,
  sub,
  right,
}: {
  title: string;
  sub?: string;
  right?: ReactNode;
}) {
  return (
    <header className="card-head">
      <div className="col">
        <h3>{title}</h3>
        {sub && <span className="sub">{sub}</span>}
      </div>
      <div className="spacer" />
      {right}
    </header>
  );
}

export function Stat({
  label,
  value,
  unit,
  sub,
}: {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
}) {
  return (
    <div className="col" style={{ gap: 2 }}>
      <span className="stat-label">{label}</span>
      <span className="stat-value mono">
        {value}
        {unit && <small> {unit}</small>}
      </span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

export function Bar({ percent, tone = '' }: { percent: number; tone?: '' | 'em' | 'warn' }) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className={`bar ${tone}`} role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${p}%` }} />
    </div>
  );
}

export function Ring({ percent, label }: { percent: number; label?: string }) {
  const p = Math.max(0, Math.min(100, percent));
  const r = 38;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring">
      <svg width="92" height="92" viewBox="0 0 92 92">
        <circle cx="46" cy="46" r={r} fill="none" stroke="#1b1a16" strokeWidth="8" />
        <circle
          cx="46"
          cy="46"
          r={r}
          fill="none"
          stroke="#b3a6d6"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(p / 100) * c} ${c}`}
        />
      </svg>
      <div className="ring-label">{label ?? `${Math.round(p)}%`}</div>
    </div>
  );
}

export function StatusBadge({ status }: { status: TopicStatus }) {
  return <span className={`badge ${status}`}>{STATUS_LABELS[status]}</span>;
}

export function Tabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="pill-tabs" role="tablist">
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={value === o.id}
          className={value === o.id ? 'on' : ''}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function Modal({
  title,
  children,
  onClose,
  actions,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  actions?: ReactNode;
}) {
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <h2>{title}</h2>
          <button className="btn ghost sm" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
        {actions && (
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export function useConfirm() {
  const [pending, setPending] = useState<{ text: string; onYes: () => void } | null>(null);
  const confirm = (text: string, onYes: () => void) => setPending({ text, onYes });
  const node = pending ? (
    <Modal
      title="Please confirm"
      onClose={() => setPending(null)}
      actions={
        <>
          <button className="btn ghost" onClick={() => setPending(null)}>
            Cancel
          </button>
          <button
            className="btn primary"
            onClick={() => {
              pending.onYes();
              setPending(null);
            }}
          >
            Confirm
          </button>
        </>
      }
    >
      <p className="muted">{pending.text}</p>
    </Modal>
  ) : null;
  return { confirm, node };
}
