// BeyPicker — Step 3 of the log-battle flow.
// "Welche Beys?" — pick own + opponent bey from horizontal scroll rows.
// Visual layout from .design-handoff/project/match.jsx (step === 2).

import { useDraftBattle } from '../../stores/draft-battle';
import { useKidById } from '../../hooks/useKid';
import { useAllBeys } from '../../hooks/useBeys';
import { Bey } from '../bey/Bey';
import { beyVisualFromDb } from '../bey/beyVisual';
import type { Bey as DbBey } from '../../lib/types';

export function BeyPicker() {
  const { setStep, patch } = useDraftBattle();
  const opponentKidId = useDraftBattle((s) => s.opponent_kid_id);
  const myBeyId = useDraftBattle((s) => s.my_bey_id);
  const oppBeyId = useDraftBattle((s) => s.opp_bey_id);
  const { data: opp } = useKidById(opponentKidId ?? null);
  const { data: beys = [] } = useAllBeys();

  return (
    <div style={{ paddingBottom: 110 }}>
      {/* header */}
      <div style={{ padding: '12px 18px 0' }}>
        <div className="bx-eyebrow flex items-center gap-1.5">
          <span>Schlacht eintragen</span>
          <span>·</span>
          <span>3/4</span>
        </div>
        <div
          className="bx-display"
          style={{ fontSize: 26, marginTop: 8, lineHeight: 1 }}
        >
          Welche Beys?
        </div>
        <div
          style={{ marginTop: 6, fontSize: 13, color: 'var(--bx-mute)' }}
        >
          Tipp deinen Bey und den vom Gegner.
        </div>
      </div>

      <BeyRow
        title="Mein Bey"
        beys={beys}
        selectedId={myBeyId ?? null}
        onPick={(id) => patch({ my_bey_id: id })}
      />
      <BeyRow
        title={`${opp?.display_name ?? 'Gegner'}s Bey`}
        beys={beys}
        selectedId={oppBeyId ?? null}
        onPick={(id) => patch({ opp_bey_id: id })}
      />

      <div
        className="fixed left-0 right-0 bottom-0"
        style={{
          padding: '14px 18px 22px',
          background:
            'linear-gradient(to top, var(--bx-ink) 60%, transparent)',
          zIndex: 5,
        }}
      >
        <button
          onClick={() => setStep('confirm')}
          className="bx-btn bx-btn-yellow"
          style={{ width: '100%', padding: '16px', fontSize: 16 }}
        >
          Weiter →
        </button>
      </div>
    </div>
  );
}

function BeyRow({
  title,
  beys,
  selectedId,
  onPick,
}: {
  title: string;
  beys: DbBey[];
  selectedId: string | null;
  onPick: (id: string | null) => void;
}) {
  return (
    <div style={{ padding: '14px 18px 0' }}>
      <div className="bx-eyebrow" style={{ marginBottom: 8 }}>
        {title}
      </div>
      <div
        className="flex overflow-x-auto"
        style={{ gap: 10, padding: '4px 0', scrollbarWidth: 'none' }}
      >
        {beys.map((b) => {
          const sel = selectedId === b.id;
          const visual = beyVisualFromDb(b);
          // Halo color uses visual.color1 since the DB row has no color.
          const haloColor = visual?.color1 ?? '#FDE047';
          return (
            <button
              key={b.id}
              onClick={() => onPick(b.id)}
              className="flex flex-col items-center"
              style={{
                flex: '0 0 auto',
                width: 96,
                padding: 10,
                borderRadius: 12,
                background: sel ? `${haloColor}20` : '#13141b',
                border: `1px solid ${sel ? haloColor : 'rgba(255,255,255,0.06)'}`,
                cursor: 'pointer',
                gap: 6,
              }}
            >
              <Bey bey={visual} size={56} spin={sel} />
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textAlign: 'center',
                  lineHeight: 1.2,
                }}
              >
                {b.name_en}
              </div>
              <div
                className="bx-mono"
                style={{ fontSize: 8, color: 'var(--bx-mute-2)' }}
              >
                {b.product_code ?? '—'}
              </div>
            </button>
          );
        })}
        <button
          onClick={() => onPick(null)}
          className="flex flex-col items-center justify-center"
          style={{
            flex: '0 0 auto',
            width: 96,
            padding: 10,
            borderRadius: 12,
            background:
              selectedId === null ? 'rgba(255,255,255,0.08)' : '#13141b',
            border: '1px dashed rgba(255,255,255,0.15)',
            cursor: 'pointer',
            color: 'var(--bx-mute)',
            fontSize: 11,
            gap: 6,
          }}
        >
          <div style={{ fontSize: 22 }}>?</div>
          <div>Weiß nicht</div>
        </button>
      </div>
    </div>
  );
}
