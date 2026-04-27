// src/components/battle/DisputeSheet.tsx
import { useState } from 'react';
import { useDisputeBattle } from '../../hooks/useDispute';

const REASONS: Array<{ code: string; emoji: string; label: string }> = [
  { code: 'wrong_score', emoji: '📊', label: 'Score stimmt nicht' },
  { code: 'didnt_happen', emoji: '👻', label: "Das gab's gar nicht" },
  { code: 'wrong_opponent', emoji: '🔄', label: 'Falsche Person' },
  { code: 'wrong_bey', emoji: '🎯', label: 'Falscher Bey' },
  { code: 'other', emoji: '…', label: 'Was anderes' },
];

export function DisputeSheet({ battleId, onClose }: { battleId: string; onClose: () => void }) {
  const dispute = useDisputeBattle();
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');

  async function submit() {
    if (!reason) return;
    await dispute.mutateAsync({
      battle_id: battleId,
      reason_code: reason,
      note: note.slice(0, 200),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end z-50">
      <div className="bg-zinc-900 w-full p-4 rounded-t-2xl space-y-3">
        <h3 className="font-bold">Was stimmt nicht?</h3>
        {REASONS.map((r) => (
          <button
            key={r.code}
            onClick={() => setReason(r.code)}
            className={`w-full p-3 rounded text-left flex items-center gap-3 ${
              reason === r.code ? 'bg-red-900' : 'bg-zinc-800'
            }`}
          >
            <span>{r.emoji}</span>
            <span>{r.label}</span>
          </button>
        ))}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Was war wirklich? (optional)"
          maxLength={200}
          className="w-full p-2 bg-zinc-800 rounded text-sm"
          rows={2}
        />
        <p className="text-xs text-yellow-500">
          Wenn du das meldest, zählt die Schlacht sofort nicht mehr.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 p-3 bg-zinc-700 rounded">
            Doch nicht
          </button>
          <button
            onClick={submit}
            disabled={!reason || dispute.isPending}
            className="flex-1 p-3 bg-red-600 font-bold rounded disabled:opacity-30"
          >
            🚩 Melden
          </button>
        </div>
      </div>
    </div>
  );
}
