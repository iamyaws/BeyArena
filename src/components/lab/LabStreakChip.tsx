// LabStreakChip — pill in the LabTab top-right showing the session streak.
// Rendered only when streakEnabled is true. Pulses on increment (skipped
// under prefers-reduced-motion).

import { useLabSession } from '../../stores/lab-session';

export function LabStreakChip() {
  const { streak, streakEnabled } = useLabSession();
  if (!streakEnabled || streak <= 0) return null;
  return (
    <div
      className="bx-mono"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 10px',
        borderRadius: 999,
        background: 'rgba(253,224,71,0.12)',
        border: '1px solid rgba(253,224,71,0.4)',
        color: 'var(--bx-yellow)',
        fontSize: 11,
        letterSpacing: '0.12em',
      }}
      aria-label={`Streak: ${streak} Siege in Folge`}
    >
      🔥 {streak}
    </div>
  );
}
