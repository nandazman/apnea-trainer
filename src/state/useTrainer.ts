import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SessionLog, Settings } from "../lib/types";
import { buildTable, nextPhase, type Phase } from "../lib/timer";
import { beep, cancelSpeech, ensureAudio, speak } from "../lib/audio";

interface Runtime {
  running: boolean;
  paused: boolean;
  phase: Phase;
  roundIdx: number;
  phaseStart: number;
  phaseEnd: number;
  pausedRemaining: number;
  freeElapsed: number; // ms
  rafId: number;
  lastBeepSec: number;
  lastVoiceSec: number;
  freeTargetHit: boolean;
}

const fresh = (): Runtime => ({
  running: false,
  paused: false,
  phase: "idle",
  roundIdx: 0,
  phaseStart: 0,
  phaseEnd: 0,
  pausedRemaining: 0,
  freeElapsed: 0,
  rafId: 0,
  lastBeepSec: -1,
  lastVoiceSec: -1,
  freeTargetHit: false,
});

export function useTrainer(settings: Settings, onComplete: (e: SessionLog) => void) {
  const table = useMemo(() => buildTable(settings), [settings]);
  const isFree = settings.mode === "free";

  // Live refs so the rAF loop never reads stale values.
  const rt = useRef<Runtime>(fresh());
  const settingsRef = useRef(settings);
  const tableRef = useRef(table);
  const wakeRef = useRef<WakeLockSentinel | null>(null);
  const onCompleteRef = useRef(onComplete);
  settingsRef.current = settings;
  tableRef.current = table;
  onCompleteRef.current = onComplete;

  // Render-facing state.
  const [phase, setPhase] = useState<Phase>("idle");
  const [roundIdx, setRoundIdx] = useState(0);
  const [displaySec, setDisplaySec] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [targetReached, setTargetReached] = useState(false);

  const sync = useCallback(() => {
    setPhase(rt.current.phase);
    setRoundIdx(rt.current.roundIdx);
    setRunning(rt.current.running);
    setPaused(rt.current.paused);
  }, []);

  const applyWake = useCallback(async () => {
    const want = settingsRef.current.wakeOn && rt.current.running;
    if (want) {
      try {
        if ("wakeLock" in navigator && !wakeRef.current) {
          wakeRef.current = await navigator.wakeLock.request("screen");
          wakeRef.current.addEventListener("release", () => {
            wakeRef.current = null;
          });
        }
      } catch {
        /* ignore */
      }
    } else if (wakeRef.current) {
      try {
        await wakeRef.current.release();
      } catch {
        /* ignore */
      }
      wakeRef.current = null;
    }
  }, []);

  const holdMs = (i: number) => (isFreeRef() ? 0 : (tableRef.current[i]?.hold ?? 0) * 1000);
  const restMs = (i: number) => (tableRef.current[i]?.rest ?? 0) * 1000;
  const isFreeRef = () => settingsRef.current.mode === "free";

  const enterPhase = useCallback((next: Phase, durationMs: number) => {
    const r = rt.current;
    const s = settingsRef.current;
    r.phase = next;
    r.phaseStart = performance.now();
    r.phaseEnd = r.phaseStart + durationMs;
    r.lastBeepSec = -1;
    r.lastVoiceSec = -1;

    if (next === "prep") {
      speak(s.voiceOn, "Get ready");
    } else if (next === "hold") {
      speak(s.voiceOn, "Hold");
      if (isFreeRef()) {
        r.freeElapsed = 0;
        r.freeTargetHit = false;
        setTargetReached(false);
      } else {
        beep(s.soundOn, 660, 0.25, 0.4);
      }
    } else if (next === "rest") {
      speak(s.voiceOn, "Breathe");
      beep(s.soundOn, 440, 0.25, 0.4);
    } else if (next === "done") {
      speak(s.voiceOn, "Done");
      beep(s.soundOn, 880, 0.2, 0.4);
      setTimeout(() => beep(settingsRef.current.soundOn, 1175, 0.3, 0.4), 220);
      r.running = false;
      logSession();
      void applyWake();
    }
    sync();
  }, [applyWake, sync]);

  const advance = useCallback(() => {
    const r = rt.current;
    const { phase: np, roundIdx: ni } = nextPhase(r.phase, r.roundIdx, tableRef.current, isFreeRef());
    r.roundIdx = ni;
    if (np === "hold") enterPhase("hold", holdMs(ni));
    else if (np === "rest") enterPhase("rest", restMs(ni));
    else if (np === "done") enterPhase("done", 0);
  }, [enterPhase]);

  const tick = useCallback(() => {
    const r = rt.current;
    if (!r.running || r.paused) return;
    const now = performance.now();
    const s = settingsRef.current;

    if (isFreeRef() && r.phase === "hold") {
      const elapsed = r.freeElapsed + (now - r.phaseStart);
      setDisplaySec(Math.floor(elapsed / 1000));
      const target = s.config.free.target;
      if (target > 0 && elapsed >= target * 1000 && !r.freeTargetHit) {
        beep(s.soundOn, 1175, 0.3, 0.4);
        r.freeTargetHit = true;
        setTargetReached(true);
      }
      r.rafId = requestAnimationFrame(tick);
      return;
    }

    const remaining = r.phaseEnd - now;
    if (remaining <= 0) {
      advance();
      if (r.running) r.rafId = requestAnimationFrame(tick);
      return;
    }

    setDisplaySec(Math.ceil(remaining / 1000));
    // 5→1s countdown cues
    const secs = Math.ceil(remaining / 1000);
    if (secs <= 5 && secs >= 1 && secs !== r.lastBeepSec) {
      r.lastBeepSec = secs;
      beep(s.soundOn, secs === 1 ? 988 : 660, 0.08, 0.25);
      if (s.voiceOn && secs !== r.lastVoiceSec) {
        r.lastVoiceSec = secs;
        speak(s.voiceOn, String(secs));
      }
    }
    r.rafId = requestAnimationFrame(tick);
  }, [advance]);

  function logSession() {
    const t = tableRef.current;
    const s = settingsRef.current;
    let rounds: number, totalSec: number, maxHoldSec: number;
    if (s.mode === "free") {
      rounds = 1;
      maxHoldSec = Math.floor(rt.current.freeElapsed / 1000);
      totalSec = maxHoldSec;
    } else {
      rounds = t.length;
      // ponytail: planned totals (match the preview). Switch to wall-clock if skips need to count.
      totalSec = t.reduce((sum, r) => sum + r.hold + r.rest, 0);
      maxHoldSec = t.reduce((m, r) => Math.max(m, r.hold), 0);
    }
    onCompleteRef.current({
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      mode: s.mode,
      rounds,
      totalSec,
      maxHoldSec,
      note: "",
      rpe: null,
    });
  }

  const start = useCallback(() => {
    if (!isFreeRef() && tableRef.current.length === 0) return;
    ensureAudio();
    cancelAnimationFrame(rt.current.rafId);
    rt.current = fresh();
    rt.current.running = true;
    const s = settingsRef.current;
    if (s.prep > 0) enterPhase("prep", s.prep * 1000);
    else enterPhase("hold", holdMs(0));
    void applyWake();
    rt.current.rafId = requestAnimationFrame(tick);
  }, [applyWake, enterPhase, tick]);

  const togglePause = useCallback(() => {
    const r = rt.current;
    if (!r.running) return;
    if (!r.paused) {
      r.paused = true;
      r.pausedRemaining = Math.max(0, r.phaseEnd - performance.now());
      if (isFreeRef() && r.phase === "hold") r.freeElapsed += performance.now() - r.phaseStart;
      cancelAnimationFrame(r.rafId);
    } else {
      r.paused = false;
      const now = performance.now();
      r.phaseStart = now;
      r.phaseEnd = now + r.pausedRemaining;
      r.rafId = requestAnimationFrame(tick);
    }
    sync();
  }, [sync, tick]);

  const skip = useCallback(() => {
    const r = rt.current;
    if (!r.running) return;
    if (isFreeRef() && r.phase === "hold") {
      r.freeElapsed += performance.now() - r.phaseStart;
      enterPhase("done", 0);
      return;
    }
    advance();
  }, [advance, enterPhase]);

  const reset = useCallback(() => {
    cancelAnimationFrame(rt.current.rafId);
    cancelSpeech();
    rt.current = fresh();
    setDisplaySec(0);
    setTargetReached(false);
    void applyWake();
    sync();
  }, [applyWake, sync]);

  // Keep audio/wake alive when returning to the tab.
  useEffect(() => {
    const onVis = () => {
      if (!document.hidden) {
        ensureAudio();
        if (settingsRef.current.wakeOn && rt.current.running) void applyWake();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      cancelAnimationFrame(rt.current.rafId);
      cancelSpeech();
    };
  }, [applyWake]);

  return {
    table,
    isFree,
    phase,
    roundIdx,
    displaySec,
    running,
    paused,
    targetReached,
    start,
    togglePause,
    skip,
    reset,
  };
}

export type TrainerApi = ReturnType<typeof useTrainer>;
