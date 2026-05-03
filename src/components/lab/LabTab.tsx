// LabTab — Battle Lab home. Two pickers (MEIN BEY, GEGNER) + KAMPF STARTEN
// button. Manages picker open/close state and threads the kid's selections
// to LabBattleScreen (Task 15).
//
// Spec section 5.1.

import { useEffect, useState } from 'react';
import { LabBattleScreen } from './LabBattleScreen';
import type { Outcome } from '../../lib/labEngine';
import { useAllBeys } from '../../hooks/useBeys';
import { useLabSession } from '../../stores/lab-session';
import { useCrewKidsWithPrimary } from '../../hooks/useCrewKidsWithPrimary';
import { getTrainer } from '../../data/labTrainers';
import { Bey } from '../bey/Bey';
import { beyVisualFromDb } from '../bey/beyVisual';
import { LabPickerBey } from './LabPickerBey';
import { LabPickerOpponent } from './LabPickerOpponent';
import { LabStreakChip } from './LabStreakChip';
import type { OpponentKind } from '../../lib/labEngine';
import type { Bey as DbBey } from '../../lib/types';

export function LabTab() {
  const { myBeyId, opponent, setMyBey, setOpponent, resetSession } = useLabSession();
  const { data: beys = [] } = useAllBeys();
  const { data: crew = [] } = useCrewKidsWithPrimary();
  const [pickMyOpen, setPickMyOpen] = useState(false);
  const [pickOppOpen, setPickOppOpen] = useState(false);
  const [opponentLabel, setOpponentLabel] = useState<string | null>(null);

  // Reset picks on tab leave (spec section 9 + 10).
  useEffect(() => {
    return () => resetSession();
  }, [resetSession]);

  const myBey = beys.find((b) => b.id === myBeyId) ?? null;
  const oppBey = resolveOpponentBey(opponent, beys, crew);
  const canStart = !!myBey && !!oppBey;

  const [activeBattle, setActiveBattle] = useState<{ myBeyId: string; opponent: OpponentKind } | null>(null);
  const [recap, setRecap] = useState<{ outcome: Outcome; oppBey: DbBey } | null>(null);
  // battleKey forces LabBattleScreen to remount on Nochmal so seed re-rolls.
  // _setBattleKey renamed to setBattleKey in Task 16 when Nochmal flow lands.
  const [battleKey, _setBattleKey] = useState(0);

  function handleStart() {
    if (!canStart || !myBeyId || !opponent) return;
    setActiveBattle({ myBeyId, opponent });
  }

  return (
    <div className="bx" style={{ padding: '12px 18px 110px' }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="bx-eyebrow">BEYBLADE LAB</div>
          <div className="bx-display" style={{ fontSize: 26, marginTop: 4, lineHeight: 1 }}>
            Teste deine Beys
          </div>
        </div>
        <LabStreakChip />
      </div>

      <div
        className="grid items-center"
        style={{ gridTemplateColumns: '1fr auto 1fr', gap: 8, marginTop: 22 }}
      >
        <PickerSlot
          title="MEIN BEY"
          bey={myBey}
          onTap={() => setPickMyOpen(true)}
        />
        <div className="bx-display" style={{ fontSize: 28, color: 'var(--bx-mute-2)' }}>
          VS
        </div>
        <PickerSlot
          title="GEGNER"
          bey={oppBey}
          subtitle={opponentLabel ?? undefined}
          onTap={() => setPickOppOpen(true)}
        />
      </div>

      <button
        onClick={handleStart}
        disabled={!canStart}
        className="bx-btn bx-btn-crimson"
        style={{
          width: '100%',
          marginTop: 28,
          padding: 16,
          fontSize: 16,
          opacity: canStart ? 1 : 0.5,
          cursor: canStart ? 'pointer' : 'not-allowed',
        }}
      >
        ⚔ KAMPF STARTEN
      </button>

      <LabPickerBey
        open={pickMyOpen}
        onPick={(id) => {
          setMyBey(id);
          setPickMyOpen(false);
        }}
        onClose={() => setPickMyOpen(false)}
      />
      <LabPickerOpponent
        open={pickOppOpen}
        onPick={(k, label) => {
          setOpponent(k);
          setOpponentLabel(label);
          setPickOppOpen(false);
        }}
        onClose={() => setPickOppOpen(false)}
      />

      {activeBattle && !recap && (
        <LabBattleScreen
          key={battleKey}
          myBeyId={activeBattle.myBeyId}
          opponent={activeBattle.opponent}
          onComplete={(o, oppBey) => setRecap({ outcome: o, oppBey })}
          onCancel={() => setActiveBattle(null)}
        />
      )}
    </div>
  );
}

function resolveOpponentBey(
  opp: OpponentKind | null,
  beys: DbBey[],
  crew: Array<{ id: string; primary_bey: DbBey | null }>,
): DbBey | null {
  if (!opp || beys.length === 0) return null;
  if (opp.kind === 'wild') {
    if (opp.beyId) return beys.find((b) => b.id === opp.beyId) ?? null;
    // For the resting-state preview we show "?". The actual random pick happens
    // at fight-start in LabBattleScreen (Task 15) so each Nochmal re-rolls.
    return null;
  }
  if (opp.kind === 'trainer') {
    // Preview: show a sample of what this trainer might pick.
    return getTrainer(opp.trainerId).pick(beys);
  }
  if (opp.kind === 'crew') {
    const k = crew.find((c) => c.id === opp.kidId);
    return k?.primary_bey ?? null;
  }
  return null;
}

function PickerSlot({
  title,
  bey,
  subtitle,
  onTap,
}: {
  title: string;
  bey: DbBey | null;
  subtitle?: string;
  onTap: () => void;
}) {
  const visual = beyVisualFromDb(bey);
  return (
    <button
      onClick={onTap}
      className="bx-card"
      style={{
        padding: 12,
        textAlign: 'center',
        minHeight: 120,
        cursor: 'pointer',
        background: 'rgba(255,255,255,0.03)',
      }}
    >
      <div className="bx-mono" style={{ fontSize: 9, color: 'var(--bx-mute)', letterSpacing: '0.12em' }}>
        {title}
      </div>
      <div className="flex justify-center" style={{ marginTop: 8, marginBottom: 8 }}>
        <Bey bey={visual} size={56} spin={!!bey} />
      </div>
      <div className="bx-display" style={{ fontSize: 12, lineHeight: 1.2 }}>
        {bey ? (bey.name_de ?? bey.name_en) : 'Tippe um zu wählen'}
      </div>
      {subtitle && (
        <div className="bx-mono" style={{ fontSize: 9, marginTop: 4, color: 'var(--bx-mute)' }}>
          {subtitle}
        </div>
      )}
    </button>
  );
}
