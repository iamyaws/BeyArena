// src/components/profile/ProfileCard.tsx
import type { Kid } from '../../lib/types';

export function ProfileCard({ kid }: { kid: Kid }) {
  return (
    <div className="bg-gradient-to-b from-zinc-900 to-black border border-bx-yellow/30 rounded-xl p-5 text-center">
      <div className="text-xs tracking-widest opacity-60 mb-2">⚔ ETAGE {kid.floor}</div>
      <div className="w-20 h-20 mx-auto rounded-full bg-bx-crimson flex items-center justify-center text-3xl font-bold mb-2">
        {kid.display_name[0]}
      </div>
      <div className="text-2xl font-bold tracking-wider">
        {kid.display_name.toUpperCase()}
      </div>
      <div className="text-sm opacity-60 mt-1">ELO {kid.elo}</div>
    </div>
  );
}
