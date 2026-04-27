// src/pages/FeedPage.tsx
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
    <div className="p-4">
      <h1 className="text-xl font-bold mb-3">Was geht ab?</h1>
      <div className="flex gap-2 mb-3">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1 rounded text-sm ${
              filter === f.key ? 'bg-bx-yellow text-black' : 'bg-zinc-800'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {battles.map((b) => (
        <BattleCard key={b.id} b={b} />
      ))}
    </div>
  );
}
