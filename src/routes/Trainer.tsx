import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BreathOrb } from "../components/BreathOrb";
import { ConfigPanels } from "../components/ConfigPanels";
import { Controls } from "../components/Controls";
import { ModeTabs } from "../components/ModeTabs";
import { RoundPreview } from "../components/RoundPreview";
import { Timer } from "../components/Timer";
import { ensureAudio } from "../lib/audio";
import { useApp } from "../state/AppContext";
import { useTrainer } from "../state/useTrainer";

export function Trainer() {
  const { settings, history } = useApp();
  const t = useTrainer(settings.settings, history.append);
  const focus = t.running;

  // Keep latest handlers in a ref so the listener registers once (rAF re-renders ~60x/s).
  const tRef = useRef(t);
  tRef.current = t;

  // Keep the stage in flow and translate it to true viewport center on start, so
  // it visibly travels from its in-card spot → center, and back out on finish/reset.
  // Measured on each start (config above it can change where "original" is).
  // Both the stage and the controls stay in flow (so the layout below never
  // collapses/jumps) and are moved with transforms: the orb to viewport center,
  // the controls to the bottom. Measured on each start (config above can shift them).
  const stageRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);
  const [ctrlY, setCtrlY] = useState(0);
  useLayoutEffect(() => {
    if (!focus) {
      setOffset(null);
      setCtrlY(0);
      return;
    }
    const el = stageRef.current; // untransformed: offsets are reset on entry
    if (el) {
      const r = el.getBoundingClientRect();
      setOffset({
        x: window.innerWidth / 2 - (r.left + r.width / 2),
        y: window.innerHeight / 2 - (r.top + r.height / 2),
      });
    }
    const c = controlsRef.current;
    if (c) setCtrlY(window.innerHeight - 40 - c.getBoundingClientRect().bottom);
  }, [focus]);

  // Lock page scroll during a session — only the controls stay interactive.
  useEffect(() => {
    if (!focus) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [focus]);

  // Keyboard: Space start/pause · S skip · R reset (ignored while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      const t = tRef.current;
      if (e.code === "Space") {
        e.preventDefault();
        ensureAudio();
        t.running ? t.togglePause() : t.start();
      } else if (e.key.toLowerCase() === "s") {
        if (t.running) t.skip();
      } else if (e.key.toLowerCase() === "r") {
        t.reset();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const currentIdx = t.phase === "hold" || t.phase === "rest" ? t.roundIdx : null;

  return (
    <div className={`group flex flex-col gap-6 ${t.running ? "trance" : ""}`}>
      <div className="flex flex-col gap-4 [transition:opacity_0.8s_ease] group-[.trance]:pointer-events-none group-[.trance]:opacity-[0.12]">
        <ModeTabs mode={settings.settings.mode} onSelect={settings.setMode} />
        <ConfigPanels api={settings} />
      </div>

      {/* focus backdrop: darkens the whole viewport incl. the header, sits behind the orb */}
      <div
        aria-hidden
        className={`fixed inset-0 z-30 bg-abyss/85 backdrop-blur-sm [transition:opacity_0.7s_ease] ${focus ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />

      <div
        ref={stageRef}
        style={{ transform: offset ? `translate(${offset.x}px,${offset.y}px)` : undefined }}
        className={`relative flex flex-col items-center justify-center py-6 [transition:transform_0.7s_cubic-bezier(0.22,1,0.36,1)] motion-reduce:[transition:none] group-[.motion-reduced]:[transition:none] ${focus ? "z-40" : ""}`}
      >
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <BreathOrb phase={t.phase} round={t.roundIdx} focus={focus} />
        </div>
        <div className="relative z-10">
          <Timer t={t} settings={settings.settings} />
        </div>
      </div>

      <div
        ref={controlsRef}
        style={{ transform: ctrlY ? `translateY(${ctrlY}px)` : undefined }}
        className={`relative flex justify-center [transition:transform_0.7s_cubic-bezier(0.22,1,0.36,1)] motion-reduce:[transition:none] group-[.motion-reduced]:[transition:none] ${focus ? "z-50" : ""}`}
      >
        <Controls t={t} />
      </div>

      <div key={settings.settings.mode} className="animate-surface [transition:opacity_0.8s_ease] group-[.trance]:pointer-events-none group-[.trance]:opacity-[0.12]">
        <RoundPreview table={t.table} currentIdx={currentIdx} />
      </div>
    </div>
  );
}
