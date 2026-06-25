import { useEffect, useRef } from "react";
import type { Phase } from "../lib/timer";

/**
 * Bioluminescent orb, two nested layers so animations don't fight over `transform`:
 *  - outer: phase scale (CSS transition) + per-round "kick" (Web Animations, composite add)
 *  - inner: visuals + a gentle breathing pulse during rest/idle (CSS keyframes)
 */
export function BreathOrb({ phase, round, focus = false }: { phase: Phase; round: number; focus?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  // Quick scale "kick" on every phase change (get ready / hold / breathe) so each
  // transition has an animated cue on top of the phase scale/filter transitions.
  // `round` is also a dep so back-to-back holds (rest: 0, phase stays "hold") still
  // fire. composite:"add" layers on top of the phase scale and self-removes.
  useEffect(() => {
    if (phase === "idle") return; // nothing to cue at rest (covers start/reset)
    const el = ref.current;
    if (!el || typeof el.animate !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.closest(".motion-reduced")) return;
    const anim = el.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.04)" }, { transform: "scale(1)" }],
      { duration: 1000, easing: "cubic-bezier(0.37,0,0.63,1)", composite: "add" },
    );
    return () => anim.cancel();
  }, [phase, round]);

  return (
    <div
      ref={ref}
      aria-hidden
      data-phase={phase}
      className={`group/orb pointer-events-none relative aspect-square ${focus ? "w-[clamp(280px,65vmin,560px)]" : "w-[clamp(180px,48vw,320px)]"} [will-change:transform,scale] [transition:scale_1.3s_cubic-bezier(0.37,0,0.63,1),width_0.7s_cubic-bezier(0.22,1,0.36,1)] data-[phase=prep]:scale-[0.85] data-[phase=hold]:scale-[1.18] data-[phase=rest]:scale-[0.8] data-[phase=done]:scale-100`}
    >
      <div
        className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_45%,rgb(90_200_250/0.55),rgb(34_211_238/0.12)_55%,transparent_70%)] shadow-[0_0_60px_rgb(34_211_238/0.25),inset_0_0_60px_rgb(34_211_238/0.2)] will-change-transform [transition:filter_1.1s_ease] group-data-[phase=idle]/orb:animate-orb-pulse group-data-[phase=prep]/orb:[filter:hue-rotate(-15deg)] group-data-[phase=hold]/orb:[filter:hue-rotate(-35deg)_saturate(1.3)] group-data-[phase=rest]/orb:animate-orb-breathe group-data-[phase=done]/orb:[filter:brightness(1.2)] motion-reduce:animate-none! group-[.motion-reduced]:animate-none!"
      />
    </div>
  );
}
