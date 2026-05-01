// AdminLoginPage — Werkstatt login.
// Admin-facing (Marc only) but applies the same HIG polish layer as the
// rest of the app: safe-area padding, 44pt tap targets, specific error
// mapping. German copy stays formal here (not kid-targeted).

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function AdminLoginPage() {
  const { adminLogin } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setPending(true);
    try {
      await adminLogin(email, pw);
      nav('/werkstatt', { replace: true });
    } catch (caught: unknown) {
      // Map Supabase auth + network errors to specific German copy.
      const raw = caught instanceof Error ? caught.message : '';
      let msg = 'Login fehlgeschlagen.';
      if (/Invalid login credentials|invalid_grant|invalid_credentials/i.test(raw)) {
        msg = 'Email oder Passwort stimmt nicht.';
      } else if (/Email not confirmed|email_not_confirmed/i.test(raw)) {
        msg = 'Email ist noch nicht bestätigt. Check dein Postfach.';
      } else if (/Failed to fetch|Load failed|NetworkError|fetch/i.test(raw)) {
        msg = 'Kein Internet. Versuch\'s gleich nochmal.';
      } else if (/not authorized/i.test(raw)) {
        msg = 'Diese Email darf nicht in die Werkstatt.';
      } else if (/rate.limit|too.many|429/i.test(raw)) {
        msg = 'Zu viele Versuche. Warte einen Moment.';
      } else if (raw) {
        msg = raw;
      }
      setErr(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="bx min-h-screen w-full flex items-center justify-center"
      style={{
        background: 'var(--bx-ink)',
        // Safe-area on all sides — admin still uses iPhone too.
        padding:
          'max(24px, calc(env(safe-area-inset-top) + 16px)) 24px max(24px, calc(env(safe-area-inset-bottom) + 16px))',
      }}
    >
      <form onSubmit={submit} className="w-full" style={{ maxWidth: 380 }}>
        <div className="bx-eyebrow" style={{ marginBottom: 6 }}>
          Werkstatt
        </div>
        <h1
          className="bx-display"
          style={{ fontSize: 32, marginBottom: 18, lineHeight: 1 }}
        >
          LOGIN
          <span style={{ color: 'var(--bx-yellow)' }}>.</span>
        </h1>

        <label
          className="bx-mono"
          style={{
            display: 'block',
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--bx-mute)',
            marginBottom: 6,
          }}
        >
          Email
        </label>
        <input
          type="email"
          autoComplete="email"
          autoFocus
          required
          placeholder="marc@..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: '100%',
            minHeight: 44,
            padding: '0 14px',
            background: 'var(--bx-ink-3)',
            border: '1px solid var(--bx-line)',
            borderRadius: 10,
            color: '#fff',
            fontSize: 15,
            marginBottom: 12,
          }}
        />

        <label
          className="bx-mono"
          style={{
            display: 'block',
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--bx-mute)',
            marginBottom: 6,
          }}
        >
          Passwort
        </label>
        <input
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          style={{
            width: '100%',
            minHeight: 44,
            padding: '0 14px',
            background: 'var(--bx-ink-3)',
            border: '1px solid var(--bx-line)',
            borderRadius: 10,
            color: '#fff',
            fontSize: 15,
            marginBottom: 14,
          }}
        />

        {err && (
          <div
            role="alert"
            style={{
              padding: 12,
              borderRadius: 10,
              background: 'rgba(220,38,38,0.12)',
              border: '1px solid rgba(220,38,38,0.3)',
              color: 'rgba(255,255,255,0.85)',
              fontSize: 13,
              marginBottom: 14,
              lineHeight: 1.4,
            }}
          >
            {err}
          </div>
        )}

        <button
          type="submit"
          disabled={pending || !email || !pw}
          className="bx-btn bx-btn-yellow"
          style={{
            width: '100%',
            minHeight: 48,
            fontSize: 16,
            opacity: pending || !email || !pw ? 0.5 : 1,
            cursor: pending ? 'wait' : pending || !email || !pw ? 'not-allowed' : 'pointer',
          }}
        >
          {pending ? 'Sende…' : 'Login'}
        </button>
      </form>
    </div>
  );
}
