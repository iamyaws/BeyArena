// FeedPage — recent battles across all kids, with status filter chips.
// Restyled with bx-display heading + bx-chip filters.

import { useState } from 'react';
import { useFeed, type FeedFilter } from '../hooks/useBattles';
import { BattleCard } from '../components/battle/BattleCard';

const FILTERS: ReadonlyArray<{ key: FeedFilter; label: string }> = [
  { key: 'all', label: 'Alle' },
  { key: 'pending', label: 'Wartet' },
  { key: 'mine', label: 'Meine' },
  { key: 'voided', label: 'Gemeldet' },
];

export function FeedPage() {
  const [filter, setFilter] = useState<FeedFilter>('all');
  const { data: battles = [] } = useFeed(filter);

  return (
    <div className="bx min-h-screen w-full" style={{ background: 'var(--bx-ink)' }}>
      <div className="px-5 pt-5">
        <div className="bx-eyebrow">Heute · Live</div>
        <div
          className="bx-display"
          style={{ fontSize: 36, lineHeight: 0.9, marginTop: 8 }}
        >
          WAS GEHT AB
          <span style={{ color: 'var(--bx-yellow)' }}>?</span>
        </div>
      </div>

      <div className="px-5 pt-4 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="bx-chip"
            style={{
              padding: '6px 10px',
              cursor: 'pointer',
              background:
                filter === f.key ? 'var(--bx-yellow)' : 'rgba(255,255,255,0.06)',
              color: filter === f.key ? 'var(--bx-ink)' : 'rgba(255,255,255,0.7)',
              flex: '0 0 auto',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 pb-6">
        {battles.length === 0 && (
          <div
            className="bx-card text-center"
            style={{ padding: 30, color: 'var(--bx-mute)', fontSize: 13 }}
          >
            Noch keine Schlachten in diesem Filter.
          </div>
        )}
        {battles.map((b) => (
          <BattleCard key={b.id} b={b} />
        ))}
      </div>
    </div>
  );
}
