// src/components/tower/TowerRow.tsx
import type { Kid } from '../../lib/types';

export function TowerRow({
  kid,
  isMe,
  onTap,
}: {
  kid: Kid;
  isMe: boolean;
  onTap: () => void;
}) {
  const peak = kid.floor === 100;
  return (
    <button
      onClick={onTap}
      className={`w-full p-2 rounded flex items-center gap-3 ${
        peak
          ? 'bg-gradient-to-r from-bx-yellow via-orange-500 to-bx-crimson text-black'
          : isMe
            ? 'bg-bx-yellow/15 border border-bx-yellow/40'
            : 'bg-zinc-900'
      }`}
    >
      <span className="w-8 text-xs font-bold opacity-60">{kid.floor}</span>
      <span
        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
          peak ? 'bg-black/30' : 'bg-bx-cobalt'
        }`}
      >
        {kid.display_name[0]}
      </span>
      <span className="flex-1 text-left">
        {kid.display_name}
        {isMe && <em className="not-italic ml-1 opacity-70 text-xs">(du)</em>}
      </span>
      {peak && <span className="text-xs font-bold">👑 The Peak</span>}
    </button>
  );
}
