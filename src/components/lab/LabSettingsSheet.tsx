// LabSettingsSheet — gear icon in LabTab top-right opens this. Toggles for
// streak, sound, and a "FTUE nochmal zeigen" link (mostly QA). Spec section 5.8.

import { useLabSession } from '../../stores/lab-session';
import { resetFtue } from './LabFTUE';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function LabSettingsSheet({ open, onClose }: Props) {
  const { streakEnabled, soundEnabled, setStreakEnabled, setSoundEnabled } = useLabSession();

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Lab Einstellungen"
      onClick={onClose}
      className="fixed inset-0 z-40 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.55)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bx-card"
        style={{
          borderRadius: '20px 20px 0 0',
          padding: '18px 18px max(22px, calc(env(safe-area-inset-bottom) + 12px))',
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
          <div className="bx-eyebrow">Einstellungen</div>
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="bx-btn bx-btn-ghost"
            style={{ padding: '6px 10px', fontSize: 12 }}
          >
            Schließen
          </button>
        </div>

        <Toggle label="Streak-Zähler" value={streakEnabled} onChange={setStreakEnabled} />
        <Toggle label="Sound" value={soundEnabled} onChange={setSoundEnabled} />

        <button
          onClick={() => {
            resetFtue();
            onClose();
            // Force a reload so LabTab remounts and shows FTUE again.
            window.location.reload();
          }}
          className="bx-btn bx-btn-ghost"
          style={{ width: '100%', padding: 12, fontSize: 12, marginTop: 12 }}
        >
          Erste-Schritte nochmal zeigen
        </button>
      </div>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex items-center justify-between"
      style={{
        width: '100%',
        padding: '12px 0',
        background: 'transparent',
        border: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        cursor: 'pointer',
      }}
    >
      <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>{label}</span>
      <span
        className="bx-mono"
        style={{
          fontSize: 11,
          color: value ? 'var(--bx-yellow)' : 'var(--bx-mute)',
          letterSpacing: '0.16em',
        }}
      >
        {value ? 'AN' : 'AUS'}
      </span>
    </button>
  );
}
