import type { Phase } from "../lib/timer";

/** Bioluminescent orb. Scales via CSS keyed on the current phase. */
export function BreathOrb({ phase }: { phase: Phase }) {
  return <div aria-hidden className="orb" data-phase={phase} />;
}
