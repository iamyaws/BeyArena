// src/components/profile/StatGrid.tsx
export function StatGrid({
  stats,
}: {
  stats: Array<{ label: string; value: string | number }>;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {stats.map((s) => (
        <div key={s.label} className="bg-zinc-900 rounded p-3 text-center">
          <div className="text-2xl font-bold text-bx-yellow">{s.value}</div>
          <div className="text-xs opacity-60 mt-1">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
