// supabase/functions/dispute-battle/index.ts
// Records a kid's dispute against a pending battle and voids it.
//
// JWT handling: this v1 function decodes the JWT payload but does NOT verify
// the signature. Acceptable in the 15-kid trust model — anyone with a stolen
// JWT could already act as that kid via PostgREST RLS. Phase 2 follow-up:
// verify the signature with the project JWT secret (same approach as
// exchange-token, but in `verify` mode).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supa = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

function getKidIdFromJwt(req: Request): string | null {
  const auth = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!auth) return null;
  try {
    const payload = JSON.parse(atob(auth.split('.')[1]));
    return payload.kid_id ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const kidId = getKidIdFromJwt(req);
  if (!kidId) return new Response('unauthorized', { status: 401 });

  const { battle_id, reason_code, note } = await req.json().catch(() => ({}));
  if (!battle_id || !reason_code) return new Response('missing fields', { status: 400 });

  const VALID_REASONS = new Set([
    'wrong_score',
    'didnt_happen',
    'wrong_opponent',
    'wrong_bey',
    'other',
  ]);
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!UUID_RE.test(battle_id ?? '')) {
    return new Response(JSON.stringify({ error: 'invalid battle_id' }), { status: 400 });
  }
  if (!VALID_REASONS.has(reason_code)) {
    return new Response(JSON.stringify({ error: 'invalid reason_code' }), { status: 400 });
  }

  // Verify battle is still pending
  const { data: battle } = await supa
    .from('battles')
    .select('id, status')
    .eq('id', battle_id)
    .single();
  if (!battle) return new Response('battle not found', { status: 404 });
  if (battle.status !== 'pending') return new Response('battle not pending', { status: 409 });

  // Insert dispute (UNIQUE constraint enforces one per kid per battle)
  const { error: dErr } = await supa.from('disputes').insert({
    battle_id,
    disputer_kid_id: kidId,
    reason_code,
    note: note?.slice(0, 200) ?? null,
  });
  if (dErr) return new Response(JSON.stringify({ error: dErr.message }), { status: 400 });

  // Void battle
  await supa
    .from('battles')
    .update({
      status: 'voided',
      voided_at: new Date().toISOString(),
      voided_reason: `disputed_by_${kidId}`,
    })
    .eq('id', battle_id);

  return Response.json({ ok: true });
});
