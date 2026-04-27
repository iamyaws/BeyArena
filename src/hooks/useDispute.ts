// src/hooks/useDispute.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../stores/session';
import { env } from '../lib/env';

export function useDisputeBattle() {
  const { jwt } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { battle_id: string; reason_code: string; note?: string }) => {
      const res = await fetch(`${env.SUPABASE_URL}/functions/v1/dispute-battle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
          apikey: env.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });
}
