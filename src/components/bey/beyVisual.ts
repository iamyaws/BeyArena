// Helpers for going from a real DB bey row to the visual color pair the
// design's <Bey/> + <BigBey/> components want. The DB schema has no color
// fields on beys, so we derive them from the bey type. Kept separate from
// Bey.tsx so HMR/fast-refresh stays happy.

import type { Bey as DbBey } from '../../lib/types';
import type { BeyVisual } from './Bey';

const TYPE_PALETTE: Record<NonNullable<DbBey['type']>, [string, string]> = {
  attack: ['#DC2626', '#FDE047'],
  defense: ['#2563EB', '#FDE047'],
  stamina: ['#7C3AED', '#06B6D4'],
  balance: ['#F97316', '#DC2626'],
};

const FALLBACK: [string, string] = ['#DC2626', '#FDE047'];

/**
 * Turn a DB bey row into the (color1, color2) pair our <Bey/> SVG draws.
 * Returns null if `bey` is null/undefined so callers can fall back to the
 * design's "?" placeholder.
 */
export function beyVisualFromDb(bey: DbBey | null | undefined): BeyVisual | null {
  if (!bey) return null;
  const [c1, c2] = bey.type ? TYPE_PALETTE[bey.type] : FALLBACK;
  return { id: bey.id, color1: c1, color2: c2 };
}
