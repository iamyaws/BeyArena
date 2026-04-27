// src/lib/floor.ts
// Per spec Section 6.2. King-of-the-hill (floor 100) is NOT applied here —
// it's resolved at query time based on crew rankings, not a pure function of ELO.

export function eloToFloor(elo: number): number {
  if (elo < 800) return 1;
  if (elo < 1700) {
    return Math.floor((elo - 800) / 10) + 1;
  }
  // 91-99 zone: 33 ELO per floor, capped at 99
  const floor = 91 + Math.floor((elo - 1700) / 33);
  return Math.min(floor, 99);
}

export function floorToMinElo(floor: number): number {
  if (floor <= 1) return 800;
  if (floor <= 90) return 800 + (floor - 1) * 10;
  if (floor <= 99) return 1700 + (floor - 91) * 33;
  return 1964 + 1; // floor 100 = top, no fixed elo threshold
}
