// src/lib/labHaptics.ts
// navigator.vibrate wrapper. Mirrors the safety net in LogBattleConfirm.tsx —
// guarded with try/catch + typeof check; iOS Safari 16.4+ + most Android honor
// it; everything else silently no-ops.

export function vibrate(ms: number): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(ms);
    }
  } catch {
    /* not all browsers honor this; non-essential */
  }
}
