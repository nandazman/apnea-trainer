import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { fmt } from "../lib/format";
import type { Settings } from "../lib/types";
import type { TrainerApi } from "../state/useTrainer";

const numCls =
  "flex items-center justify-center tabular-nums font-thin tracking-[0.04em] text-[clamp(3.5rem,16vw,7rem)]";

// Cell height in em — a touch over 1 so the thin glyphs aren't clipped by the window.
const CELL = 1.15;
// Three stacked copies of 0–9 so a roll can cross the 9↔0 boundary without running
// out of strip; pos is renormalised back into the middle copy after each roll.
const STRIP = Array.from({ length: 30 }, (_, i) => i % 10);

/**
 * One digit column. Rolls the shortest way round the 0–9 ring to its target, so it
 * only moves when its own digit changes and the travel reflects the distance (e.g.
 * 5→8 rolls up 3, 0→9 rolls down 1). Non-digit chars (the colon) render static.
 */
function Digit({ ch, reduced, roll }: { ch: string; reduced: boolean; roll: boolean }) {
  const isDigit = ch >= "0" && ch <= "9";
  const target = isDigit ? Number(ch) : 0;
  const [pos, setPos] = useState(10 + target); // start in the middle copy
  const [animate, setAnimate] = useState(false);
  const prevTarget = useRef(target);
  const renorm = useRef(false);

  useEffect(() => {
    if (!isDigit || target === prevTarget.current) return;
    prevTarget.current = target;
    // Roll only on a round/phase change; plain per-second ticks (or reduced motion) snap.
    if (reduced || !roll) {
      setAnimate(false);
      setPos(10 + target);
      return;
    }
    const cur = ((pos % 10) + 10) % 10;
    let delta = target - cur;
    if (delta > 5) delta -= 10; // shortest way round the ring
    if (delta < -5) delta += 10;
    setAnimate(true);
    setPos((p) => p + delta);
  }, [target, isDigit, reduced, roll]);

  // After a roll, snap pos back into the middle copy (same digit shown) without animating.
  const onEnd = () => {
    setPos((p) => {
      let np = p;
      while (np < 10) np += 10;
      while (np > 19) np -= 10;
      if (np !== p) {
        renorm.current = true;
        setAnimate(false);
      }
      return np;
    });
  };

  // Re-enable transitions on the frame after a non-animated renorm.
  useLayoutEffect(() => {
    if (!animate && renorm.current) {
      renorm.current = false;
      const id = requestAnimationFrame(() => setAnimate(true));
      return () => cancelAnimationFrame(id);
    }
  }, [animate]);

  if (!isDigit) return <span style={{ lineHeight: `${CELL}em` }}>{ch}</span>;

  return (
    <span className="relative inline-block overflow-hidden" style={{ height: `${CELL}em` }}>
      <span
        className="flex flex-col"
        style={{
          transform: `translateY(${-pos * CELL}em)`,
          transition: animate ? "transform 1.1s cubic-bezier(0.4,0,0.2,1)" : "none",
        }}
        onTransitionEnd={onEnd}
      >
        {STRIP.map((d, i) => (
          <span key={i} className="text-center" style={{ height: `${CELL}em`, lineHeight: `${CELL}em` }}>
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

/** Per-digit odometer for the mm:ss timer — each column animates independently. */
function Odometer({ value, reduced, roundKey }: { value: string; reduced: boolean; roundKey: string }) {
  const [osReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const isReduced = reduced || osReduced;
  // Roll the digits only when the round/phase changes; ticks within a phase snap.
  const prevRound = useRef(roundKey);
  const roll = roundKey !== prevRound.current;
  useEffect(() => {
    prevRound.current = roundKey;
  }, [roundKey]);
  return (
    <div className={numCls} aria-hidden="true">
      {value.split("").map((ch, i) => (
        <Digit key={i} ch={ch} reduced={isReduced} roll={roll} />
      ))}
    </div>
  );
}

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
      <Odometer value={fmt(shown)} reduced={settings.motion === "reduced"} roundKey={`${phase}-${roundIdx}`} />
      <div className="text-sm text-ink-dim lowercase" aria-live="polite">{meta || "—"}</div>
      <div className="h-5 text-xs text-bio-soft lowercase" aria-live="polite">
        {next}
        {t.targetReached && isFree && <span aria-label="target reached"> ✓</span>}
      </div>
    </div>
  );
}
