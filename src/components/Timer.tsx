import { fmt } from "../lib/format";
import type { Settings } from "../lib/types";
import type { TrainerApi } from "../state/useTrainer";

const PHASE_LABEL: Record<string, string> = {
  idle: "ready",
  prep: "get ready",
  hold: "hold",
  rest: "rest",
  done: "done",
};

const PHASE_COLOR: Record<string, string> = {
  idle: "text-ink-dim",
  prep: "text-phase-prep",
  hold: "text-phase-hold",
  rest: "text-phase-rest",
  done: "text-phase-done",
};

/** Phase label, big numerals, and meta/next lines — ported from the original renderRuntime. */
export function Timer({ t, settings }: { t: TrainerApi; settings: Settings }) {
  const { phase, roundIdx, displaySec, table, isFree } = t;
  const total = table.length;
  const round = roundIdx + 1;

  let shown = displaySec;
  let meta = "";
  let next = "";

  if (phase === "idle") {
    if (isFree) {
      shown = 0;
      meta = "free hold — counts up. skip/stop to finish.";
    } else if (total) {
      shown = settings.prep || table[0].hold;
      meta = `${total} rounds · first hold ${fmt(table[0].hold)}`;
    } else {
      shown = 0;
      meta = "configure rounds to start.";
    }
  } else if (phase === "prep") {
    meta = isFree ? "breathe up. hold begins after prep." : `round 1/${total} starting`;
    next = isFree ? "next: hold" : `next: hold ${fmt(table[0]?.hold ?? 0)}`;
  } else if (phase === "hold") {
    if (isFree) {
      meta = "free hold — counts up";
      next = settings.config.free.target > 0 ? `target ${fmt(settings.config.free.target)}` : "";
    } else {
      meta = `round ${round}/${total}`;
      const rest = table[roundIdx].rest;
      if (round < total) {
        const nh = table[roundIdx + 1]?.hold ?? 0;
        next = rest > 0 ? `next: rest ${fmt(rest)} → hold ${fmt(nh)}` : `next: hold ${fmt(nh)}`;
      } else {
        next = "last round";
      }
    }
  } else if (phase === "rest") {
    meta = `round ${round}/${total} done`;
    const nh = table[roundIdx + 1]?.hold;
    next = nh ? `next: hold ${fmt(nh)}` : "next: finish";
  } else if (phase === "done") {
    meta = isFree ? `final hold: ${fmt(displaySec)}` : `${total} rounds complete`;
  }

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className={`text-sm uppercase tracking-[0.3em] ${PHASE_COLOR[phase]}`} aria-live="polite">{PHASE_LABEL[phase]}</div>
      <div className="tabular-nums font-thin leading-none tracking-[0.04em] text-[clamp(3.5rem,16vw,7rem)]" aria-hidden="true">{fmt(shown)}</div>
      <div className="text-sm text-ink-dim lowercase" aria-live="polite">{meta || "—"}</div>
      <div className="h-5 text-xs text-bio-soft lowercase" aria-live="polite">
        {next}
        {t.targetReached && isFree && <span aria-label="target reached"> ✓</span>}
      </div>
    </div>
  );
}
