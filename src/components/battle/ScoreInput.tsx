// src/components/battle/ScoreInput.tsx
import { useState } from 'react';
import { useDraftBattle } from '../../stores/draft-battle';

export function ScoreInput() {
  const { setStep, patch } = useDraftBattle();
  const [iWon, setIWon] = useState(true);
  const [my, setMy] = useState(3);
  const [opp, setOpp] = useState(1);

  function next() {
    patch({ i_won: iWon, my_score: my, opp_score: opp });
    setStep('beys');
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Wer hat gewonnen?</h2>
      <div className="space-y-2">
        <button
          onClick={() => setIWon(true)}
          className={`w-full p-4 rounded font-bold ${
            iWon ? 'bg-green-600' : 'bg-zinc-800 opacity-60'
          }`}
        >
          🏆 Ich hab gewonnen
        </button>
        <button
          onClick={() => setIWon(false)}
          className={`w-full p-4 rounded font-bold ${
            !iWon ? 'bg-red-600' : 'bg-zinc-800 opacity-60'
          }`}
        >
          😤 Ich hab verloren
        </button>
      </div>
      <div className="space-y-2 bg-zinc-900 p-3 rounded">
        <Stepper label="Ich" value={my} setValue={setMy} />
        <Stepper label="Gegner" value={opp} setValue={setOpp} />
        <div className="flex gap-2 mt-2">
          {[
            [3, 0],
            [3, 1],
            [3, 2],
            [5, 3],
          ].map(([a, b]) => (
            <button
              key={`${a}-${b}`}
              onClick={() => {
                setMy(a);
                setOpp(b);
              }}
              className="flex-1 p-2 bg-zinc-800 rounded text-sm"
            >
              {a}-{b}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={next}
        disabled={my <= opp}
        className="w-full p-3 bg-bx-yellow text-black font-bold rounded disabled:opacity-30"
      >
        Weiter →
      </button>
    </div>
  );
}

function Stepper({
  label,
  value,
  setValue,
}: {
  label: string;
  value: number;
  setValue: (n: number) => void;
}) {
  return (
    <div className="flex justify-between items-center">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setValue(Math.max(0, value - 1))}
          aria-label="Verringern"
          className="w-8 h-8 bg-zinc-700 rounded"
        >
          −
        </button>
        <span className="w-8 text-center font-bold text-xl">{value}</span>
        <button
          onClick={() => setValue(value + 1)}
          aria-label="Erhöhen"
          className="w-8 h-8 bg-zinc-700 rounded"
        >
          +
        </button>
      </div>
    </div>
  );
}
