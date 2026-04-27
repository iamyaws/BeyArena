// OpponentPicker — Step 1 of the log-battle flow.
// "Wer war dein Gegner?" — list of crew sorted by floor (descending).
// Visual layout from .design-handoff/project/match.jsx (step === 0).

import { useAllKids } from '../../hooks/useKid';
import { useSession } from '../../stores/session';
import { useDraftBattle } from '../../stores/draft-battle';
import { Avatar } from '../ui/Avatar';

export function OpponentPicker() {
  const { kid: me } = useSession();
  const { data: kids } = useAllKids();
  const { patch, setStep } = useDraftBattle();
  const opponentKidId = useDraftBattle((s) => s.opponent_kid_id);

  function pick(opp_id: string) {
    patch({ opponent_kid_id: opp_id });
    setStep('score');
  }

  const others = (kids ?? [])
    .filter((k) => k.id !== me?.id)
    .sort((a, b) => b.floor - a.floor);

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* header */}
      <div style={{ padding: '12px 18px 0' }}>
        <div className="bx-eyebrow flex items-center gap-1.5">
          <span>Schlacht eintragen</span>
          <span>·</span>
          <span>1/4</span>
        </div>
        <div
          className="bx-display"
          style={{ fontSize: 26, marginTop: 8, lineHeight: 1 }}
        >
          Wer war dein Gegner?
        </div>
        <div
          style={{ marginTop: 6, fontSize: 13, color: 'var(--bx-mute)' }}
        >
          Tipp auf den Spieler, gegen den du heute gekämpft hast.
        </div>
      </div>

      <div style={{ padding: '18px 18px 0' }}>
        {others.map((k) => {
          const selected = opponentKidId === k.id;
          return (
            <button
              key={k.id}
              onClick={() => pick(k.id)}
              className="w-full flex items-center gap-3 text-left"
              style={{
                padding: 12,
                marginBottom: 8,
                background: selected ? 'rgba(253,224,71,0.08)' : '#13141b',
                border: `1px solid ${selected ? 'rgba(253,224,71,0.4)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 12,
                cursor: 'pointer',
              }}
            >
              <Avatar kid={k} size={42} />
              <div className="flex-1">
                <div style={{ fontSize: 15, fontWeight: 700 }}>
                  {k.display_name}
                </div>
                <div
                  className="bx-mono"
                  style={{
                    fontSize: 10,
                    color: 'var(--bx-mute-2)',
                    marginTop: 2,
                  }}
                >
                  ELO {k.elo}
                </div>
              </div>
              <div className="text-right">
                <div className="bx-display" style={{ fontSize: 18 }}>
                  {k.floor}
                </div>
                <div
                  className="bx-mono"
                  style={{ fontSize: 8, color: 'var(--bx-mute-2)' }}
                >
                  ETG
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
