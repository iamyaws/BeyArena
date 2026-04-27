import { createClient } from '@supabase/supabase-js';
import { env } from './env';
import type { Database } from './supabase-types';

export const supabase = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  {
    auth: { persistSession: false }, // we manage session via custom JWT
  },
);

export function setAuthToken(token: string | null) {
  if (token) {
    supabase.auth.setSession({ access_token: token, refresh_token: '' } as never);
  }
}
