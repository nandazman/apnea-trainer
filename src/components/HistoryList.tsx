import { fmt } from "../lib/format";
import type { HistoryApi } from "../state/useHistory";

const inputCls = "rounded-lg bg-black/30 border border-glass-line px-2 py-1 text-ink outline-none focus:border-bio/50";

export function HistoryList({ api }: { api: HistoryApi }) {
  const { history, update, remove, personalBest } = api;

  if (!history.length) {
    return <p className="text-ink-dim lowercase">no sessions yet — complete a run to log it.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {history.map((e) => {
        const isPB = e.mode === "free" && e.maxHoldSec === personalBest && personalBest > 0;
        return (
          <li key={e.id} className="glass flex flex-col gap-2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-ink">
                <span className="uppercase tracking-wider text-bio">{e.mode}</span>
                {isPB && <span className="ml-2 rounded bg-phase-prep/20 px-2 py-0.5 text-xs text-phase-prep">new pb</span>}
              </span>
              <span className="text-xs text-ink-dim">{new Date(e.date).toLocaleString()}</span>
            </div>
            <div className="text-xs text-ink-dim lowercase tabular-nums">
              {e.rounds} rounds · total {fmt(e.totalSec)} · max hold {fmt(e.maxHoldSec)}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                className={inputCls + " min-w-0 flex-1"}
                placeholder="note…"
                defaultValue={e.note}
                onBlur={(ev) => update(e.id, { note: ev.target.value })}
              />
              <label className="flex items-center gap-1 text-xs text-ink-dim">
                rpe
                <input
                  className={inputCls + " w-16"}
                  type="number"
                  min={1}
                  max={10}
                  defaultValue={e.rpe ?? ""}
                  onBlur={(ev) => {
                    const v = parseInt(ev.target.value, 10);
                    update(e.id, { rpe: isNaN(v) ? null : Math.max(1, Math.min(10, v)) });
                  }}
                />
              </label>
              <button className="rounded-lg px-2 py-1 text-ink-dim hover:text-phase-hold" title="Delete" onClick={() => remove(e.id)}>
                ✕
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
