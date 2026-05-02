// BattleCelebration — full-screen overlay shown when a kid logs a battle they won.
//
// Plays a curated Beyblade X GIF (rating=g, hand-picked) over a backdrop tinted
// to the moment: gold for The Peak, yellow for floor-up, green for a regular
// win. Auto-dismisses after ~2.6 seconds (HIG-aligned: brief acknowledgement,
// don't block the user). Tap anywhere to dismiss early.
//
// Marc explicitly asked for Beyblade X GIFs on win moments — this is the
// minimum-viable surface; reactions in the feed (Tier 2) come later.

import { useEffect, useMemo, useState } from 'react';
import {
  BATTLE_WON_GIFS,
  FLOOR_UP_GIFS,
  PEAK_CLAIM_GIFS,
  giphyUrl,
  randomGifFrom,
  type GiphyId,
} from '../../lib/giphy';
import type { CelebrationTier } from './celebrationTier';

interface Props {
  tier: CelebrationTier;
  /** Called when the overlay finishes (auto or tap). */
  onDismiss: () => void;
}

const COPY: Record<CelebrationTier, { eyebrow: string; title: string; sub: string }> = {
  won: {
    eyebrow: 'EINGETRAGEN',
    title: 'STARK!',
    sub: 'Sieg gespeichert. Zählt in 24 Std.',
  },
  floorup: {
    eyebrow: 'AUFGESTIEGEN',
    title: 'NEUE ETAGE!',
    sub: 'Du kletterst weiter im Tower.',
  },
  peak: {
    eyebrow: 'THE PEAK',
    title: 'X-CHAMPION!',
    sub: 'Du stehst ganz oben. Glückwunsch.',
  },
};

const TINTS: Record<CelebrationTier, { glow: string; bg: string }> = {
  won: {
    glow: 'rgba(34,197,94,0.35)',
    bg: 'radial-gradient(120% 80% at 50% 30%, rgba(34,197,94,0.18), transparent 60%), var(--bx-ink)',
  },
  floorup: {
    glow: 'rgba(253,224,71,0.4)',
    bg: 'radial-gradient(120% 80% at 50% 30%, rgba(253,224,71,0.22), transparent 60%), var(--bx-ink)',
  },
  peak: {
    glow: 'rgba(253,224,71,0.55)',
    bg: 'radial-gradient(120% 80% at 50% 30%, rgba(253,224,71,0.3), transparent 55%), radial-gradient(80% 60% at 50% 110%, rgba(220,38,38,0.25), transparent 60%), var(--bx-ink)',
  },
};

export function BattleCelebration({ tier, onDismiss }: Props) {
  // Pick GIF once on mount. useMemo ensures it doesn't change on re-render.
  const gifId: GiphyId = useMemo(() => {
    if (tier === 'peak') return randomGifFrom(PEAK_CLAIM_GIFS);
    if (tier === 'floorup') return randomGifFrom(FLOOR_UP_GIFS);
    return randomGifFrom(BATTLE_WON_GIFS);
  }, [tier]);

  // Briefly delay rendering the GIF so the browser doesn't compete with the
  // mount animation. Also lets the haptic + entry transition feel snappy.
  const [gifVisible, setGifVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGifVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Auto-dismiss. 2.6s is long enough to register but short enough that the
  // kid doesn't feel held up before landing on the home dashboard.
  useEffect(() => {
    const t = setTimeout(onDismiss, 2600);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const copy = COPY[tier];
  const tint = TINTS[tier];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
      onClick={onDismiss}
      className="bx fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: tint.bg,
        animation: 'bx-fadeIn 0.2s ease-out',
        cursor: 'pointer',
      }}
    >
      <style>{`
        @keyframes bx-fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes bx-popIn {
          from { transform: scale(0.85); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .bx-celebration-pop { animation: none !important; }
        }
      `}</style>

      <div
        className="bx-celebration-pop"
        style={{
          textAlign: 'center',
          padding: '24px',
          maxWidth: 360,
          animation: 'bx-popIn 0.3s ease-out',
        }}
      >
        <div className="bx-eyebrow" style={{ marginBottom: 12 }}>
          {copy.eyebrow}
        </div>
        <div
          className="bx-display bx-yellow-glow"
          style={{
            fontSize: tier === 'peak' ? 56 : 48,
            color: tier === 'won' ? '#22c55e' : 'var(--bx-yellow)',
            lineHeight: 0.9,
            letterSpacing: '0.01em',
            marginBottom: 18,
            filter: `drop-shadow(0 0 16px ${tint.glow})`,
          }}
        >
          {copy.title}
        </div>

        {/* GIF — animated webp. Fixed aspect-square frame so layout doesn't
            shift while loading. */}
        <div
          style={{
            width: '100%',
            aspectRatio: '1 / 1',
            maxWidth: 280,
            margin: '0 auto',
            borderRadius: 16,
            overflow: 'hidden',
            background: '#0a0a0e',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: `0 8px 40px ${tint.glow}`,
          }}
        >
          {gifVisible && (
            <img
              src={giphyUrl(gifId, '200w.webp')}
              alt=""
              loading="eager"
              decoding="async"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          )}
        </div>

        <div
          className="bx-mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--bx-mute)',
            marginTop: 16,
          }}
        >
          {copy.sub}
        </div>
      </div>

      {/* Tap-to-dismiss hint at the bottom — HIG status communication. */}
      <div
        className="bx-mono absolute"
        style={{
          bottom: 'max(24px, calc(env(safe-area-inset-bottom) + 12px))',
          fontSize: 10,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.35)',
        }}
      >
        Tipp irgendwo zum Weitergehen
      </div>
    </div>
  );
}

