// Web Audio beeps + SpeechSynthesis, gated by live settings flags.

let audioCtx: AudioContext | null = null;

export function ensureAudio(): AudioContext | null {
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (Ctx) audioCtx = new Ctx();
  }
  if (audioCtx && audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

export function beep(soundOn: boolean, freq = 880, dur = 0.15, vol = 0.35): void {
  if (!soundOn) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.value = freq;
  o.connect(g);
  g.connect(ctx.destination);
  const t0 = ctx.currentTime;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export function speak(voiceOn: boolean, text: string): void {
  if (!voiceOn) return;
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0;
    u.pitch = 1.0;
    u.volume = 1.0;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

export function cancelSpeech(): void {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

export function resumeAudioIfNeeded(): void {
  if (audioCtx && audioCtx.state === "suspended") void audioCtx.resume();
}
