// StatBar — label + bar + value, used in match + player views.
// Ported from .design-handoff/project/data.jsx; types added.

interface StatBarProps {
  label: string;
  value: number;
  max?: number;
  /** CSS color (hex / var()) for the filled bar. Defaults to bx-yellow. */
  color?: string;
}

export function StatBar({ label, value, max = 10, color = 'var(--bx-yellow)' }: StatBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          width: 48,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.5)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          flex: 1,
          height: 6,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 999,
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            borderRadius: 999,
          }}
        />
      </div>
      <div
        className="bx-num"
        style={{ width: 22, textAlign: 'right', fontSize: 13 }}
      >
        {value}
      </div>
    </div>
  );
}
