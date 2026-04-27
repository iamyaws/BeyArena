import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function AdminLoginPage() {
  const { adminLogin } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await adminLogin(email, pw);
      nav('/werkstatt', { replace: true });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'login failed');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="space-y-3 w-full max-w-sm">
        <h1 className="text-xl font-bold">Werkstatt-Login</h1>
        <input
          className="w-full p-2 bg-zinc-800 rounded"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full p-2 bg-zinc-800 rounded"
          placeholder="Passwort"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        {err && <p className="text-red-400 text-sm">{err}</p>}
        <button className="w-full p-3 bg-bx-yellow text-black font-bold rounded">Login</button>
      </form>
    </div>
  );
}
