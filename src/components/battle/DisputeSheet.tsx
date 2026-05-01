// DisputeSheet — bottom sheet for "stimmt nicht".
// Apple HIG bottom-sheet treatment: backdrop tap dismisses, ESC dismisses
// on desktop, drag-handle visible at top, safe-area padding for the home
// indicator, 44pt tap targets, kid-friendly error mapping.

import { useEffect, useState } from 'react';
import { useDisputeBattle } from '../../hooks/useDispute';

const REASONS: Array<{ code: string; emoji: string; label: string }> = [
  { code: 'wrong_score', emoji: '📊', label: 'Score stimmt nicht' },
  { code: 'didnt_happen', emoji: '👻', label: "Das gab's gar nicht" },
  { code: 'wrong_opponent', emoji: '🔄', label: 'Falsche Person' },
  { code: 'wrong_bey', emoji: '🎯', label: 'Falscher Bey' },
  { code: 'other', emoji: '…', label: 'Was anderes' },
];

export function DisputeSheet({ battleId, onClose }: { battleId: string; onClose: () => void }) {
  const dispute = useDisputeBattle();
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');

  // ESC dismiss on desktop. Mobile uses backdrop tap or "Doch nicht".
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit() {
    if (!reason) return;
    try {
      await dispute.mutateAsync({
        battle_id: battleId,
        reason_code: reason,
        note: note.slice(0, 200),
      });
      // Per HIG: judicious haptic on success moments — confirms the flag
      // landed even if the kid's already looking away.
      try {
        if (typeof navigator.vibrate === 'function') {
          navigator.vibrate(15);
        }
      } catch {
        /* not all browsers honor this; non-essential */
      }
      onClose();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Dispute failed:', e);
      // Error stays visible inline below. User can retry.
    }
  }

  // Map known error shapes to kid-friendly copy per HIG.
  let errorMsg: string | null = null;
  if (dispute.isError) {
    const raw = dispute.error instanceof Error ? dispute.error.message : '';
    if (/Failed to fetch|Load failed|NetworkError|fetch/i.test(raw)) {
      errorMsg = 'Kein Internet. Versuch\'s gleich nochmal.';
    } else if (/JWT|expired|exp\b/i.test(raw)) {
      errorMsg = 'Du bist zu lange weg gewesen. Scan deine Karte nochmal.';
    } else if (/permission|denied|RLS|auth/i.test(raw)) {
      errorMsg = 'Das ging gerade nicht. Frag Marc.';
    } else {
      errorMsg = 'Hat nicht geklappt. Tipp nochmal.';
    }
  }

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Schlacht melden"
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.7)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full"
        style={{
          background: '#13141b',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px 24px 0 0',
          // Bottom padding respects iPhone home indicator via
          // safe-area-inset-bottom.
          padding: '20px 18px max(20px, calc(env(safe-area-inset-bottom) + 12px))',
        }}
      >
        {/* Drag handle — HIG bottom-sheet affordance. */}
        <div
          style={{
            width: 40,
            height: 4,
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 999,
            margin: '0 auto 14px',
          }}
        />

        <h3
          className="bx-display"
          style={{
            fontSize: 22,
            marginBottom: 12,
            letterSpacing: '0.02em',
          }}
        >
          Was stimmt nicht?
        </h3>

        {REASONS.map((r) => {
          const sel = reason === r.code;
          return (
            <button
              key={r.code}
              onClick={() => setReason(r.code)}
              aria-pressed={sel}
              className="w-full text-left flex items-center"
              style={{
                minHeight: 48,
                padding: '10px 14px',
                marginBottom: 6,
                gap: 12,
                borderRadius: 12,
                border: `1px solid ${sel ? 'rgba(220,38,38,0.5)' : 'rgba(255,255,255,0.06)'}`,
                background: sel ? 'rgba(220,38,38,0.18)' : '#181a22',
                color: '#fff',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 18 }}>{r.emoji}</span>
              <span>{r.label}</span>
            </button>
          );
        })}

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Was war wirklich? (egal)"
          maxLength={200}
          rows={2}
          className="w-full"
          style={{
            marginTop: 8,
            padding: 10,
            borderRadius: 10,
            background: '#181a22',
            border: '1px solid rgba(255,255,255,0.06)',
            color: '#fff',
            fontSize: 13,
            resize: 'none',
          }}
        />

        <p
          className="bx-mono"
          style={{
            marginTop: 10,
            fontSize: 11,
            color: 'var(--bx-yellow)',
            lineHeight: 1.4,
          }}
        >
          Wenn du das meldest, zählt die Schlacht sofort nicht mehr.
        </p>

        {errorMsg && (
          <div
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 10,
              background: 'rgba(220,38,38,0.12)',
              border: '1px solid rgba(220,38,38,0.3)',
              fontSize: 12,
              lineHeight: 1.4,
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            {errorMsg}
          </div>
        )}

        <div className="flex" style={{ gap: 8, marginTop: 14 }}>
          <button
            onClick={onClose}
            className="bx-btn bx-btn-ghost"
            style={{ flex: 1, minHeight: 48, fontSize: 14 }}
          >
            Doch nicht
          </button>
          <button
            onClick={submit}
            disabled={!reason || dispute.isPending}
            className="bx-btn bx-btn-crimson"
            style={{
              flex: 1,
              minHeight: 48,
              fontSize: 14,
              opacity: !reason || dispute.isPending ? 0.4 : 1,
              cursor: !reason || dispute.isPending ? 'not-allowed' : 'pointer',
            }}
          >
            {dispute.isPending ? 'Sende…' : '🚩 Melden'}
          </button>
        </div>
      </div>
    </div>
  );
}
