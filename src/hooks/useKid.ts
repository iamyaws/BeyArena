// src/hooks/useKid.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useSession } from '../stores/session';

export function useCurrentKid() {
  const { kid } = useSession();
  return useQuery({
    queryKey: ['kid', kid?.id],
    queryFn: async () => {
      if (!kid) return null;
      const { data, error } = await supabase.from('kids').select('*').eq('id', kid.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!kid,
  });
}

export function useAllKids() {
  return useQuery({
    queryKey: ['kids', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kids')
        .select('*')
        .order('elo', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useKidById(id: string | null) {
  return useQuery({
    queryKey: ['kid', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from('kids').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
