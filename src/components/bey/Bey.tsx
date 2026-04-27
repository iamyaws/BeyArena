// Bey — SVG spinning-top placeholder. Two-toned, geometric.
// Used wherever a Bey is visually represented in the kid-facing UI.
// Ported from .design-handoff/project/data.jsx; types added.

import type { CSSProperties } from 'react';

export interface BeyVisual {
  /** Stable id used for SVG defs uniqueness. */
  id: string;
  /** Primary disc color (outer ring + inner disc). */
  color1: string;
  /** Secondary blade color (6-blade ring + center accent). */
  color2: string;
}

interface BeyProps {
  bey: BeyVisual | null | undefined;
  size?: number;
  /** When true, the SVG rotates via the bx-spin animation. */
  spin?: boolean;
  /** When true while `spin` is set, the spin is paused (no animation). */
  paused?: boolean;
}

export function Bey({ bey, size = 56, spin = false, paused = false }: BeyProps) {
  if (!bey) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: '1px dashed rgba(255,255,255,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.3)',
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
        }}
      >
        ?
      </div>
    );
  }
  const c1 = bey.color1;
  const c2 = bey.color2;
  const svgStyle: CSSProperties = {
    display: 'block',
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))',
  };
  const shineId = `bx-shine-${bey.id}`;
  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={spin && !paused ? 'bx-spin' : ''}
        style={svgStyle}
      >
        {/* outer ring */}
        <circle cx="50" cy="50" r="46" fill={c1} />
        {/* 6-blade ring */}
        {[0, 60, 120, 180, 240, 300].map((a, i) => (
          <polygon
            key={i}
            points="50,4 60,30 50,46 40,30"
            fill={c2}
            transform={`rotate(${a} 50 50)`}
          />
        ))}
        {/* inner disc */}
        <circle
          cx="50"
          cy="50"
          r="22"
          fill={c1}
          stroke="rgba(0,0,0,0.4)"
          strokeWidth="1.5"
        />
        <circle cx="50" cy="50" r="22" fill={`url(#${shineId})`} opacity="0.5" />
        {/* hub */}
        <circle cx="50" cy="50" r="8" fill="#0c0c10" />
        <circle cx="50" cy="50" r="4" fill={c2} />
        <defs>
          <radialGradient id={shineId} cx="35%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

