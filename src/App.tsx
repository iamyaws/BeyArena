import { useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AppRoutes } from './routes';
import { drainQueue } from './lib/offline-queue';
import { useLogBattle } from './hooks/useBattles';
import { useSession } from './stores/session';
import { BottomNav } from './components/nav/BottomNav';

function AppShell() {
  const log = useLogBattle();
  const mutate = log.mutateAsync;
  const loc = useLocation();
  const { kid } = useSession();

  const tryDrain = useCallback(() => {
    void drainQueue((d) => mutate(d));
  }, [mutate]);

  useEffect(() => {
    tryDrain();
    window.addEventListener('online', tryDrain);
    return () => window.removeEventListener('online', tryDrain);
  }, [tryDrain]);

  const showNav =
    !!kid &&
    !loc.pathname.startsWith('/admin') &&
    !loc.pathname.startsWith('/werkstatt') &&
    !loc.pathname.startsWith('/q/');

  return (
    <>
      <main className={showNav ? 'pb-20' : ''}>
        <AppRoutes />
      </main>
      {showNav && <BottomNav />}
    </>
  );
}

export default function App() {
  return <AppShell />;
}
