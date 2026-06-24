import type { Round, Settings } from "./types";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Build the round table for the current mode/config. Pure — safe to test. */
export function buildTable(settings: Settings): Round[] {
  const m = settings.mode;

  if (m === "co2") {
    const c = settings.config.co2;
    const rounds = Math.max(1, c.rounds | 0);
    const out: Round[] = [];
    for (let i = 0; i < rounds; i++) {
      const t = rounds === 1 ? 0 : i / (rounds - 1);
      const rest = Math.round(lerp(c.restStart, c.restEnd, t));
      out.push({ hold: c.hold, rest: i === rounds - 1 ? 0 : rest });
    }
    return out;
  }

  if (m === "o2") {
    const c = settings.config.o2;
    const rounds = Math.max(1, c.rounds | 0);
    const out: Round[] = [];
    for (let i = 0; i < rounds; i++) {
      const t = rounds === 1 ? 0 : i / (rounds - 1);
      const hold = Math.round(lerp(c.holdStart, c.holdEnd, t));
      out.push({ hold, rest: i === rounds - 1 ? 0 : c.rest });
    }
    return out;
  }

  if (m === "free") {
    return [{ hold: 0, rest: 0, free: true }];
  }

  // custom
  const rows = (settings.config.custom.rounds || []).filter((r) => r.hold > 0);
  return rows.map((r, i) => ({
    hold: r.hold,
    rest: i === rows.length - 1 ? 0 : r.rest,
  }));
}

export type Phase = "idle" | "prep" | "hold" | "rest" | "done";

/**
 * Pure phase transition: given current phase/round and the table, what's next.
 * `free` collapses hold -> done. Returns the next phase and round index.
 */
export function nextPhase(
  phase: Phase,
  roundIdx: number,
  table: Round[],
  isFree: boolean,
): { phase: Phase; roundIdx: number } {
  if (phase === "prep") return { phase: "hold", roundIdx };
  if (phase === "hold") {
    if (isFree) return { phase: "done", roundIdx };
    if ((table[roundIdx]?.rest ?? 0) > 0) return { phase: "rest", roundIdx };
    return stepRound(roundIdx, table);
  }
  if (phase === "rest") return stepRound(roundIdx, table);
  return { phase, roundIdx };
}

function stepRound(roundIdx: number, table: Round[]): { phase: Phase; roundIdx: number } {
  const next = roundIdx + 1;
  if (next >= table.length) return { phase: "done", roundIdx };
  return { phase: "hold", roundIdx: next };
}
