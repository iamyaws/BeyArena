// src/pages/HomePage.tsx
import { Link } from 'react-router-dom';
import { useCurrentKid, useAllKids } from '../hooks/useKid';
import { useFeed } from '../hooks/useBattles';

export function HomePage() {
  const { data: kid } = useCurrentKid();
  const { data: kids = [] } = useAllKids();
  const { data: feed = [] } = useFeed('all');
  if (!kid) return null;
  const aboveMe = kids.filter((k) => k.elo > kid.elo).sort((a, b) => a.elo - b.elo);
  const next = aboveMe[0];
  const gap = next ? next.floor - kid.floor : 0;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-bx-crimson flex items-center justify-center font-bold text-xl">
          {kid.display_name[0]}
        </div>
        <div className="flex-1">
          <div className="text-lg font-bold">Hi {kid.display_name}!</div>
          <div className="text-sm opacity-60">Etage {kid.floor} von 100</div>
        </div>
      </div>

      <Link
        to="/log"
        className="block w-full p-4 bg-gradient-to-r from-bx-yellow via-orange-500 to-bx-crimson text-black font-bold rounded text-center text-lg"
      >
        ⚔ Was war heute?
      </Link>

      <div>
        <div className="text-xs uppercase tracking-widest opacity-50 mb-2">
          Was geht ab?
        </div>
        {feed.slice(0, 3).map((b) => (
          <div
            key={b.id}
            className="text-sm py-2 opacity-80 border-b border-zinc-800"
          >
            {b.status === 'confirmed' ? '✓' : b.status === 'pending' ? '⏳' : '🚩'}{' '}
            Schlacht eingetragen
          </div>
        ))}
      </div>

      {next && (
        <div className="bg-bx-cobalt/20 border-l-2 border-bx-cobalt p-3 rounded text-sm">
          👁 {next.display_name} ist nur{' '}
          <strong>
            {gap} Etage{gap === 1 ? '' : 'n'}
          </strong>{' '}
          über dir — schaffst du sie?
        </div>
      )}
    </div>
  );
}
