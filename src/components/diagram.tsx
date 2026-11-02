// EXAMFORGE — diagram renderer for authored diagram specs (flow / architecture / sequence / comparison).

import type { DiagramSpec } from '../data/types';

export function Diagram({ spec }: { spec: DiagramSpec }) {
  return (
    <figure style={{ margin: 0 }}>
      <figcaption className="stat-label" style={{ marginBottom: 8 }}>
        {spec.title}
      </figcaption>

      {spec.kind === 'flow' && (
        <div className="col" style={{ gap: 0 }}>
          {spec.steps.map((s, i) => (
            <div key={s + i} className="row" style={{ gap: 10, alignItems: 'stretch' }}>
              <div className="col" style={{ alignItems: 'center', width: 22 }}>
                <span
                  style={{
                    width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center',
                    background: '#2c2a24', border: '1px solid #423e35', fontSize: 10, color: '#b3a6d6', fontWeight: 700,
                  }}
                >
                  {i + 1}
                </span>
                {i < spec.steps.length - 1 && <span style={{ flex: 1, width: 1, background: '#3a372f', minHeight: 14 }} />}
              </div>
              <div
                style={{
                  border: '1px solid #38352d', borderRadius: 10, padding: '7px 11px',
                  background: '#232219', fontSize: 12.5, color: '#ded8cc', marginBottom: 6, flex: 1,
                }}
              >
                {s}
              </div>
            </div>
          ))}
        </div>
      )}

      {spec.kind === 'arch' && (
        <div className="col" style={{ gap: 6 }}>
          {spec.layers.map((l) => (
            <div
              key={l.label}
              style={{
                border: '1px solid #38352d', borderRadius: 10, background: '#232219', padding: '8px 10px',
              }}
            >
              <div className="stat-label" style={{ fontSize: 9.5, marginBottom: 5 }}>{l.label}</div>
              <div className="row wrap" style={{ gap: 6 }}>
                {l.items.map((it) => (
                  <span
                    key={it}
                    style={{
                      border: '1px solid #403c33', borderRadius: 8, padding: '4px 8px',
                      fontSize: 11.5, color: '#cfc9bf', background: '#2a2822',
                    }}
                  >
                    {it}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {spec.kind === 'sequence' && (
        <div className="col" style={{ gap: 4 }}>
          {spec.messages.map((m, i) => (
            <div
              key={`${m.label}-${i}`}
              className="row"
              style={{
                gap: 8, fontSize: 12, padding: '6px 9px', borderRadius: 9,
                background: i % 2 === 0 ? '#232219' : '#262419', border: '1px solid #34312a',
              }}
            >
              <span style={{ color: '#b3a6d6', fontWeight: 600, minWidth: 62 }}>{m.from}</span>
              <span className="muted">→</span>
              <span style={{ color: '#5fb08a', fontWeight: 600, minWidth: 62 }}>{m.to}</span>
              <span style={{ color: '#ded8cc', marginLeft: 'auto', textAlign: 'right' }}>{m.label}</span>
            </div>
          ))}
        </div>
      )}

      {spec.kind === 'compare' && (
        <div className="table-wrap" style={{ maxHeight: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                {spec.columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {spec.rows.map((r) => (
                <tr key={r.label}>
                  <td style={{ color: '#f4f0e8', fontWeight: 600 }}>{r.label}</td>
                  {r.cells.map((cell, i) => (
                    <td key={`${r.label}-${i}`} className="muted">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  );
}
