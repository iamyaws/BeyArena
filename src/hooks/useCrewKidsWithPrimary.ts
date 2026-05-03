// useCrewKidsWithPrimary — lists kids in the current kid's crew who have set
// a primary_bey_id. Used by the Lab opponent picker (Crew tab). Includes
// kids without primary in a separate field so the UI can show them faded.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useSession } from '../stores/session';
import type { Bey } from '../lib/types';

export interface CrewKidWithPrimary {
  id: string;
  display_name: string;
  primary_bey_id: string | null;
  primary_bey: Bey | null;
}

export function useCrewKidsWithPrimary() {
  const { kid } = useSession();
  return useQuery({
    queryKey: ['lab', 'crew-with-primary', kid?.id],
    queryFn: async (): Promise<CrewKidWithPrimary[]> => {
      if (!kid) return [];
      // For v1 the "crew" is "all kids" — there's no crew-membership table yet.
      // Once crews exist, filter here. Excludes the current kid (can't fight self).
      const { data, error } = await supabase
        .from('kids')
        .select('id, display_name, primary_bey_id')
        .neq('id', kid.id)
        .order('display_name');
      if (error) throw error;

      const rows = data ?? [];
      const withPrimaryIds = rows
        .map((r) => r.primary_bey_id)
        .filter((id): id is string => !!id);

      const beyMap = new Map<string, Bey>();
      if (withPrimaryIds.length > 0) {
        const { data: beys, error: beyErr } = await supabase
          .from('beys')
          .select('*')
          .in('id', withPrimaryIds);
        if (beyErr) throw beyErr;
        for (const b of beys ?? []) beyMap.set(b.id, b);
      }

      return rows.map((r) => ({
        id: r.id,
        display_name: r.display_name,
        primary_bey_id: r.primary_bey_id,
        primary_bey: r.primary_bey_id ? beyMap.get(r.primary_bey_id) ?? null : null,
      }));
    },
    enabled: !!kid,
  });
}
