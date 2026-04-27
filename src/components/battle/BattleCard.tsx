// src/components/battle/BattleCard.tsx
import { useState } from 'react';
import type { Battle } from '../../lib/types';
import { useKidById } from '../../hooks/useKid';
import { DisputeSheet } from './DisputeSheet';

export function BattleCard({ b }: { b: Battle }) {
  const [showDispute, setShowDispute] = useState(false);
  const { data: w } = useKidById(b.winner_kid_id);
  const { data: l } = useKidById(b.loser_kid_id);
  if (!w || !l) return null;
  const border =
    b.status === 'pending'
      ? 'border-l-bx-yellow'
      : b.status === 'confirmed'
        ? 'border-l-green-500'
        : 'border-l-red-500 opacity-60';

  return (
    <div className={`p-3 bg-zinc-900 rounded border-l-4 ${border} mb-2`}>
      <div className="text-sm">
        <strong>{w.display_name}</strong> besiegt <strong>{l.display_name}</strong>{' '}
        {b.winner_score}-{b.loser_score}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs opacity-60">
          {b.status === 'pending'
            ? '⏳ zählt in 24h'
            : b.status === 'confirmed'
              ? '✓ zählt'
              : '🚩 zählt nicht'}
        </span>
        {b.status === 'pending' && (
          <button onClick={() => setShowDispute(true)} className="text-xs text-red-400">
            🚩 stimmt nicht
          </button>
        )}
      </div>
      {showDispute && (
        <DisputeSheet battleId={b.id} onClose={() => setShowDispute(false)} />
      )}
    </div>
  );
}
