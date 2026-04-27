// supabase/functions/confirm-pending/index.ts
// Cron-driven job: confirms battles whose dispute window has passed, recomputes
// ELO from chronological history for both kids in each confirmed battle, then
// recomputes the king-of-the-hill (floor 100) globally.
//
// Scale: at v1 (~15 kids, ~100 battles total) the per-battle replay loop is
// fine. The N+1 pattern fetching opponent ELO inside recomputeKidElo() is
// intentional — accept it now, profile if it ever matters.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supa = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);
const K = 16;

function expected(meElo: number, oppElo: number) {
  return 1 / (1 + Math.pow(10, (oppElo - meElo) / 400));
}

// Mirrors src/lib/floor.ts. King-of-hill (100) is resolved separately below.
function eloToFloor(elo: number): number {
  if (elo < 800) return 1;
  if (elo < 1700) return Math.floor((elo - 800) / 10) + 1;
  return Math.min(91 + Math.floor((elo - 1700) / 33), 99);
}

Deno.serve(async () => {
  // 1. Find pending battles whose dispute window expired
  const { data: pending } = await supa
    .from('battles')
    .select('id, winner_kid_id, loser_kid_id')
    .eq('status', 'pending')
    .lt('dispute_window_ends_at', new Date().toISOString());

  if (!pending || pending.length === 0) return Response.json({ confirmed: 0 });

  let confirmed = 0;
  for (const b of pending) {
    await recomputeAndConfirm(b.id);
    confirmed++;
  }

  // After all confirms, recompute floor 100 (king-of-hill) globally
  await recomputeKingOfHill();

  return Response.json({ confirmed });
});

async function recomputeAndConfirm(battleId: string) {
  // Mark as confirmed first
  await supa
    .from('battles')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', battleId);

  // For both kids in this battle, recompute ELO from their full confirmed history
  const { data: battle } = await supa
    .from('battles')
    .select('winner_kid_id, loser_kid_id')
    .eq('id', battleId)
    .single();
  if (!battle) return;

  for (const kidId of [battle.winner_kid_id, battle.loser_kid_id]) {
    await recomputeKidElo(kidId);
  }
}

async function recomputeKidElo(kidId: string) {
  const { data: history } = await supa
    .from('battles')
    .select('winner_kid_id, loser_kid_id, logged_at')
    .eq('status', 'confirmed')
    .or(`winner_kid_id.eq.${kidId},loser_kid_id.eq.${kidId}`)
    .order('logged_at', { ascending: true });

  if (!history) return;

  // Replay all confirmed battles for this kid against current opponent ratings.
  // Approximation acceptable at v1 scale.
  let elo = 800;
  for (const h of history) {
    const opp = h.winner_kid_id === kidId ? h.loser_kid_id : h.winner_kid_id;
    const { data: oppKid } = await supa
      .from('kids')
      .select('elo')
      .eq('id', opp)
      .single();
    const oppElo = oppKid?.elo ?? 800;
    const won = h.winner_kid_id === kidId;
    const exp = expected(elo, oppElo);
    const delta = K * ((won ? 1 : 0) - exp);
    elo = Math.round(elo + delta);
  }

  const floor = eloToFloor(elo);
  await supa.from('kids').update({ elo, floor }).eq('id', kidId);
}

async function recomputeKingOfHill() {
  const { data: top } = await supa
    .from('kids')
    .select('id, elo')
    .order('elo', { ascending: false })
    .limit(1);
  if (!top || top.length === 0) return;
  // Reset all kids at floor 100 to 99 first, then promote top to 100 if eligible
  await supa.from('kids').update({ floor: 99 }).eq('floor', 100);
  if (top[0].elo >= 1964) {
    await supa.from('kids').update({ floor: 100 }).eq('id', top[0].id);
  }
}
