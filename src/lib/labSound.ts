// src/lib/labSound.ts
// Tiny audio helper for the Battle Lab. HTMLAudioElements are cached + replayed
// from start on each call. No-ops gracefully if files are missing or the user
// has muted via Lab settings. Designed to fail silently — if a kid plays in a
// browser that blocks autoplay, the lack of sound is acceptable degradation.
//
// Default state is muted (see lab-session store). This file does not check
// the mute toggle itself; callers (LabBattleScreen, LabTab) gate before
// invoking play().

const cache = new Map<string, HTMLAudioElement>();

function get(name: 'launch' | 'clash' | 'fanfare'): HTMLAudioElement | null {
  try {
    let el = cache.get(name);
    if (!el) {
      el = new Audio(`/sounds/lab/${name}.mp3`);
      el.preload = 'auto';
      cache.set(name, el);
    }
    return el;
  } catch {
    return null;
  }
}

export function playLab(name: 'launch' | 'clash' | 'fanfare'): void {
  const el = get(name);
  if (!el) return;
  try {
    el.currentTime = 0;
    void el.play().catch(() => {
      /* autoplay blocked; silently fail */
    });
  } catch {
    /* element constructor may have failed; silently fail */
  }
}
