// src/components/tower/TowerView.tsx
import { useAllKids } from '../../hooks/useKid';
import { useSession } from '../../stores/session';
import { TowerRow } from './TowerRow';
import { useNavigate } from 'react-router-dom';
import type { Kid } from '../../lib/types';

type Zone = { label: string; min: number; max: number };

// Zones describe inclusive floor ranges shown between markers.
// The Peak (100) is rendered above all zones with a special highlight.
const ZONES: Zone[] = [
  { label: 'Approach Zone (91-99)', min: 91, max: 99 },
  { label: 'Mid Tower (50-90)', min: 50, max: 90 },
  // Floors 1-49 (Lower Floors) intentionally have no marker per spec —
  // they appear as a tail of occupied rows below the Mid Tower marker.
];

type Row =
  | { kind: 'zone'; key: string; label: string }
  | { kind: 'kid'; key: string; kid: Kid };

export function TowerView() {
  const { kid: me } = useSession();
  const { data: kids = [] } = useAllKids();
  const nav = useNavigate();

  // sort by floor desc, then elo desc — sparse list (only occupied floors)
  const sorted = [...kids].sort((a, b) => b.floor - a.floor || b.elo - a.elo);
  const peakKid = sorted.find((k) => k.floor === 100);

  const rows: Row[] = [];
  if (peakKid) rows.push({ kind: 'kid', key: peakKid.id, kid: peakKid });

  for (const zone of ZONES) {
    const kidsInZone = sorted.filter(
      (k) => k.id !== peakKid?.id && k.floor >= zone.min && k.floor <= zone.max,
    );
    rows.push({ kind: 'zone', key: `zone-${zone.label}`, label: zone.label });
    for (const k of kidsInZone) {
      rows.push({ kind: 'kid', key: k.id, kid: k });
    }
  }

  // Lower Floors (1-49) tail — kids below Mid Tower with no marker per spec.
  const lowerKids = sorted.filter(
    (k) => k.id !== peakKid?.id && k.floor < (ZONES[ZONES.length - 1]?.min ?? 1),
  );
  for (const k of lowerKids) {
    rows.push({ kind: 'kid', key: k.id, kid: k });
  }

  return (
    <div className="p-4 space-y-1">
      <h1 className="text-xl font-bold mb-3">Der Turm — The X</h1>
      {rows.map((r) =>
        r.kind === 'zone' ? (
          <div
            key={r.key}
            className="text-xs uppercase tracking-widest opacity-40 py-2 text-center"
          >
            — {r.label} —
          </div>
        ) : (
          <TowerRow
            key={r.key}
            kid={r.kid}
            isMe={r.kid.id === me?.id}
            onTap={() => nav(`/profil/${r.kid.id}`)}
          />
        ),
      )}
    </div>
  );
}
