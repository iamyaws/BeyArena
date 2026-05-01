// supabase/functions/exchange-token/index.ts
// Validates a QR token (sha256(plaintext) lookup), then signs a custom HS256 JWT
// carrying the kid_id claim. PostgREST verifies the JWT with the project JWT secret
// and our public.app_kid_id() helper extracts the claim for RLS.
//
// NOTE: env var is named JWT_SECRET (not SUPABASE_JWT_SECRET) because Supabase
// reserves the SUPABASE_ prefix for managed secrets.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { create, getNumericDate } from 'https://deno.land/x/djwt@v3.0.2/mod.ts';
import { encodeHex } from 'https://deno.land/std@0.224.0/encoding/hex.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const JWT_SECRET = Deno.env.get('JWT_SECRET')!;

const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

// CORS for browser fetch from beyarena.vercel.app (and dev). Without these the
// preflight OPTIONS gets a 405 from this function and Safari shows "Load failed".
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

function withCors(body: BodyInit | null, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(body, { ...init, headers });
}

function jsonWithCors(payload: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(payload), { ...init, headers });
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return encodeHex(new Uint8Array(digest));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return withCors(null, { status: 204 });
  }
  if (req.method !== 'POST') {
    return withCors('method not allowed', { status: 405 });
  }
  const { token } = await req.json().catch(() => ({}));
  if (!token || typeof token !== 'string') {
    return jsonWithCors({ error: 'missing token' }, { status: 400 });
  }

  const tokenHash = await sha256Hex(token);
  const { data: kid, error } = await supa
    .from('kids')
    .select('id, display_name')
    .eq('token_hash', tokenHash)
    .single();

  if (error || !kid) {
    return jsonWithCors({ error: 'invalid token' }, { status: 401 });
  }

  // Sign custom JWT with kid_id claim. Supabase project JWT secret is a UTF-8
  // string used as raw HMAC key bytes (not base64-decoded). PostgREST verifies
  // signatures the same way.
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
  const jwt = await create(
    { alg: 'HS256', typ: 'JWT' },
    {
      sub: kid.id,
      kid_id: kid.id,
      role: 'authenticated',
      exp: getNumericDate(60 * 60 * 24 * 365), // 1 year
    },
    key,
  );

  return jsonWithCors({ jwt, kid });
});
