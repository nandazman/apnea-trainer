import type { TrainerApi } from "../state/useTrainer";

const btn = "rounded-xl px-5 py-3 text-sm lowercase tracking-wide transition disabled:opacity-30";

export function Controls({ t }: { t: TrainerApi }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <button
        className={`${btn} bg-bio/20 text-bio hover:bg-bio/30`}
        onClick={() => (t.running ? t.togglePause() : t.start())}
      >
        {!t.running ? "start" : t.paused ? "resume" : "pause"}
      </button>
      <button className={`${btn} border border-glass-line text-ink-dim hover:text-ink`} disabled={!t.running} onClick={t.skip}>
        skip
      </button>
      <button className={`${btn} border border-glass-line text-ink-dim hover:text-ink`} onClick={t.reset}>
        reset
      </button>
    </div>
  );
}
