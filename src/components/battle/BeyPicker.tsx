// src/components/battle/BeyPicker.tsx
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useDraftBattle } from '../../stores/draft-battle';
import type { Bey } from '../../lib/types';

export function BeyPicker() {
  const { setStep, patch } = useDraftBattle();
  const { data: beys } = useQuery({
    queryKey: ['beys', 'all'],
    queryFn: async () =>
      (await supabase.from('beys').select('*').eq('canonical', true).order('product_code'))
        .data ?? [],
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Welche Beys?</h2>
      <BeySection
        title="Mein Bey"
        beys={beys ?? []}
        onPick={(id) => patch({ my_bey_id: id })}
      />
      <BeySection
        title="Gegner-Bey"
        beys={beys ?? []}
        onPick={(id) => patch({ opp_bey_id: id })}
      />
      <button
        onClick={() => setStep('confirm')}
        className="w-full p-3 bg-bx-yellow text-black font-bold rounded"
      >
        Weiter →
      </button>
    </div>
  );
}

function BeySection({
  title,
  beys,
  onPick,
}: {
  title: string;
  beys: Bey[];
  onPick: (id: string | null) => void;
}) {
  return (
    <div>
      <p className="text-sm opacity-70 mb-2">{title}</p>
      <div className="grid grid-cols-3 gap-2">
        {beys.map((b) => (
          <button
            key={b.id}
            onClick={() => onPick(b.id)}
            className="p-2 bg-zinc-900 rounded text-xs aspect-square flex flex-col items-center justify-center"
          >
            <div className="w-8 h-8 rounded-full bg-bx-crimson mb-1"></div>
            <span>{b.name_en}</span>
          </button>
        ))}
        <button
          onClick={() => onPick(null)}
          className="p-2 bg-zinc-800 rounded text-xs italic opacity-60"
        >
          Unbekannt
        </button>
      </div>
    </div>
  );
}
