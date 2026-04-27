// TowerView — leaderboard view of the floors.
// Sparse: only occupied floors shown. The Peak (100) gets the gradient
// header treatment; ZONES are mono dividers between floor ranges.

import { useAllKids } from '../../hooks/useKid';
import { useSession } from '../../stores/session';
import { TowerRow } from './TowerRow';
import { useNavigate } from 'react-router-dom';
import type { Kid } from '../../lib/types';

type Zone = { label: string; min: number; max: number };

const ZONES: Zone[] = [
  { label: 'Approach Zone (91-99)', min: 91, max: 99 },
  { label: 'Mid Tower (50-90)', min: 50, max: 90 },
];

type Row =
  | { kind: 'zone'; key: string; label: string }
  | { kind: 'kid'; key: string; kid: Kid };

export function TowerView() {
  const { kid: me } = useSession();
  const { data: kids = [] } = useAllKids();
  const nav = useNavigate();

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

  const lowerKids = sorted.filter(
    (k) => k.id !== peakKid?.id && k.floor < (ZONES[ZONES.length - 1]?.min ?? 1),
  );
  for (const k of lowerKids) {
    rows.push({ kind: 'kid', key: k.id, kid: k });
  }

  return (
    <div className="bx min-h-screen w-full">
      <div className="px-5 pt-5">
        <div className="bx-eyebrow">Saison 04 · Etage 1–100</div>
        <div
          className="bx-display"
          style={{ fontSize: 36, lineHeight: 0.9, marginTop: 8 }}
        >
          DER TURM
          <span style={{ color: 'var(--bx-yellow)' }}>.</span>
        </div>
        <div
          className="bx-mono mt-2"
          style={{ fontSize: 11, color: 'var(--bx-mute)' }}
        >
          {kids.length} Spieler · The X
        </div>
      </div>

      <div className="px-4 pt-5 pb-6">
        {rows.map((r) =>
          r.kind === 'zone' ? (
            <div
              key={r.key}
              className="bx-divider-y"
              style={{ margin: '10px 4px' }}
            >
              {r.label}
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
        {rows.length === 0 && (
          <div
            className="text-center bx-mono"
            style={{
              padding: 30,
              color: 'var(--bx-mute)',
              fontSize: 12,
            }}
          >
            Lade Turm…
          </div>
        )}
      </div>
    </div>
  );
}
