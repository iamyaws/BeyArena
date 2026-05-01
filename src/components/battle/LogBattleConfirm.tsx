// LogBattleConfirm — Step 4 of the log-battle flow.
// Summary card (Bey + score + Bey), ELO/Etage delta preview, 24h dispute
// notice. Visual layout from .design-handoff/project/match.jsx (step === 3).

import { useNavigate } from 'react-router-dom';
import { useDraftBattle } from '../../stores/draft-battle';
import { useLogBattle } from '../../hooks/useBattles';
import { useCurrentKid, useKidById } from '../../hooks/useKid';
import { useAllBeys } from '../../hooks/useBeys';
import { eloToFloor } from '../../lib/floor';
import { computeElo } from '../../lib/elo';
import { Bey } from '../bey/Bey';
import { beyVisualFromDb } from '../bey/beyVisual';

export function LogBattleConfirm() {
  const draft = useDraftBattle();
  const reset = useDraftBattle((s) => s.reset);
  const log = useLogBattle();
  const nav = useNavigate();
  const { data: me } = useCurrentKid();
  const { data: opp } = useKidById(draft.opponent_kid_id ?? null);
  const { data: beys = [] } = useAllBeys();

  if (
    !me ||
    !opp ||
    draft.i_won === undefined ||
    draft.my_score === undefined ||
    draft.opp_score === undefined
  ) {
    return null;
  }

  const iWon = draft.i_won;
  const myScore = draft.my_score;
  const oppScore = draft.opp_score;
  const myBey = beys.find((b) => b.id === draft.my_bey_id);
  const oppBey = beys.find((b) => b.id === draft.opp_bey_id);

  const r = computeElo(iWon ? me.elo : opp.elo, iWon ? opp.elo : me.elo);
  const myEloNew = iWon ? r.winnerNew : r.loserNew;
  const eloDelta = myEloNew - me.elo;
  const myFloorNew = eloToFloor(myEloNew);

  async function submit() {
    if (
      draft.opponent_kid_id === undefined ||
      draft.i_won === undefined ||
      draft.my_score === undefined ||
      draft.opp_score === undefined
    ) {
      return;
    }
    try {
      await log.mutateAsync({
        opponent_kid_id: draft.opponent_kid_id,
        i_won: draft.i_won,
        my_score: draft.my_score,
        opp_score: draft.opp_score,
        my_bey_id: draft.my_bey_id ?? null,
        opp_bey_id: draft.opp_bey_id ?? null,
      });
      // Per Apple HIG: judicious haptic on success moments. Confirms the
      // battle landed even if the kid's eyes are still on the score.
      // navigator.vibrate is iOS Safari (16.4+) + most Android — falls
      // through silently on browsers that don't honor it.
      try {
        if (typeof navigator.vibrate === 'function') {
          navigator.vibrate(15);
        }
      } catch {
        /* not all browsers honor this; non-essential */
      }
      reset();
      nav('/');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Battle log failed:', e);
      // Mutation already throws into react-query state — the parent's
      // log.isError can show details; for now we just let the user retry.
    }
  }

  return (
    <div style={{ paddingBottom: 110 }}>
      {/* header */}
      <div style={{ padding: '12px 18px 0' }}>
        <div className="bx-eyebrow flex items-center gap-1.5">
          <span>Schlacht eintragen</span>
          <span>·</span>
          <span>4/4</span>
        </div>
        <div
          className="bx-display"
          style={{ fontSize: 26, marginTop: 8, lineHeight: 1 }}
        >
          {iWon ? 'Sieg eintragen?' : 'Niederlage eintragen?'}
        </div>
      </div>

      <div style={{ padding: '18px 18px 0' }}>
        {/* VS summary card */}
        <div
          className="bx-card bx-noise"
          style={{
            padding: 18,
            position: 'relative',
            overflow: 'hidden',
            background: iWon
              ? 'linear-gradient(160deg, rgba(34,197,94,0.18), transparent 70%), #11121a'
              : 'linear-gradient(160deg, rgba(220,38,38,0.18), transparent 70%), #11121a',
            borderColor: iWon ? 'rgba(34,197,94,0.4)' : 'rgba(220,38,38,0.4)',
          }}
        >
          <div
            className="grid items-center"
            style={{ gridTemplateColumns: '1fr auto 1fr', gap: 8 }}
          >
            <div className="text-center">
              <div className="flex justify-center">
                <Bey bey={beyVisualFromDb(myBey)} size={56} spin />
              </div>
              <div
                className="bx-display"
                style={{ fontSize: 13, marginTop: 6 }}
              >
                {me.display_name.toUpperCase()}
              </div>
            </div>
            <div className="bx-display" style={{ fontSize: 36, color: '#fff' }}>
              {myScore}
              <span style={{ color: 'var(--bx-mute-2)' }}>–</span>
              {oppScore}
            </div>
            <div className="text-center">
              <div className="flex justify-center">
                <Bey bey={beyVisualFromDb(oppBey)} size={56} spin />
              </div>
              <div
                className="bx-display"
                style={{ fontSize: 13, marginTop: 6 }}
              >
                {opp.display_name.toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* ELO/Etage delta preview */}
        <div className="bx-card" style={{ padding: 14, marginTop: 12 }}>
          <div className="bx-eyebrow mb-2">Auswirkung (vorläufig)</div>
          <div className="flex items-center" style={{ gap: 12 }}>
            <div className="flex-1">
              <div
                className="bx-mono"
                style={{ fontSize: 10, color: 'var(--bx-mute)' }}
              >
                ELO
              </div>
              <div className="flex items-baseline" style={{ gap: 6 }}>
                <div className="bx-display" style={{ fontSize: 22 }}>
                  {me.elo}
                </div>
                <div
                  className="bx-display"
                  style={{ color: 'var(--bx-mute-2)' }}
                >
                  →
                </div>
                <div
                  className="bx-display"
                  style={{
                    fontSize: 22,
                    color:
                      eloDelta > 0 ? '#22c55e' : 'var(--bx-crimson)',
                  }}
                >
                  {myEloNew}
                </div>
                <div
                  className="bx-mono"
                  style={{
                    fontSize: 10,
                    color:
                      eloDelta > 0 ? '#22c55e' : 'var(--bx-crimson)',
                  }}
                >
                  {eloDelta > 0 ? '+' : ''}
                  {eloDelta}
                </div>
              </div>
            </div>
            <div
              className="self-stretch"
              style={{ width: 1, background: 'rgba(255,255,255,0.08)' }}
            />
            <div className="flex-1">
              <div
                className="bx-mono"
                style={{ fontSize: 10, color: 'var(--bx-mute)' }}
              >
                ETAGE
              </div>
              <div className="flex items-baseline" style={{ gap: 6 }}>
                <div className="bx-display" style={{ fontSize: 22 }}>
                  {me.floor}
                </div>
                <div
                  className="bx-display"
                  style={{ color: 'var(--bx-mute-2)' }}
                >
                  →
                </div>
                <div
                  className="bx-display"
                  style={{
                    fontSize: 22,
                    color:
                      myFloorNew > me.floor
                        ? 'var(--bx-yellow)'
                        : 'var(--bx-mute)',
                  }}
                >
                  {myFloorNew}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Anti-drama notice */}
        <div
          className="flex items-start gap-2.5"
          style={{
            marginTop: 12,
            padding: 12,
            background: 'rgba(37,99,235,0.1)',
            border: '1px solid rgba(37,99,235,0.25)',
            borderRadius: 10,
          }}
        >
          <div style={{ fontSize: 16 }}>⏳</div>
          <div
            style={{
              fontSize: 12,
              lineHeight: 1.45,
              color: 'rgba(255,255,255,0.75)',
            }}
          >
            Wenn 24 Stunden lang niemand &quot;stimmt nicht&quot; sagt, zählt
            der Kampf. Sonst wird er gestrichen.
          </div>
        </div>
      </div>

      {/* Error toast — surfaces network/auth errors in kid-friendly German.
          Sits inline above the footer so the kid sees it without scrolling. */}
      {log.isError && (
        <div className="px-[18px] pt-3">
          <div
            className="bx-card"
            style={{
              padding: 12,
              background: 'rgba(220,38,38,0.1)',
              borderColor: 'rgba(220,38,38,0.4)',
              fontSize: 12,
              lineHeight: 1.45,
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            {(() => {
              const raw = log.error instanceof Error ? log.error.message : '';
              if (/Failed to fetch|Load failed|NetworkError|fetch/i.test(raw)) {
                return 'Kein Internet. Versuch\'s gleich nochmal.';
              }
              if (/JWT|expired|exp\b/i.test(raw)) {
                return 'Du bist zu lange weg gewesen. Scan deine Karte nochmal.';
              }
              if (/permission|denied|RLS|auth/i.test(raw)) {
                return 'Das ging gerade nicht. Frag Marc.';
              }
              return 'Hat nicht geklappt. Tipp nochmal.';
            })()}
          </div>
        </div>
      )}

      <div
        className="fixed left-0 right-0 bottom-0"
        style={{
          // Bottom padding respects iPhone home indicator via
          // safe-area-inset-bottom.
          padding: '14px 18px max(22px, calc(env(safe-area-inset-bottom) + 12px))',
          background:
            'linear-gradient(to top, var(--bx-ink) 60%, transparent)',
          zIndex: 5,
        }}
      >
        <button
          onClick={submit}
          disabled={log.isPending}
          className="bx-btn bx-btn-crimson"
          style={{
            width: '100%',
            padding: '16px',
            fontSize: 16,
            opacity: log.isPending ? 0.6 : 1,
            cursor: log.isPending ? 'wait' : 'pointer',
          }}
        >
          {log.isPending ? 'Sende…' : '⚔ Eintragen'}
        </button>
      </div>
    </div>
  );
}
