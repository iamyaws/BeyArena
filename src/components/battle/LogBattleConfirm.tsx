// src/components/battle/LogBattleConfirm.tsx
import { useNavigate } from 'react-router-dom';
import { useDraftBattle } from '../../stores/draft-battle';
import { useLogBattle } from '../../hooks/useBattles';
import { useCurrentKid, useKidById } from '../../hooks/useKid';
import { eloToFloor } from '../../lib/floor';
import { computeElo } from '../../lib/elo';

export function LogBattleConfirm() {
  const draft = useDraftBattle();
  const reset = useDraftBattle((s) => s.reset);
  const log = useLogBattle();
  const nav = useNavigate();
  const { data: me } = useCurrentKid();
  const { data: opp } = useKidById(draft.opponent_kid_id ?? null);

  if (!me || !opp || draft.i_won === undefined) return null;
  const myElo = me.elo;
  const oppElo = opp.elo;
  const r = computeElo(draft.i_won ? myElo : oppElo, draft.i_won ? oppElo : myElo);
  const myNew = draft.i_won ? r.winnerNew : r.loserNew;
  const myFloorNew = eloToFloor(myNew);

  async function submit() {
    if (draft.opponent_kid_id === undefined || draft.i_won === undefined) return;
    if (draft.my_score === undefined || draft.opp_score === undefined) return;
    await log.mutateAsync({
      opponent_kid_id: draft.opponent_kid_id,
      i_won: draft.i_won,
      my_score: draft.my_score,
      opp_score: draft.opp_score,
      my_bey_id: draft.my_bey_id ?? null,
      opp_bey_id: draft.opp_bey_id ?? null,
    });
    reset();
    nav('/');
  }

  return (
    <div className="space-y-4 text-center">
      <h2 className="text-2xl font-bold text-bx-yellow">Eingetragen?</h2>
      <div className="bg-zinc-900 p-4 rounded">
        <p>
          {draft.i_won ? 'Du hast' : 'Du gegen'} <strong>{opp.display_name}</strong>
        </p>
        <p className="text-3xl font-bold my-2">
          {draft.my_score} — {draft.opp_score}
        </p>
        <p className="text-sm opacity-60">
          Etage {me.floor} → <span className="text-green-400">{myFloorNew}</span> (vorläufig)
        </p>
      </div>
      <p className="text-xs opacity-50">
        Wenn 24 Stunden niemand sagt &quot;stimmt nicht&quot;, zählt&apos;s.
      </p>
      <button
        onClick={submit}
        disabled={log.isPending}
        className="w-full p-4 bg-bx-crimson font-bold rounded"
      >
        {log.isPending ? 'Sende…' : '⚔ Eintragen'}
      </button>
    </div>
  );
}
