import type { Mode } from "../lib/types";

const TABS: { mode: Mode; label: string }[] = [
  { mode: "co2", label: "co₂" },
  { mode: "o2", label: "o₂" },
  { mode: "free", label: "free" },
  { mode: "custom", label: "custom" },
];

export function ModeTabs({ mode, onSelect }: { mode: Mode; onSelect: (m: Mode) => void }) {
  return (
    <div className="glass flex gap-1 p-1">
      {TABS.map((t) => (
        <button
          key={t.mode}
          aria-pressed={mode === t.mode}
          onClick={() => onSelect(t.mode)}
          className={`flex-1 rounded-lg px-3 py-2 text-sm lowercase tracking-wide transition-colors transition-transform active:scale-[0.97] ${
            mode === t.mode ? "bg-bio/15 text-bio" : "text-ink-dim hover:text-ink"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
