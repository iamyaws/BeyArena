// LabPickerBey — bottom sheet for picking a bey. Reused for both MY BEY
// (kid's side) and the "Bey bestimmen" mode of the opponent picker. Shows
// stat bars + type emblem (spec Q9=D, section 5.2).

import { useMemo } from 'react';
import { useAllBeys, useKidBeys } from '../../hooks/useBeys';
import { useSession } from '../../stores/session';
import { useLabSession } from '../../stores/lab-session';
import { Bey } from '../bey/Bey';
import { beyVisualFromDb } from '../bey/beyVisual';
import type { Bey as DbBey } from '../../lib/types';

const TYPE_EMOJI: Record<NonNullable<DbBey['type']>, string> = {
  attack:  '⚔',
  defense: '🛡',
  stamina: '⏱',
  balance: '⚖',
};

interface Props {
  open: boolean;
  onPick: (beyId: string) => void;
  onClose: () => void;
}

export function LabPickerBey({ open, onPick, onClose }: Props) {
  const { kid } = useSession();
  const { data: allBeys = [] } = useAllBeys();
  const { data: ownedBeys = [] } = useKidBeys(kid?.id ?? null);
  const { beyFilter, setBeyFilter } = useLabSession();

  const beys = useMemo(
    () => (beyFilter === 'mine' && ownedBeys.length > 0 ? ownedBeys : allBeys),
    [beyFilter, ownedBeys, allBeys],
  );

  // If kid has no owned beys yet, hide the filter toggle entirely (always show all 46).
  const showFilter = ownedBeys.length > 0;

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bey wählen"
      onClick={onClose}
      className="fixed inset-0 z-40 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.55)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bx-card"
        style={{
          maxHeight: '80vh',
          overflowY: 'auto',
          borderRadius: '20px 20px 0 0',
          padding: '18px 18px max(22px, calc(env(safe-area-inset-bottom) + 12px))',
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <div className="bx-eyebrow">Bey wählen</div>
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="bx-btn bx-btn-ghost"
            style={{ padding: '6px 10px', fontSize: 12 }}
          >
            Schließen
          </button>
        </div>

        {showFilter && (
          <div className="flex" style={{ gap: 6, marginBottom: 14 }}>
            <button
              onClick={() => setBeyFilter('mine')}
              className={`bx-btn ${beyFilter === 'mine' ? 'bx-btn-yellow' : 'bx-btn-ghost'}`}
              style={{ flex: 1, padding: '8px', fontSize: 12 }}
            >
              Meine Beys
            </button>
            <button
              onClick={() => setBeyFilter('all')}
              className={`bx-btn ${beyFilter === 'all' ? 'bx-btn-yellow' : 'bx-btn-ghost'}`}
              style={{ flex: 1, padding: '8px', fontSize: 12 }}
            >
              Alle Beys
            </button>
          </div>
        )}

        <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {beys.map((b) => (
            <BeyPickCard key={b.id} bey={b} onPick={() => onPick(b.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Type emblem colors — each type has a distinctive accent so the kid can scan
// a grid and see "all the attack-types are red" at a glance.
const TYPE_TINT: Record<NonNullable<DbBey['type']>, string> = {
  attack: '#DC2626',
  defense: '#2563EB',
  stamina: '#7C3AED',
  balance: '#F97316',
};

function BeyPickCard({ bey, onPick }: { bey: DbBey; onPick: () => void }) {
  const visual = beyVisualFromDb(bey);
  const emblem = bey.type ? TYPE_EMOJI[bey.type] : '';
  const emblemTint = bey.type ? TYPE_TINT[bey.type] : 'var(--bx-mute)';
  return (
    <button
      onClick={onPick}
      className="bx-card"
      style={{
        padding: 12,
        textAlign: 'left',
        cursor: 'pointer',
        minHeight: 44,
        background: 'rgba(255,255,255,0.03)',
        position: 'relative',
      }}
    >
      {/* Type emblem in the top-right corner — out of the way but always visible */}
      <div
        className="bx-mono"
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          fontSize: 16,
          color: emblemTint,
          filter: `drop-shadow(0 0 4px ${emblemTint}66)`,
        }}
        aria-label={bey.type ?? ''}
      >
        {emblem}
      </div>

      <div className="flex justify-center" style={{ marginBottom: 8 }}>
        <Bey bey={visual} size={56} spin />
      </div>
      <div
        className="bx-display"
        style={{
          fontSize: 12,
          lineHeight: 1.15,
          marginBottom: 8,
          minHeight: 28, // reserve room for two lines so cards don't shift
          color: 'rgba(255,255,255,0.92)',
        }}
      >
        {bey.name_de ?? bey.name_en}
      </div>
      <StatBars bey={bey} />
    </button>
  );
}

function StatBars({ bey }: { bey: DbBey }) {
  const stats: Array<['ATK' | 'DEF' | 'STA', number | null]> = [
    ['ATK', bey.stat_attack],
    ['DEF', bey.stat_defense],
    ['STA', bey.stat_stamina],
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {stats.map(([label, val]) => {
        const v = val ?? 0;
        const pct = Math.min(100, v);
        return (
          <div key={label} className="flex items-center" style={{ gap: 6 }}>
            <div
              className="bx-mono"
              style={{
                fontSize: 10,
                width: 26,
                color: 'rgba(255,255,255,0.75)',
                letterSpacing: '0.04em',
              }}
            >
              {label}
            </div>
            <div
              style={{
                flex: 1,
                height: 7,
                background: 'rgba(255,255,255,0.10)',
                borderRadius: 4,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background:
                    'linear-gradient(90deg, var(--bx-yellow), #FACC15)',
                  boxShadow: '0 0 6px rgba(253,224,71,0.35)',
                }}
              />
            </div>
            <div
              className="bx-mono"
              style={{
                fontSize: 10,
                width: 22,
                color: val == null ? 'var(--bx-mute)' : 'rgba(255,255,255,0.85)',
                textAlign: 'right',
              }}
            >
              {val == null ? '—' : v}
            </div>
          </div>
        );
      })}
    </div>
  );
}
