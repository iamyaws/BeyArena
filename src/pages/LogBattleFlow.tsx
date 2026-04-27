// src/pages/LogBattleFlow.tsx
import { useDraftBattle } from '../stores/draft-battle';
import { OpponentPicker } from '../components/battle/OpponentPicker';
import { ScoreInput } from '../components/battle/ScoreInput';
import { BeyPicker } from '../components/battle/BeyPicker';
import { LogBattleConfirm } from '../components/battle/LogBattleConfirm';

export function LogBattleFlow() {
  const step = useDraftBattle((s) => s.step);
  return (
    <div className="min-h-screen bg-black text-white p-4">
      {step === 'opponent' && <OpponentPicker />}
      {step === 'score' && <ScoreInput />}
      {step === 'beys' && <BeyPicker />}
      {step === 'confirm' && <LogBattleConfirm />}
    </div>
  );
}
