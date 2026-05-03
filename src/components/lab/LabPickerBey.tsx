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

        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {beys.map((b) => (
            <BeyPickCard key={b.id} bey={b} onPick={() => onPick(b.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function BeyPickCard({ bey, onPick }: { bey: DbBey; onPick: () => void }) {
  const visual = beyVisualFromDb(bey);
  const emblem = bey.type ? TYPE_EMOJI[bey.type] : '';
  return (
    <button
      onClick={onPick}
      className="bx-card"
      style={{
        padding: 10,
        textAlign: 'left',
        cursor: 'pointer',
        minHeight: 44,
        background: 'rgba(255,255,255,0.03)',
      }}
    >
      <div className="flex justify-center" style={{ marginBottom: 6 }}>
        <Bey bey={visual} size={48} spin />
      </div>
      <div
        className="bx-display truncate"
        style={{ fontSize: 11, lineHeight: 1.2, marginBottom: 4 }}
      >
        {bey.name_de ?? bey.name_en}
      </div>
      <StatBars bey={bey} />
      <div className="bx-mono" style={{ fontSize: 10, marginTop: 4, color: 'var(--bx-mute)' }}>
        {emblem}
      </div>
    </button>
  );
}

function StatBars({ bey }: { bey: DbBey }) {
  const stats: Array<['ATK' | 'DEF' | 'STA', number]> = [
    ['ATK', bey.stat_attack ?? 0],
    ['DEF', bey.stat_defense ?? 0],
    ['STA', bey.stat_stamina ?? 0],
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {stats.map(([label, val]) => (
        <div key={label} className="flex items-center" style={{ gap: 4 }}>
          <div className="bx-mono" style={{ fontSize: 8, width: 22, color: 'var(--bx-mute)' }}>
            {label}
          </div>
          <div
            style={{
              flex: 1,
              height: 4,
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, val)}%`,
                height: '100%',
                background: 'var(--bx-yellow)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
