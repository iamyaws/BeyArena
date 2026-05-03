// src/lib/labTrainerBadges.ts
// Per-device, day-scoped record of which Lab trainers the kid has beaten
// today. Resets implicitly: on read we filter to today's date, and entries
// from earlier days are cleaned up. localStorage only — no DB.

const STORAGE_KEY = 'beyarena.lab.trainersBeatenToday';

function todayKey(): string {
  // YYYY-MM-DD in local time. Avoids UTC midnight surprise for late-evening play.
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function read(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    // Garbage-collect: drop entries not from today.
    const today = todayKey();
    const filtered: Record<string, string> = {};
    for (const [id, date] of Object.entries(parsed)) {
      if (date === today) filtered[id] = date;
    }
    return filtered;
  } catch {
    return {};
  }
}

function write(map: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota or private mode; non-essential */
  }
}

export function markTrainerBeaten(trainerId: string): void {
  const map = read();
  map[trainerId] = todayKey();
  write(map);
}

export function getTrainersBeatenToday(): Set<string> {
  return new Set(Object.keys(read()));
}
