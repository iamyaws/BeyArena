// ScoreInput — Step 2 of the log-battle flow.
// VS card + win/loss toggle + score steppers + quick presets.
// Visual layout from .design-handoff/project/match.jsx (step === 1).

import { useState } from 'react';
import { useCurrentKid, useKidById } from '../../hooks/useKid';
import { useDraftBattle } from '../../stores/draft-battle';
import { Avatar } from '../ui/Avatar';

export function ScoreInput() {
  const { setStep, patch } = useDraftBattle();
  const opponentKidId = useDraftBattle((s) => s.opponent_kid_id);
  const { data: me } = useCurrentKid();
  const { data: opp } = useKidById(opponentKidId ?? null);

  const [iWon, setIWon] = useState(true);
  const [my, setMy] = useState(3);
  const [oppScore, setOppScore] = useState(1);

  function next() {
    patch({ i_won: iWon, my_score: my, opp_score: oppScore });
    setStep('beys');
  }

  if (!me || !opp) return null;
  const disabled = my === oppScore;

  return (
    <div style={{ paddingBottom: 110 }}>
      {/* header */}
      <div style={{ padding: '12px 18px 0' }}>
        <div className="bx-eyebrow flex items-center gap-1.5">
          <span>Schlacht eintragen</span>
          <span>·</span>
          <span>2/4</span>
        </div>
        <div
          className="bx-display"
          style={{ fontSize: 26, marginTop: 8, lineHeight: 1 }}
        >
          Wer hat gewonnen?
        </div>
      </div>

      {/* VS card */}
      <div style={{ padding: '18px 18px 0' }}>
        <div
          className="bx-card grid items-center"
          style={{
            padding: 16,
            gridTemplateColumns: '1fr auto 1fr',
            gap: 12,
            background: 'linear-gradient(180deg, #14151c, #0c0d12)',
          }}
        >
          <div className="text-center">
            <div className="flex justify-center">
              <Avatar kid={me} size={52} />
            </div>
            <div
              className="bx-display"
              style={{ fontSize: 14, marginTop: 8 }}
            >
              {me.display_name.toUpperCase()}
            </div>
            <div
              className="bx-mono"
              style={{ fontSize: 9, color: 'var(--bx-mute-2)' }}
            >
              DU
            </div>
          </div>
          <div
            className="bx-display bx-yellow-glow"
            style={{ fontSize: 28, color: 'var(--bx-yellow)' }}
          >
            VS
          </div>
          <div className="text-center">
            <div className="flex justify-center">
              <Avatar kid={opp} size={52} />
            </div>
            <div
              className="bx-display"
              style={{ fontSize: 14, marginTop: 8 }}
            >
              {opp.display_name.toUpperCase()}
            </div>
            <div
              className="bx-mono"
              style={{ fontSize: 9, color: 'var(--bx-mute-2)' }}
            >
              ETG {opp.floor}
            </div>
          </div>
        </div>
      </div>

      {/* Win / loss */}
      <div
        className="grid"
        style={{
          padding: '18px 18px 0',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
        }}
      >
        <button
          onClick={() => setIWon(true)}
          className="text-center"
          style={{
            padding: '18px 12px',
            borderRadius: 14,
            border: `1px solid ${iWon ? '#22c55e' : 'rgba(255,255,255,0.08)'}`,
            background: iWon ? 'rgba(34,197,94,0.15)' : '#13141b',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: 22 }}>🏆</div>
          <div
            className="bx-display"
            style={{
              fontSize: 14,
              marginTop: 4,
              color: iWon ? '#22c55e' : '#fff',
            }}
          >
            ICH HAB GEWONNEN
          </div>
        </button>
        <button
          onClick={() => setIWon(false)}
          className="text-center"
          style={{
            padding: '18px 12px',
            borderRadius: 14,
            border: `1px solid ${!iWon ? 'var(--bx-crimson)' : 'rgba(255,255,255,0.08)'}`,
            background: !iWon ? 'rgba(220,38,38,0.15)' : '#13141b',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: 22 }}>😤</div>
          <div
            className="bx-display"
            style={{
              fontSize: 14,
              marginTop: 4,
              color: !iWon ? 'var(--bx-crimson)' : '#fff',
            }}
          >
            ICH HAB VERLOREN
          </div>
        </button>
      </div>

      {/* Score */}
      <div style={{ padding: '18px 18px 0' }}>
        <div className="bx-eyebrow mb-2">Punkte</div>
        <div className="bx-card" style={{ padding: 16 }}>
          <div
            className="grid items-center"
            style={{ gridTemplateColumns: '1fr auto 1fr', gap: 12 }}
          >
            <Stepper
              label="Ich"
              value={my}
              setValue={setMy}
              accent={iWon}
            />
            <div
              className="bx-display"
              style={{ fontSize: 22, color: 'var(--bx-mute-2)' }}
            >
              —
            </div>
            <Stepper
              label={opp.display_name}
              value={oppScore}
              setValue={setOppScore}
              accent={!iWon}
            />
          </div>
          <div className="flex" style={{ gap: 6, marginTop: 12 }}>
            {[
              [3, 0],
              [3, 1],
              [3, 2],
              [5, 3],
            ].map(([a, b]) => (
              <button
                key={`${a}-${b}`}
                aria-label={`Score ${a} zu ${b}`}
                onClick={() => {
                  if (iWon) {
                    setMy(a);
                    setOppScore(b);
                  } else {
                    setMy(b);
                    setOppScore(a);
                  }
                }}
                style={{
                  flex: 1,
                  // 44pt min tap height per HIG — was 30px (8+8+text).
                  minHeight: 44,
                  padding: 0,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#fff',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {a}-{b}
              </button>
            ))}
          </div>
        </div>
      </div>

      <FooterCTA onClick={next} disabled={disabled}>
        Weiter →
      </FooterCTA>
    </div>
  );
}

// 44×44 minimum tap target per HIG. The score steppers were the worst
// offender on this flow — easy mis-tap when adjusting kid scores.
const stepperBtnStyle = {
  width: 44,
  height: 44,
  borderRadius: 12,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 20,
  fontFamily: 'Saira Stencil One, sans-serif',
} as const;

function Stepper({
  label,
  value,
  setValue,
  accent,
}: {
  label: string;
  value: number;
  setValue: (n: number) => void;
  accent?: boolean;
}) {
  return (
    <div className="text-center">
      <div className="bx-eyebrow" style={{ marginBottom: 6 }}>
        {label}
      </div>
      <div className="flex items-center justify-center" style={{ gap: 8 }}>
        <button
          aria-label={`${label} verringern`}
          onClick={() => setValue(Math.max(0, value - 1))}
          style={stepperBtnStyle}
        >
          −
        </button>
        <div
          className="bx-display"
          style={{
            fontSize: 38,
            minWidth: 36,
            textAlign: 'center',
            color: accent ? 'var(--bx-yellow)' : '#fff',
          }}
        >
          {value}
        </div>
        <button
          aria-label={`${label} erhöhen`}
          onClick={() => setValue(value + 1)}
          style={stepperBtnStyle}
        >
          +
        </button>
      </div>
    </div>
  );
}

function FooterCTA({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="fixed left-0 right-0 bottom-0"
      style={{
        // Bottom padding respects iPhone home indicator via
        // safe-area-inset-bottom.
        padding: '14px 18px max(22px, calc(env(safe-area-inset-bottom) + 12px))',
        background: 'linear-gradient(to top, var(--bx-ink) 60%, transparent)',
        zIndex: 5,
      }}
    >
      <button
        onClick={onClick}
        disabled={disabled}
        className="bx-btn bx-btn-yellow"
        style={{
          width: '100%',
          padding: '16px',
          fontSize: 16,
          opacity: disabled ? 0.4 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {children}
      </button>
    </div>
  );
}
