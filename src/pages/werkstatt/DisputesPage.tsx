import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Battle, Dispute } from '../../lib/types';

type VoidedBattle = Battle & { disputes: Dispute[] };

export function DisputesPage() {
  const qc = useQueryClient();
  const { data: voided = [] } = useQuery<VoidedBattle[]>({
    queryKey: ['voided'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('battles')
        .select('*, disputes(*)')
        .eq('status', 'voided')
        .order('voided_at', { ascending: false });
      if (error) throw error;
      // Supabase's typed select can return SelectQueryError on join inference failures;
      // we cast through unknown since the runtime shape matches VoidedBattle.
      return (data ?? []) as unknown as VoidedBattle[];
    },
  });

  const override = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('battles')
        .update({
          status: 'confirmed',
          voided_at: null,
          voided_reason: 'admin_override',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
      // Trigger ELO recompute via cron (will pick up via separate run)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['voided'] }),
  });

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold">Gemeldete Schlachten</h2>
      {voided.length === 0 && (
        <div className="text-sm opacity-50">Keine offenen Disputes.</div>
      )}
      {voided.map((b) => (
        <div key={b.id} className="p-3 bg-zinc-900 rounded">
          <div className="text-sm">
            Battle {b.id.slice(0, 8)} — voided {b.voided_reason ?? 'unknown'}
          </div>
          <button
            onClick={() => override.mutate(b.id)}
            disabled={override.isPending}
            className="text-xs text-bx-yellow mt-1 disabled:opacity-30"
          >
            Doch zählen lassen
          </button>
        </div>
      ))}
    </div>
  );
}
