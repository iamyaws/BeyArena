// LabBattleScreen — full-screen overlay. Calls labEngine.resolveBattle, then
// runs a Motion choreography keyed off the Outcome. Reduced-motion users get
// a static crossfade. On animation end, raises the recap card.
//
// Spec section 5.4.

import { useEffect, useMemo, useState } from 'react';
import { playLab } from '../../lib/labSound';
import { vibrate } from '../../lib/labHaptics';
import { motion, useReducedMotion } from 'motion/react';
import { useAllBeys } from '../../hooks/useBeys';
import { useCrewKidsWithPrimary } from '../../hooks/useCrewKidsWithPrimary';
import { useLabSession } from '../../stores/lab-session';
import { getTrainer } from '../../data/labTrainers';
import { resolveBattle, type Outcome, type OpponentKind } from '../../lib/labEngine';
import { Bey } from '../bey/Bey';
import { beyVisualFromDb } from '../bey/beyVisual';
import type { Bey as DbBey } from '../../lib/types';

interface Props {
  myBeyId: string;
  opponent: OpponentKind;
  /** Called when choreography + recap finish. */
  onComplete: (outcome: Outcome, oppBey: DbBey) => void;
  /** Called when user taps "Anderes" or backs out. */
  onCancel: () => void;
}

export function LabBattleScreen({ myBeyId, opponent, onComplete, onCancel }: Props) {
  const { data: beys = [] } = useAllBeys();
  const { data: crew = [] } = useCrewKidsWithPrimary();
  const reducedMotion = useReducedMotion();
  const { recordWin, recordLoss, soundEnabled } = useLabSession();

  // Resolve opponent bey at mount time, using a fresh seed per fight.
  const seed = useMemo(() => Date.now() ^ Math.floor(Math.random() * 0xffff), []);

  const myBey = beys.find((b) => b.id === myBeyId) ?? null;
  const oppBey = useMemo<DbBey | null>(() => {
    if (beys.length === 0) return null;
    if (opponent.kind === 'wild') {
      if (opponent.beyId) return beys.find((b) => b.id === opponent.beyId) ?? null;
      return beys[Math.floor(Math.random() * beys.length)] ?? null;
    }
    if (opponent.kind === 'trainer') return getTrainer(opponent.trainerId).pick(beys);
    if (opponent.kind === 'crew') {
      const k = crew.find((c) => c.id === opponent.kidId);
      return k?.primary_bey ?? null;
    }
    return null;
  }, [beys, crew, opponent]);

  const outcome = useMemo<Outcome | null>(() => {
    if (!myBey || !oppBey) return null;
    return resolveBattle(myBey, oppBey, seed);
  }, [myBey, oppBey, seed]);

  const [phase, setPhase] = useState<'launch' | 'closing' | 'clash' | 'result' | 'done'>('launch');

  useEffect(() => {
    if (!outcome || !oppBey) return;
    if (reducedMotion) {
      // Compress to a 200ms crossfade.
      const t = setTimeout(() => {
        outcome.winner === 'me' ? recordWin() : recordLoss();
        onComplete(outcome, oppBey);
      }, 200);
      return () => clearTimeout(t);
    }
    if (soundEnabled) playLab('launch');
    const seq = [
      { p: 'launch' as const, ms: 300 },
      { p: 'closing' as const, ms: 1500 },
      { p: 'clash' as const, ms: 1800 },
      { p: 'result' as const, ms: 1200 },
    ];
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let acc = 0;
    for (const s of seq) {
      acc += s.ms;
      timeouts.push(setTimeout(() => {
        if (s.p === 'closing') {
          setPhase('clash');
          // 3 clash beats spaced 600ms apart
          if (soundEnabled) {
            playLab('clash');
            setTimeout(() => playLab('clash'), 600);
            setTimeout(() => playLab('clash'), 1200);
          }
        } else if (s.p === 'clash') {
          setPhase('result');
          vibrate(8);
          setTimeout(() => vibrate(8), 600);
          setTimeout(() => vibrate(8), 1200);
          if (soundEnabled && outcome.winner === 'me') playLab('fanfare');
          if (outcome.winner === 'me') {
            setTimeout(() => vibrate(25), 1400);
          }
        }
      }, acc));
    }
    timeouts.push(setTimeout(() => {
      outcome.winner === 'me' ? recordWin() : recordLoss();
      onComplete(outcome, oppBey);
    }, acc + 200));
    return () => timeouts.forEach((t) => clearTimeout(t));
  }, [outcome, oppBey, reducedMotion, recordWin, recordLoss, onComplete, soundEnabled]);

  if (!myBey || !oppBey || !outcome) {
    return (
      <div className="bx fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'var(--bx-ink)' }}>
        <div className="bx-mono" style={{ color: 'var(--bx-mute)' }}>Lade...</div>
      </div>
    );
  }

  const myVisual = beyVisualFromDb(myBey);
  const oppVisual = beyVisualFromDb(oppBey);
  const winnerIsMe = outcome.winner === 'me';

  // Position transforms per phase
  const myX = phase === 'launch' ? -80 : phase === 'closing' || phase === 'clash' ? -20 : winnerIsMe ? -20 : -20;
  const oppX = phase === 'launch' ? 80 : phase === 'closing' || phase === 'clash' ? 20 : winnerIsMe ? 20 : 20;
  const myDrop = phase === 'result' && !winnerIsMe ? 30 : 0;
  const oppDrop = phase === 'result' && winnerIsMe ? 30 : 0;
  const myRotate = phase === 'result' && !winnerIsMe ? 25 : 0;
  const oppRotate = phase === 'result' && winnerIsMe ? -25 : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Lab Kampf"
      className="bx fixed inset-0 z-50 flex flex-col items-center"
      style={{
        background: 'radial-gradient(120% 80% at 50% 30%, rgba(220,38,38,0.10), transparent 60%), var(--bx-ink)',
        paddingTop: 'max(20px, env(safe-area-inset-top))',
      }}
      onClick={onCancel}
    >
      <div className="bx-eyebrow" style={{ marginTop: 12 }}>LAB · KAMPF</div>

      <div
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 420,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.04), transparent 70%)',
            border: '1px solid rgba(255,255,255,0.08)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <motion.div
            animate={{ x: myX, y: myDrop, rotate: myRotate }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{ position: 'absolute', top: '50%', left: '30%', transform: 'translate(-50%, -50%)' }}
          >
            <Bey bey={myVisual} size={96} spin={phase !== 'result' || winnerIsMe} />
          </motion.div>
          <motion.div
            animate={{ x: oppX, y: oppDrop, rotate: oppRotate }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{ position: 'absolute', top: '50%', right: '30%', transform: 'translate(50%, -50%)' }}
          >
            <Bey bey={oppVisual} size={96} spin={phase !== 'result' || !winnerIsMe} />
          </motion.div>

          {phase === 'clash' && (
            <motion.div
              initial={{ opacity: 0.8, scale: 0.4 }}
              animate={{ opacity: 0, scale: 1.4 }}
              transition={{ duration: 0.6, repeat: 2 }}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at 50% 50%, rgba(253,224,71,0.6), transparent 50%)',
              }}
            />
          )}

          {phase === 'result' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute',
                inset: 0,
                background: winnerIsMe
                  ? 'radial-gradient(circle at 50% 50%, rgba(34,197,94,0.45), transparent 70%)'
                  : 'radial-gradient(circle at 50% 50%, rgba(220,38,38,0.45), transparent 70%)',
              }}
            />
          )}
        </div>
      </div>

      <div className="bx-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        Tipp irgendwo zum Abbrechen
      </div>
    </div>
  );
}
