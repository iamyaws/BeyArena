// src/hooks/useBattles.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useSession } from '../stores/session';
import { enqueueBattle } from '../lib/offline-queue';
import type { DraftBattle } from '../lib/types';

export type FeedFilter = 'all' | 'pending' | 'mine' | 'voided';

export function useFeed(filter: FeedFilter = 'all') {
  const { kid } = useSession();
  return useQuery({
    queryKey: ['feed', filter, kid?.id],
    queryFn: async () => {
      let q = supabase
        .from('battles')
        .select('*')
        .order('logged_at', { ascending: false })
        .limit(50);
      if (filter === 'pending') q = q.eq('status', 'pending');
      if (filter === 'voided') q = q.eq('status', 'voided');
      if (filter === 'mine' && kid) {
        q = q.or(`winner_kid_id.eq.${kid.id},loser_kid_id.eq.${kid.id}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useLogBattle() {
  const { kid } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: DraftBattle) => {
      if (!kid) throw new Error('not logged in');
      const winner_kid_id = draft.i_won ? kid.id : draft.opponent_kid_id;
      const loser_kid_id = draft.i_won ? draft.opponent_kid_id : kid.id;
      const winner_score = draft.i_won ? draft.my_score : draft.opp_score;
      const loser_score = draft.i_won ? draft.opp_score : draft.my_score;
      const winner_bey_id = draft.i_won ? draft.my_bey_id : draft.opp_bey_id;
      const loser_bey_id = draft.i_won ? draft.opp_bey_id : draft.my_bey_id;

      try {
        const { data, error } = await supabase
          .from('battles')
          .insert({
            logger_kid_id: kid.id,
            winner_kid_id,
            loser_kid_id,
            winner_score,
            loser_score,
            winner_bey_id,
            loser_bey_id,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (e) {
        if (!navigator.onLine) {
          await enqueueBattle(draft);
          return { queued: true } as never;
        }
        throw e;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
