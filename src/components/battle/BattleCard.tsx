// BattleCard — single battle row in the feed.
// Restyled with bx-card + status-tinted left border + bx-display score.

import { useState } from 'react';
import type { Battle } from '../../lib/types';
import { useKidById } from '../../hooks/useKid';
import { Avatar } from '../ui/Avatar';
import { DisputeSheet } from './DisputeSheet';

const STATUS_COLOR: Record<Battle['status'], string> = {
  pending: '#FDE047',
  confirmed: '#22c55e',
  voided: '#DC2626',
};

const STATUS_LABEL: Record<Battle['status'], string> = {
  pending: 'wartet',
  confirmed: 'bestätigt',
  voided: 'gestrichen',
};

export function BattleCard({ b }: { b: Battle }) {
  const [showDispute, setShowDispute] = useState(false);
  const { data: w } = useKidById(b.winner_kid_id);
  const { data: l } = useKidById(b.loser_kid_id);
  if (!w || !l) return null;

  const accent = STATUS_COLOR[b.status];

  return (
    <div
      className="bx-card mb-2"
      style={{
        padding: 12,
        borderLeft: `3px solid ${accent}`,
        opacity: b.status === 'voided' ? 0.6 : 1,
      }}
    >
      <div className="flex items-center gap-3">
        <Avatar kid={w} size={36} />
        <div className="flex-1">
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            <strong>{w.display_name}</strong>{' '}
            <span style={{ color: 'var(--bx-mute)' }}>besiegt</span>{' '}
            <strong>{l.display_name}</strong>
          </div>
          <div className="bx-mono mt-0.5 flex items-center gap-1.5" style={{ fontSize: 10, color: 'var(--bx-mute-2)' }}>
            <span
              className="bx-chip"
              style={{
                background: `${accent}1A`,
                color: accent,
                padding: '2px 6px',
              }}
            >
              {b.status === 'pending' ? '⏳' : b.status === 'confirmed' ? '✓' : '🚩'}{' '}
              {STATUS_LABEL[b.status]}
            </span>
          </div>
        </div>
        <div className="bx-display" style={{ fontSize: 22 }}>
          {b.winner_score}<span style={{ color: 'var(--bx-mute-2)' }}>–</span>{b.loser_score}
        </div>
      </div>
      {b.status === 'pending' && (
        <div className="flex justify-end mt-1">
          {/* HIG 44pt minimum: pad the otherwise tiny "stimmt nicht" link
              up so it's tappable. Visual stays small with mono caps. */}
          <button
            onClick={() => setShowDispute(true)}
            aria-label="Diese Schlacht melden"
            className="bx-mono"
            style={{
              minHeight: 44,
              padding: '0 8px',
              fontSize: 10,
              color: 'var(--bx-crimson)',
              cursor: 'pointer',
              background: 'transparent',
              border: 'none',
            }}
          >
            🚩 stimmt nicht
          </button>
        </div>
      )}
      {showDispute && (
        <DisputeSheet battleId={b.id} onClose={() => setShowDispute(false)} />
      )}
    </div>
  );
}
