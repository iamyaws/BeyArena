// Avatar — initial chip with the kid's color (or a fallback crimson).
// Ported from .design-handoff/project/data.jsx; types added.

import type { Kid } from '../../lib/types';

const FALLBACK_COLOR = '#DC2626';

/**
 * Minimum kid shape needed to render an avatar. The full Kid row works,
 * but session pick (`{ id, display_name }`) does too — color falls back.
 */
export type AvatarKid = Pick<Kid, 'display_name'> & {
  card_color_hex?: string | null;
};

interface AvatarProps {
  kid: AvatarKid;
  size?: number;
  /** Show ink-colored ring around the avatar (used for hero / "you" emphasis). */
  ring?: boolean;
}

export function Avatar({ kid, size = 40, ring = false }: AvatarProps) {
  const color = kid.card_color_hex ?? FALLBACK_COLOR;
  const fontSize = Math.round(size * 0.42);
  const initial = kid.display_name[0]?.toUpperCase() ?? '?';
  return (
    <div
      className="bx-avatar"
      style={{
        width: size,
        height: size,
        background: color,
        borderRadius: '50%',
        fontSize,
        // The yellow card color needs dark text for contrast.
        color: color.toUpperCase() === '#FDE047' ? '#07070A' : '#fff',
        boxShadow: ring ? `0 0 0 2px var(--bx-ink), 0 0 0 4px ${color}` : 'none',
      }}
    >
      <span style={{ position: 'relative', zIndex: 1 }}>{initial}</span>
    </div>
  );
}
