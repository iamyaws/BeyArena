// LabFTUE — 3-frame walkthrough on first Lab open. Swipeable; "Überspringen"
// link top-right. Sets localStorage flag on dismiss. Spec section 5.7.

import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

const STORAGE_KEY = 'beyarena.lab.ftueDone';

const FRAMES = [
  { title: 'Wähle deinen Bey', sub: 'Tippe links auf den Slot.', emoji: '🎯' },
  { title: 'Wähle deinen Gegner', sub: 'Wild oder ein Crew-Freund.', emoji: '⚔' },
  { title: 'Schau zu — wer gewinnt?', sub: 'Animation, Recap, Nochmal.', emoji: '🏁' },
];

interface Props {
  onComplete: () => void;
}

export function LabFTUE({ onComplete }: Props) {
  const [frame, setFrame] = useState(0);
  const reducedMotion = useReducedMotion();

  function next() {
    if (frame < FRAMES.length - 1) {
      setFrame(frame + 1);
    } else {
      finish();
    }
  }

  function finish() {
    localStorage.setItem(STORAGE_KEY, '1');
    onComplete();
  }

  const f = FRAMES[frame];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={f.title}
      className="bx fixed inset-0 z-[80] flex flex-col items-center justify-center"
      style={{ background: 'var(--bx-ink)', cursor: 'pointer' }}
      onClick={next}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          finish();
        }}
        className="bx-mono"
        style={{
          position: 'absolute',
          top: 'max(20px, env(safe-area-inset-top))',
          right: 18,
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.55)',
          fontSize: 11,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        Überspringen
      </button>

      <motion.div
        key={frame}
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: reducedMotion ? 0.15 : 0.3 }}
        style={{ textAlign: 'center', padding: 24, maxWidth: 320 }}
      >
        <div style={{ fontSize: 72, marginBottom: 18 }}>{f.emoji}</div>
        <div className="bx-display" style={{ fontSize: 28, lineHeight: 1.1, marginBottom: 12 }}>
          {f.title}
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>{f.sub}</div>
      </motion.div>

      <div
        style={{
          position: 'absolute',
          bottom: 'max(40px, calc(env(safe-area-inset-bottom) + 24px))',
          display: 'flex',
          gap: 6,
        }}
      >
        {FRAMES.map((_, i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: i === frame ? 'var(--bx-yellow)' : 'rgba(255,255,255,0.2)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function isFtueDone(): boolean {
  return localStorage.getItem(STORAGE_KEY) === '1';
}

export function resetFtue(): void {
  localStorage.removeItem(STORAGE_KEY);
}
