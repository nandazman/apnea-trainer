import type { Phase } from "../lib/timer";

/** Bioluminescent orb. Scales via CSS keyed on the current phase. */
export function BreathOrb({ phase }: { phase: Phase }) {
  return (
    <div
      aria-hidden
      data-phase={phase}
      className="relative aspect-square w-[clamp(180px,48vw,320px)] rounded-full bg-[radial-gradient(circle_at_50%_45%,rgb(90_200_250/0.55),rgb(34_211_238/0.12)_55%,transparent_70%)] shadow-[0_0_60px_rgb(34_211_238/0.25),inset_0_0_60px_rgb(34_211_238/0.2)] will-change-transform [transition:transform_1.2s_cubic-bezier(0.4,0,0.2,1),filter_0.8s_ease] data-[phase=idle]:animate-orb-pulse data-[phase=prep]:scale-[0.85] data-[phase=prep]:[filter:hue-rotate(-15deg)] data-[phase=hold]:scale-[1.18] data-[phase=hold]:[filter:hue-rotate(-35deg)_saturate(1.3)] data-[phase=rest]:scale-[0.8] data-[phase=done]:scale-100 data-[phase=done]:[filter:brightness(1.2)] motion-reduce:animate-none! group-[.motion-reduced]:animate-none!"
    />
  );
}
