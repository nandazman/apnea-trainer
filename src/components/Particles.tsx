import { useMemo } from "react";

/** Drifting plankton — pure CSS animation. Hidden under reduced motion via .motion-reduced. */
export function Particles({ count = 24 }: { count?: number }) {
  const dots = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        left: Math.random() * 100,
        size: 2 + Math.random() * 4,
        dur: 14 + Math.random() * 22,
        delay: -Math.random() * 30,
      })),
    [count],
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-[1] overflow-hidden">
      {dots.map((d, i) => (
        <span
          key={i}
          className="plankton"
          style={{
            left: `${d.left}%`,
            bottom: 0,
            width: d.size,
            height: d.size,
            animationDuration: `${d.dur}s`,
            animationDelay: `${d.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
