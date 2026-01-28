// File: app/forecast/CustomTooltip.jsx
import React from 'react';

export default function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  // Helper to format any numeric value as an integer with separators
  const fmt = v =>
    typeof v === 'number'
      ? v.toLocaleString(undefined, { maximumFractionDigits: 0 })
      : v;

  return (
    <div className="tooltip-card">
      <p>{label}</p>
      {payload.map(p => (
        <div key={p.dataKey}>
          <span className="dot" style={{ background: p.color }} />
          {p.name}: {fmt(p.value)}
        </div>
      ))}

      <style jsx>{`
        .tooltip-card {
          background: rgba(20,20,20,0.9);
          padding: var(--space-sm);
          border-radius: var(--radius);
          box-shadow: var(--shadow-deep);
          color: rgba(255,255,255,0.7);
          font-size: 0.875rem;
        }
        .tooltip-card .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 4px;
          display: inline-block;
        }
      `}</style>
    </div>
  );
}
