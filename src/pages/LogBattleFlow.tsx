// LogBattleFlow — 4-step "Schlacht eintragen" flow.
// Wraps the existing 4 step components (OpponentPicker, ScoreInput, BeyPicker,
// LogBattleConfirm) in the design's MatchScreen shell: top bar with back button
// + timestamp + close, plus a step-dots progress indicator.
//
// Visual layout from .design-handoff/project/match.jsx (top bar + StepDots).

import { useNavigate } from 'react-router-dom';
import { useDraftBattle } from '../stores/draft-battle';
import { OpponentPicker } from '../components/battle/OpponentPicker';
import { ScoreInput } from '../components/battle/ScoreInput';
import { BeyPicker } from '../components/battle/BeyPicker';
import { LogBattleConfirm } from '../components/battle/LogBattleConfirm';

const STEP_ORDER = ['opponent', 'score', 'beys', 'confirm'] as const;
type Step = (typeof STEP_ORDER)[number];

function nowLabel() {
  const d = new Date();
  const day = d.toDateString() === new Date().toDateString() ? 'Heute' : '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} · ${hh}:${mm}`;
}

export function LogBattleFlow() {
  const step = useDraftBattle((s) => s.step);
  const setStep = useDraftBattle((s) => s.setStep);
  const reset = useDraftBattle((s) => s.reset);
  const nav = useNavigate();
  const stepIdx = STEP_ORDER.indexOf(step);

  function handleBack() {
    if (stepIdx === 0) {
      reset();
      nav('/');
      return;
    }
    const prev: Step = STEP_ORDER[stepIdx - 1] ?? 'opponent';
    setStep(prev);
  }

  function handleClose() {
    reset();
    nav('/');
  }

  return (
    <div
      className="bx min-h-screen w-full flex flex-col relative overflow-hidden"
      style={{ background: 'var(--bx-ink)' }}
    >
      {/* Top bar — top padding respects iPhone notch via safe-area-inset-top.
          Back/Close tap targets are 44×44 per HIG min. */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: 'max(12px, calc(env(safe-area-inset-top) + 6px)) 18px 12px',
        }}
      >
        <button
          onClick={handleBack}
          aria-label="Zurück"
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 18,
          }}
        >
          ←
        </button>
        <div
          className="bx-mono uppercase"
          style={{
            fontSize: 10,
            letterSpacing: '0.18em',
            color: 'var(--bx-mute-2)',
          }}
        >
          {nowLabel()}
        </div>
        <button
          onClick={handleClose}
          aria-label="Abbrechen"
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          ✕
        </button>
      </div>

      {/* Step dots */}
      <div
        className="flex"
        style={{ gap: 4, padding: '0 18px', marginTop: 6 }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 999,
              background:
                i <= stepIdx ? 'var(--bx-yellow)' : 'rgba(255,255,255,0.1)',
              transition: 'background 0.2s',
            }}
          />
        ))}
      </div>

      {/* Active step */}
      <div className="flex-1 overflow-y-auto">
        {step === 'opponent' && <OpponentPicker />}
        {step === 'score' && <ScoreInput />}
        {step === 'beys' && <BeyPicker />}
        {step === 'confirm' && <LogBattleConfirm />}
      </div>
    </div>
  );
}
