// PrimaryBeySetter — UI that sets/unsets the kid's `primary_bey_id`. Used in
// the Beys tab (ProfilePage). The currently-set bey shows a ⭐ badge in the
// collection grid; tapping the setter button toggles it. Spec section 5.6.

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../stores/session';
import type { Bey } from '../../lib/types';

interface Props {
  bey: Bey;
  /** True if this bey is currently the kid's primary. Drives copy + visual. */
  isPrimary: boolean;
}

export function PrimaryBeySetter({ bey, isPrimary }: Props) {
  const { kid } = useSession();
  const qc = useQueryClient();
  const [toast, setToast] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (next: string | null) => {
      if (!kid) throw new Error('not logged in');
      const { error } = await supabase
        .from('kids')
        .update({ primary_bey_id: next })
        .eq('id', kid.id)
        .select('id');
      if (error) throw error;
    },
    onSuccess: (_, next) => {
      qc.invalidateQueries({ queryKey: ['kid', kid?.id] });
      qc.invalidateQueries({ queryKey: ['lab', 'crew-with-primary'] });
      setToast(next === null ? 'Haupt-Bey entfernt' : 'Haupt-Bey gesetzt');
      setTimeout(() => setToast(null), 1800);
    },
  });

  const onClick = () => {
    if (mutation.isPending) return;
    mutation.mutate(isPrimary ? null : bey.id);
  };

  return (
    <>
      <button
        onClick={onClick}
        disabled={mutation.isPending}
        className={`bx-btn ${isPrimary ? 'bx-btn-yellow' : 'bx-btn-ghost'}`}
        style={{ padding: '8px 12px', fontSize: 12, opacity: mutation.isPending ? 0.6 : 1 }}
      >
        {isPrimary ? '⭐ Haupt-Bey' : 'Als Haupt-Bey setzen'}
      </button>
      {toast && (
        <div
          role="status"
          className="bx-mono"
          style={{
            position: 'fixed',
            bottom: 'max(110px, calc(env(safe-area-inset-bottom) + 90px))',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(34,197,94,0.18)',
            border: '1px solid rgba(34,197,94,0.5)',
            color: '#22c55e',
            padding: '8px 14px',
            borderRadius: 8,
            fontSize: 11,
            letterSpacing: '0.1em',
            zIndex: 70,
          }}
        >
          {toast}
        </div>
      )}
    </>
  );
}
