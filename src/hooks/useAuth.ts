import { useEffect } from 'react';
import { useSession } from '../stores/session';
import { setAuthToken, supabase } from '../lib/supabase';
import { env } from '../lib/env';

export function useAuth() {
  const { jwt, kid, isAdmin, setKidSession, setAdminSession, clear } = useSession();

  // Re-attach JWT to supabase client on every change
  useEffect(() => {
    setAuthToken(jwt);
  }, [jwt]);

  async function exchangeQrToken(token: string) {
    const res = await fetch(`${env.SUPABASE_URL}/functions/v1/exchange-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: env.SUPABASE_ANON_KEY },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) throw new Error('invalid QR');
    const { jwt: newJwt, kid: newKid } = await res.json();
    setKidSession(newJwt, newKid);
  }

  async function adminLogin(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) throw error ?? new Error('admin login failed');
    if (email !== env.ADMIN_EMAIL) throw new Error('not authorized');
    setAdminSession(data.session.access_token);
  }

  return { jwt, kid, isAdmin, exchangeQrToken, adminLogin, signOut: clear };
}
