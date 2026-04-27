import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function QrLoginPage() {
  const { token } = useParams<{ token: string }>();
  const { exchangeQrToken } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    exchangeQrToken(token)
      .then(() => nav('/', { replace: true }))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'fehler'));
  }, [token, exchangeQrToken, nav]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <h2 className="text-xl font-bold mb-2">Karte hat nicht funktioniert</h2>
          <p className="opacity-70">
            Frag {import.meta.env.VITE_ADMIN_EMAIL ?? 'den Admin'} nach einer neuen Karte.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center opacity-70">
      Logge ein…
    </div>
  );
}
