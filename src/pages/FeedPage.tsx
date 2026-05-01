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

// Empty-state copy per filter. Kid-friendly: name what's missing AND
// what to do next, not "no items".
const EMPTY_COPY: Record<FeedFilter, string> = {
  all: 'Noch keine Kämpfe. Tipp auf „Was war heute?" auf der Heim-Seite.',
  pending: 'Niemand wartet gerade. Alles bestätigt.',
  mine: 'Du hast noch keine Kämpfe. Trag deinen ersten ein.',
  voided: 'Nichts gemeldet. Alles okay.',
};

export function FeedPage() {
  const [filter, setFilter] = useState<FeedFilter>('all');
  const { data: battles = [], isLoading } = useFeed(filter);

  return (
    <div className="bx min-h-screen w-full" style={{ background: 'var(--bx-ink)' }}>
      {/* Top padding respects iPhone notch via safe-area-inset-top. */}
      <div
        className="px-5"
        style={{
          paddingTop: 'max(20px, calc(env(safe-area-inset-top) + 12px))',
        }}
      >
        <div className="bx-eyebrow">Heute · Live</div>
        <div
          className="bx-display"
          style={{ fontSize: 36, lineHeight: 0.9, marginTop: 8 }}
        >
          WAS GEHT AB
          <span style={{ color: 'var(--bx-yellow)' }}>?</span>
        </div>
      </div>

      {/* Filter chips. Tap area is 44pt minimum (HIG): we keep the visual
          chip compact but pad the button up to 44px tall. */}
      <div className="px-5 pt-4 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
            className="bx-chip"
            style={{
              minHeight: 44,
              padding: '0 14px',
              cursor: 'pointer',
              background:
                filter === f.key ? 'var(--bx-yellow)' : 'rgba(255,255,255,0.06)',
              color: filter === f.key ? 'var(--bx-ink)' : 'rgba(255,255,255,0.7)',
              flex: '0 0 auto',
              fontSize: 11,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 pb-6">
        {isLoading && (
          <div
            className="text-center bx-mono"
            style={{
              padding: 30,
              color: 'var(--bx-mute)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              fontSize: 11,
            }}
          >
            Lade…
          </div>
        )}
        {!isLoading && battles.length === 0 && (
          <div
            className="bx-card text-center"
            style={{
              padding: 30,
              color: 'var(--bx-mute)',
              fontSize: 13,
              lineHeight: 1.45,
            }}
          >
            {EMPTY_COPY[filter]}
          </div>
        )}
        {battles.map((b) => (
          <BattleCard key={b.id} b={b} />
        ))}
      </div>
    </div>
  );
}
