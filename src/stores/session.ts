import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Kid } from '../lib/types';

interface SessionState {
  jwt: string | null;
  kid: Pick<Kid, 'id' | 'display_name'> | null;
  isAdmin: boolean;
  setKidSession: (jwt: string, kid: Pick<Kid, 'id' | 'display_name'>) => void;
  setAdminSession: (jwt: string) => void;
  clear: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      jwt: null,
      kid: null,
      isAdmin: false,
      setKidSession: (jwt, kid) => set({ jwt, kid, isAdmin: false }),
      setAdminSession: (jwt) => set({ jwt, isAdmin: true, kid: null }),
      clear: () => set({ jwt: null, kid: null, isAdmin: false }),
    }),
    { name: 'beystadium-session' },
  ),
);
