// src/components/battle/OpponentPicker.tsx
import { useAllKids } from '../../hooks/useKid';
import { useSession } from '../../stores/session';
import { useDraftBattle } from '../../stores/draft-battle';

export function OpponentPicker() {
  const { kid: me } = useSession();
  const { data: kids } = useAllKids();
  const { patch, setStep } = useDraftBattle();

  function pick(opp_id: string) {
    patch({ opponent_kid_id: opp_id });
    setStep('score');
  }

  const others = kids?.filter((k) => k.id !== me?.id) ?? [];
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Wer war dein Gegner?</h2>
      <ul className="space-y-2">
        {others.map((k) => (
          <li key={k.id}>
            <button
              onClick={() => pick(k.id)}
              className="w-full text-left p-3 bg-zinc-900 rounded flex items-center gap-3"
            >
              <span className="w-10 h-10 rounded-full bg-bx-cobalt flex items-center justify-center font-bold">
                {k.display_name[0]}
              </span>
              <span className="flex-1 font-bold">{k.display_name}</span>
              <span className="opacity-60 text-sm">Etage {k.floor}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
