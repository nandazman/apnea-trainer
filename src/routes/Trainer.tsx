import { useEffect, useRef } from "react";
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

  // Keep latest handlers in a ref so the listener registers once (rAF re-renders ~60x/s).
  const tRef = useRef(t);
  tRef.current = t;

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

      <div className="relative flex flex-col items-center justify-center py-6">
        <div className="absolute inset-0 flex items-center justify-center">
          <BreathOrb phase={t.phase} />
        </div>
        <div className="relative z-10">
          <Timer t={t} settings={settings.settings} />
        </div>
      </div>

      <Controls t={t} />

      <div key={settings.settings.mode} className="animate-surface [transition:opacity_0.8s_ease] group-[.trance]:pointer-events-none group-[.trance]:opacity-[0.12]">
        <RoundPreview table={t.table} currentIdx={currentIdx} />
      </div>
    </div>
  );
}
