// PlayerCard — the trading-card profile hero.
// Tournament-card aesthetic ported from .design-handoff/project/player.jsx
// (the "HERO trading card" block). Shows team eyebrow, name, tagline,
// avatar + primary bey, and ELO/Winrate/Streak triple-stat row.

import type { Kid } from '../../lib/types';
import { Avatar } from '../ui/Avatar';
import { Bey } from '../bey/Bey';
import { beyVisualFromDb } from '../bey/beyVisual';
import type { Bey as DbBey } from '../../lib/types';

interface PlayerCardProps {
  kid: Kid;
  /** Optional primary bey to spin in the right side of the card. */
  primaryBey?: DbBey | null;
  /** Win count for winrate display (defaults to skipping winrate row). */
  wins?: number;
  losses?: number;
  /** Recent-streak heuristic; positive = win streak, negative = loss streak. */
  streak?: number;
  /** Team name shown as eyebrow ("Spieler · Team Drachen"). Optional. */
  teamName?: string | null;
}

export function PlayerCard({
  kid,
  primaryBey,
  wins,
  losses,
  streak = 0,
  teamName,
}: PlayerCardProps) {
  const tone = kid.card_color_hex ?? '#DC2626';
  const total = (wins ?? 0) + (losses ?? 0);
  const winrate = total > 0 ? Math.round(((wins ?? 0) / total) * 100) : null;
  const isPeak = kid.floor === 100;
  const beyVisual = beyVisualFromDb(primaryBey ?? null);

  return (
    <div
      className="bx-card bx-noise"
      style={{
        padding: 18,
        background: `
          linear-gradient(180deg, ${tone}26 0%, transparent 50%),
          linear-gradient(180deg, #14151c 0%, #0c0d12 100%)
        `,
        border: `1px solid ${tone}44`,
      }}
    >
      {/* top row: eyebrow + name + tagline | floor */}
      <div className="flex justify-between items-start">
        <div>
          <div className="bx-eyebrow">
            Spieler{teamName ? ` · Team ${teamName}` : ''}
          </div>
          <div
            className="bx-display"
            style={{ fontSize: 32, marginTop: 6, lineHeight: 0.9 }}
          >
            {kid.display_name.toUpperCase()}
          </div>
          {kid.tagline && (
            <div
              style={{
                marginTop: 6,
                color: 'var(--bx-yellow)',
                fontSize: 11,
                fontStyle: 'italic',
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.04em',
              }}
            >
              &quot;{kid.tagline}&quot;
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="bx-eyebrow">Etage</div>
          <div
            className="bx-display"
            style={{
              fontSize: 44,
              lineHeight: 0.85,
              color: isPeak ? 'var(--bx-yellow)' : '#fff',
              textShadow: isPeak ? '0 0 18px rgba(253,224,71,0.5)' : 'none',
            }}
          >
            {kid.floor}
          </div>
          <div
            className="bx-mono"
            style={{ fontSize: 9, color: 'var(--bx-mute-2)' }}
          >
            / 100
          </div>
        </div>
      </div>

      {/* avatar + divider + primary bey */}
      <div
        className="flex items-center justify-between"
        style={{ marginTop: 18, gap: 18 }}
      >
        <Avatar kid={kid} size={84} ring />
        <div
          className="flex-1 relative"
          style={{ height: 1, background: 'rgba(255,255,255,0.08)' }}
        >
          <div
            className="bx-mono absolute"
            style={{
              top: -8,
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#0c0d12',
              padding: '0 6px',
              fontSize: 8,
              color: 'var(--bx-mute-2)',
              letterSpacing: '0.2em',
            }}
          >
            VS WELT
          </div>
        </div>
        {beyVisual ? (
          <Bey bey={beyVisual} size={84} spin />
        ) : (
          <Bey bey={null} size={84} />
        )}
      </div>

      {/* triple stats row */}
      <div
        className="grid overflow-hidden"
        style={{
          marginTop: 18,
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 1,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 10,
        }}
      >
        {[
          { label: 'ELO', value: String(kid.elo) },
          {
            label: 'WINRATE',
            value: winrate === null ? '—' : `${winrate}%`,
          },
          {
            label: 'STREAK',
            value: streak > 0 ? `+${streak}` : streak === 0 ? '—' : String(streak),
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{ background: '#0c0d12', padding: '10px 8px', textAlign: 'center' }}
          >
            <div className="bx-display" style={{ fontSize: 22 }}>
              {s.value}
            </div>
            <div className="bx-eyebrow" style={{ marginTop: 2 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
