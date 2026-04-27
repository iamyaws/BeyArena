import { useCallback, useEffect } from 'react';
import { AppRoutes } from './routes';
import { drainQueue } from './lib/offline-queue';
import { useLogBattle } from './hooks/useBattles';

export default function App() {
  const log = useLogBattle();
  const mutate = log.mutateAsync;

  const tryDrain = useCallback(() => {
    void drainQueue((d) => mutate(d));
  }, [mutate]);

  useEffect(() => {
    tryDrain();
    window.addEventListener('online', tryDrain);
    return () => window.removeEventListener('online', tryDrain);
  }, [tryDrain]);

  return <AppRoutes />;
}
