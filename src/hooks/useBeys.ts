// Bey collection queries.
// - useAllBeys: canonical bey catalog (everything available globally).
// - useKidBeys: just the beys this kid has acquired (kid_beys join table).

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Bey } from '../lib/types';

export function useAllBeys() {
  return useQuery({
    queryKey: ['beys', 'all'],
    queryFn: async (): Promise<Bey[]> => {
      const { data, error } = await supabase
        .from('beys')
        .select('*')
        .eq('canonical', true)
        .order('product_code');
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Beys the given kid has acquired. Reads kid_beys (acquired_at, nickname),
 * then fetches the full bey rows by id.
 *
 * v1 fallback note (TODO): if kid_beys is empty, the ProfilePage falls back
 * to showing the seed beys catalog as a "wishlist". That's good enough for
 * the design pass — we'll wire actual acquisition once trading lands.
 */
export function useKidBeys(kidId: string | null | undefined) {
  return useQuery({
    queryKey: ['kid-beys', kidId],
    queryFn: async (): Promise<Bey[]> => {
      if (!kidId) return [];
      const { data: rels, error: relErr } = await supabase
        .from('kid_beys')
        .select('bey_id')
        .eq('kid_id', kidId);
      if (relErr) throw relErr;
      const ids = (rels ?? []).map((r) => r.bey_id);
      if (ids.length === 0) return [];
      const { data: beys, error: beyErr } = await supabase
        .from('beys')
        .select('*')
        .in('id', ids);
      if (beyErr) throw beyErr;
      return beys ?? [];
    },
    enabled: !!kidId,
  });
}
