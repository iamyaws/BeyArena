// BigBey — more elaborate 8-blade spinning-top with radial gradient shading.
// Used on profile cards + match success screens (bigger hero contexts).
// Ported from .design-handoff/project/BeyArena QR Cards.html (BigBey).

import type { BeyVisual } from './Bey';

interface BigBeyProps {
  bey: BeyVisual;
  size?: number;
  spin?: boolean;
}

export function BigBey({ bey, size = 180, spin = false }: BigBeyProps) {
  const c1 = bey.color1;
  const c2 = bey.color2;
  const shineId = `g-${bey.id}`;
  const radialId = `gr-${bey.id}`;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={spin ? 'bx-spin' : ''}
      style={{ display: 'block' }}
    >
      <defs>
        <radialGradient id={shineId} cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={radialId} cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill={`url(#${radialId})`} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => (
        <polygon
          key={i}
          points="50,2 58,28 50,46 42,28"
          fill={c2}
          transform={`rotate(${a} 50 50)`}
          opacity={i % 2 ? 0.95 : 0.7}
        />
      ))}
      <circle cx="50" cy="50" r="26" fill={c1} stroke="rgba(0,0,0,0.4)" strokeWidth="1.2" />
      <circle cx="50" cy="50" r="26" fill={`url(#${shineId})`} />
      <circle cx="50" cy="50" r="10" fill="#0c0c10" />
      <polygon points="50,42 56,50 50,58 44,50" fill={c2} />
    </svg>
  );
}
