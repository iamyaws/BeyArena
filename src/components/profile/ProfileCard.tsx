// ProfileCard — thin re-export of PlayerCard with a simpler signature.
// Kept for backward compatibility; new code should import PlayerCard
// directly for the full set of props (wins/losses/streak/team).

import type { Kid } from '../../lib/types';
import { PlayerCard } from './PlayerCard';

export function ProfileCard({ kid }: { kid: Kid }) {
  return <PlayerCard kid={kid} />;
}
