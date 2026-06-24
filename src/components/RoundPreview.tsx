import { fmt } from "../lib/format";
import type { Round } from "../lib/types";

export function RoundPreview({
  table,
  currentIdx,
}: {
  table: Round[];
  currentIdx: number | null;
}) {
  if (!table.length || table[0]?.free) return null;
  const total = table.reduce((s, r) => s + r.hold + r.rest, 0);
  return (
    <div className="glass p-4">
      <ol className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-2">
        {table.map((r, i) => (
          <li
            key={i}
            aria-current={i === currentIdx ? "step" : undefined}
            className={`rounded-lg border px-3 py-1.5 text-center text-sm tabular-nums [transition:color_150ms,background-color_150ms,border-color_150ms] ${
              i === currentIdx
                ? "border-bio/60 bg-bio/15 text-bio"
                : "border-glass-line text-ink-dim"
            }`}
          >
            <span className="mr-1 opacity-60">#{i + 1}</span>
            {fmt(r.hold)}
            {r.rest ? ` / ${fmt(r.rest)}` : ""}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-ink-dim lowercase">
        {table.length} rounds · total ≈ {fmt(total)}
      </p>
    </div>
  );
}
