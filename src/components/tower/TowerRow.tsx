// TowerRow — single floor entry in the tower view.
// Peak (floor 100) gets the gradient header treatment; "you" rows get a
// yellow tint; other rows are plain bx-card.

import type { Kid } from '../../lib/types';
import { Avatar } from '../ui/Avatar';

export function TowerRow({
  kid,
  isMe,
  onTap,
}: {
  kid: Kid;
  isMe: boolean;
  onTap: () => void;
}) {
  const peak = kid.floor === 100;

  if (peak) {
    return (
      <button
        onClick={onTap}
        className="w-full flex items-center"
        style={{
          gap: 12,
          padding: '14px 14px',
          borderRadius: 14,
          background:
            'linear-gradient(135deg, var(--bx-yellow), #F97316 60%, var(--bx-crimson))',
          color: '#07070A',
          marginBottom: 8,
          boxShadow: '0 12px 32px -10px rgba(253,224,71,0.55)',
        }}
      >
        <span
          className="bx-display"
          style={{ fontSize: 28, width: 44, textAlign: 'center' }}
        >
          {kid.floor}
        </span>
        <Avatar kid={kid} size={40} ring />
        <span className="flex-1 text-left">
          <span
            className="bx-display"
            style={{ fontSize: 18, letterSpacing: '0.04em' }}
          >
            {kid.display_name.toUpperCase()}
            {isMe && (
              <span
                className="bx-mono"
                style={{
                  marginLeft: 6,
                  fontSize: 10,
                  letterSpacing: '0.16em',
                }}
              >
                (DU)
              </span>
            )}
          </span>
          {kid.tagline && (
            <span
              className="block bx-mono italic"
              style={{ fontSize: 10, marginTop: 2 }}
            >
              &quot;{kid.tagline}&quot;
            </span>
          )}
        </span>
        <span
          className="bx-display flex items-center gap-1.5"
          style={{ fontSize: 14 }}
        >
          👑 The Peak
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={onTap}
      className="bx-card w-full flex items-center mb-2"
      style={{
        gap: 12,
        padding: 12,
        background: isMe
          ? 'linear-gradient(90deg, rgba(253,224,71,0.10), transparent)'
          : '#13141b',
        borderColor: isMe ? 'rgba(253,224,71,0.4)' : 'rgba(255,255,255,0.06)',
      }}
    >
      <span
        className="bx-display"
        style={{
          width: 36,
          textAlign: 'center',
          fontSize: 22,
          color: isMe ? 'var(--bx-yellow)' : '#fff',
        }}
      >
        {kid.floor}
      </span>
      <Avatar kid={kid} size={36} />
      <span className="flex-1 text-left">
        <span style={{ fontSize: 14, fontWeight: 700 }}>
          {kid.display_name}
          {isMe && (
            <span
              className="bx-mono"
              style={{
                marginLeft: 6,
                fontSize: 9,
                color: 'var(--bx-yellow)',
                letterSpacing: '0.16em',
              }}
            >
              DU
            </span>
          )}
        </span>
        <span
          className="block bx-mono"
          style={{
            fontSize: 9,
            color: 'var(--bx-mute-2)',
            marginTop: 2,
          }}
        >
          ELO {kid.elo}
        </span>
      </span>
    </button>
  );
}
