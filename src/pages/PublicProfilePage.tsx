// src/pages/PublicProfilePage.tsx
import { useParams } from 'react-router-dom';
import { useKidById } from '../hooks/useKid';
import { ProfileCard } from '../components/profile/ProfileCard';

export function PublicProfilePage() {
  const { id } = useParams();
  const { data: kid } = useKidById(id ?? null);
  if (!kid) return <div className="p-6 opacity-60">Lade…</div>;
  return (
    <div className="p-4">
      <ProfileCard kid={kid} />
    </div>
  );
}
