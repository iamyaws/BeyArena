// src/pages/ProfilePage.tsx
import { useCurrentKid } from '../hooks/useKid';
import { useFeed } from '../hooks/useBattles';
import { useSession } from '../stores/session';
import { ProfileCard } from '../components/profile/ProfileCard';
import { StatGrid } from '../components/profile/StatGrid';

export function ProfilePage() {
  const { kid: session } = useSession();
  const { data: kid } = useCurrentKid();
  const { data: battles = [] } = useFeed('mine');
  if (!kid || !session) return null;

  const wins = battles.filter(
    (b) => b.status === 'confirmed' && b.winner_kid_id === session.id,
  ).length;
  const losses = battles.filter(
    (b) => b.status === 'confirmed' && b.loser_kid_id === session.id,
  ).length;
  const total = wins + losses;
  const winrate = total > 0 ? Math.round((100 * wins) / total) : 0;

  return (
    <div className="p-4 space-y-4">
      <ProfileCard kid={kid} />
      <StatGrid
        stats={[
          { label: 'Kämpfe', value: total },
          { label: 'Gewonnen', value: `${winrate}%` },
          { label: 'Etage', value: kid.floor },
        ]}
      />
    </div>
  );
}
