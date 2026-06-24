"use strict";

// ============================================================
// Apnea Trainer — CO2 / O2 / Free / Custom
// ============================================================

const STORAGE_KEY = "apnea-trainer-v1";

const defaults = {
  mode: "co2",
  config: {
    co2: { hold: 60, rounds: 8, restStart: 120, restEnd: 15 },
    o2:  { rest: 120, rounds: 8, holdStart: 60, holdEnd: 150 },
    free: { target: 0 },
    custom: { rounds: [
      { hold: 30, rest: 30 },
      { hold: 45, rest: 30 },
      { hold: 60, rest: 30 },
      { hold: 75, rest: 0 },
    ]},
  },
  prep: 10,
  soundOn: true,
  voiceOn: true,
  wakeOn: false,
};

const presets = [
  { id: "co2-beginner", mode: "co2", name: "CO₂ — beginner (8×, hold 1:00, rest 2:00→0:45)",
    cfg: { hold: 60, rounds: 8, restStart: 120, restEnd: 45 } },
  { id: "co2-classic",  mode: "co2", name: "CO₂ — classic (8×, hold 1:00, rest 2:00→0:15)",
    cfg: { hold: 60, rounds: 8, restStart: 120, restEnd: 15 } },
  { id: "co2-advanced", mode: "co2", name: "CO₂ — advanced (8×, hold 1:30, rest 1:45→0:15)",
    cfg: { hold: 90, rounds: 8, restStart: 105, restEnd: 15 } },
  { id: "o2-beginner",  mode: "o2",  name: "O₂ — beginner (8×, rest 2:00, hold 1:00→2:00)",
    cfg: { rest: 120, rounds: 8, holdStart: 60, holdEnd: 120 } },
  { id: "o2-classic",   mode: "o2",  name: "O₂ — classic (8×, rest 2:00, hold 1:00→2:30)",
    cfg: { rest: 120, rounds: 8, holdStart: 60, holdEnd: 150 } },
  { id: "o2-advanced",  mode: "o2",  name: "O₂ — advanced (8×, rest 2:00, hold 1:30→3:00)",
    cfg: { rest: 120, rounds: 8, holdStart: 90, holdEnd: 180 } },
];

// ----- state -----
const settings = load();
let runtime = freshRuntime();
let table = []; // [{hold, rest}] computed from current mode/config
let wakeLock = null;

function freshRuntime() {
  return {
    running: false,
    paused: false,
    phase: "idle", // idle | prep | hold | rest | done
    roundIdx: 0,   // 0-based index into table
    phaseEnd: 0,
    phaseStart: 0,
    pausedRemaining: 0,
    freeElapsed: 0, // ms, for free mode
    rafId: 0,
    lastBeepSec: -1,
    lastVoiceSec: -1,
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaults);
    const parsed = JSON.parse(raw);
    return Object.assign(structuredClone(defaults), parsed, {
      config: Object.assign(structuredClone(defaults.config), parsed.config || {}),
    });
  } catch {
    return structuredClone(defaults);
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

// ----- time formatting -----
function fmt(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function parseTime(str) {
  if (str == null) return 0;
  if (typeof str === "number") return Math.max(0, Math.round(str));
  const t = String(str).trim();
  if (!t) return 0;
  if (t.includes(":")) {
    const parts = t.split(":").map(s => parseInt(s, 10) || 0);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  const n = parseFloat(t);
  return isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

// ----- table generation -----
function buildTable() {
  const m = settings.mode;
  const c = settings.config[m];

  if (m === "co2") {
    const rounds = Math.max(1, c.rounds | 0);
    const out = [];
    for (let i = 0; i < rounds; i++) {
      const t = rounds === 1 ? 0 : i / (rounds - 1);
      const rest = Math.round(lerp(c.restStart, c.restEnd, t));
      out.push({ hold: c.hold, rest: i === rounds - 1 ? 0 : rest });
    }
    return out;
  }

  if (m === "o2") {
    const rounds = Math.max(1, c.rounds | 0);
    const out = [];
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

  if (m === "custom") {
    const rows = (c.rounds || []).filter(r => r.hold > 0);
    if (!rows.length) return [];
    return rows.map((r, i) => ({
      hold: r.hold,
      rest: i === rows.length - 1 ? 0 : r.rest,
    }));
  }

  return [];
}

function lerp(a, b, t) { return a + (b - a) * t; }

// ----- audio -----
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) audioCtx = new Ctx();
  }
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function beep(freq = 880, dur = 0.15, vol = 0.35) {
  if (!settings.soundOn) return;
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

function speak(text) {
  if (!settings.voiceOn) return;
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0;
    u.pitch = 1.0;
    u.volume = 1.0;
    window.speechSynthesis.speak(u);
  } catch {}
}

// ----- wake lock -----
async function applyWake() {
  if (settings.wakeOn && runtime.running) {
    try {
      if ("wakeLock" in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => { wakeLock = null; });
      }
    } catch {}
  } else if (wakeLock) {
    try { await wakeLock.release(); } catch {}
    wakeLock = null;
  }
}

// ----- DOM refs -----
const el = (id) => document.getElementById(id);
const $modes = document.querySelectorAll(".mode-btn");
const $panels = document.querySelectorAll(".config-panel");
const $configInputs = document.querySelectorAll("[data-k]");
const $preview = el("previewSection");
const $roundList = el("roundList");
const $totalLine = el("totalLine");
const $phase = el("phaseLabel");
const $time = el("timeDisplay");
const $meta = el("metaLine");
const $next = el("nextLine");
const $timer = document.querySelector(".timer");
const $start = el("startBtn");
const $pause = el("pauseBtn");
const $skip = el("skipBtn");
const $reset = el("resetBtn");
const $sound = el("soundOn");
const $voice = el("voiceOn");
const $prep = el("prepSec");
const $wake = el("wakeOn");
const $generate = el("generateBtn");
const $preset = el("presetSelect");
const $presetApply = el("presetApply");
const $customList = el("customList");
const $customAdd = el("customAdd");

// ----- init UI -----
function init() {
  // mode tabs
  $modes.forEach(b => {
    b.addEventListener("click", () => setMode(b.dataset.mode));
  });

  // config inputs
  $configInputs.forEach(inp => {
    const [section, key] = inp.dataset.k.split(".");
    if (section === "co2" || section === "o2") {
      if (key === "rounds") inp.type = "number";
    }
    inp.addEventListener("input", () => {
      const val = inp.type === "number" ? parseInt(inp.value, 10) || 0 : parseTime(inp.value);
      settings.config[section][key] = val;
      save();
      rebuildAndPreview();
    });
    inp.addEventListener("blur", () => {
      if (inp.type !== "number") {
        const v = parseTime(inp.value);
        inp.value = inp.dataset.k.endsWith("target") && v === 0 ? "" : fmt(v);
      }
    });
  });

  // settings
  $sound.checked = settings.soundOn;
  $voice.checked = settings.voiceOn;
  $wake.checked = settings.wakeOn;
  $prep.value = settings.prep;
  $sound.addEventListener("change", () => { settings.soundOn = $sound.checked; save(); });
  $voice.addEventListener("change", () => { settings.voiceOn = $voice.checked; save(); });
  $wake.addEventListener("change", () => { settings.wakeOn = $wake.checked; save(); applyWake(); });
  $prep.addEventListener("input", () => {
    settings.prep = Math.max(0, Math.min(60, parseInt($prep.value, 10) || 0));
    save();
  });

  // controls
  $start.addEventListener("click", () => {
    ensureAudio();
    if (!runtime.running) start();
    else togglePause();
  });
  $pause.addEventListener("click", togglePause);
  $skip.addEventListener("click", skip);
  $reset.addEventListener("click", reset);

  // generate / presets
  $generate.addEventListener("click", () => {
    rebuildAndPreview();
    reset();
  });
  populatePresets();
  $presetApply.addEventListener("click", applyPreset);

  // custom add
  $customAdd.addEventListener("click", () => {
    settings.config.custom.rounds.push({ hold: 30, rest: 30 });
    save();
    renderCustom();
    rebuildAndPreview();
  });

  // keyboard
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
    if (e.code === "Space") { e.preventDefault(); $start.click(); }
    else if (e.key === "s" || e.key === "S") { if (!$skip.disabled) skip(); }
    else if (e.key === "r" || e.key === "R") reset();
  });

  fillConfigInputs();
  setMode(settings.mode, true);
  renderCustom();
  rebuildAndPreview();
  renderRuntime();
}

function fillConfigInputs() {
  $configInputs.forEach(inp => {
    const [section, key] = inp.dataset.k.split(".");
    const v = settings.config[section]?.[key];
    if (v == null) return;
    if (inp.type === "number") inp.value = v;
    else inp.value = (key === "target" && !v) ? "" : fmt(v);
  });
}

function setMode(mode, silent = false) {
  settings.mode = mode;
  if (!silent) save();
  $modes.forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
  $panels.forEach(p => p.hidden = p.dataset.panel !== mode);
  rebuildAndPreview();
  if (!silent) reset();
}

function rebuildAndPreview() {
  table = buildTable();
  renderPreview();
}

function renderPreview() {
  if (settings.mode === "free") {
    $preview.classList.remove("show");
    return;
  }
  if (!table.length) {
    $preview.classList.remove("show");
    return;
  }
  $preview.classList.add("show");
  $roundList.innerHTML = "";
  let total = 0;
  table.forEach((r, i) => {
    const li = document.createElement("li");
    li.dataset.idx = i;
    const segs = [`<span class="rn">#${i + 1}</span>`,
                  `<span>${fmt(r.hold)}${r.rest ? ` / ${fmt(r.rest)}` : ""}</span>`];
    li.innerHTML = segs.join("");
    $roundList.appendChild(li);
    total += r.hold + r.rest;
  });
  $totalLine.textContent = `${table.length} rounds · total ≈ ${fmt(total)}`;
}

function renderCustom() {
  $customList.innerHTML = "";
  const rows = settings.config.custom.rounds;
  rows.forEach((r, i) => {
    const div = document.createElement("div");
    div.className = "custom-row";
    div.innerHTML = `
      <span class="rn">#${i + 1}</span>
      <input type="text" inputmode="numeric" value="${fmt(r.hold)}" data-cf="hold" placeholder="hold" />
      <input type="text" inputmode="numeric" value="${fmt(r.rest)}" data-cf="rest" placeholder="rest" />
      <button type="button" data-cf="del" title="Remove">✕</button>
    `;
    div.querySelectorAll("input").forEach(inp => {
      inp.addEventListener("input", () => {
        rows[i][inp.dataset.cf] = parseTime(inp.value);
        save();
        rebuildAndPreview();
      });
      inp.addEventListener("blur", () => { inp.value = fmt(parseTime(inp.value)); });
    });
    div.querySelector('[data-cf="del"]').addEventListener("click", () => {
      rows.splice(i, 1);
      save();
      renderCustom();
      rebuildAndPreview();
    });
    $customList.appendChild(div);
  });
}

function populatePresets() {
  $preset.innerHTML = "";
  presets.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    $preset.appendChild(opt);
  });
}

function applyPreset() {
  const p = presets.find(x => x.id === $preset.value);
  if (!p) return;
  settings.mode = p.mode;
  Object.assign(settings.config[p.mode], p.cfg);
  save();
  fillConfigInputs();
  setMode(p.mode);
}

// ============================================================
// Run loop
// ============================================================

function start() {
  if (!table.length) { rebuildAndPreview(); }
  if (!table.length && settings.mode !== "free") return;
  ensureAudio();
  runtime = freshRuntime();
  runtime.running = true;
  if (settings.prep > 0) {
    enterPhase("prep", settings.prep * 1000);
  } else {
    enterPhase("hold", currentHoldMs());
  }
  $start.textContent = "Pause";
  $pause.disabled = false;
  $skip.disabled = false;
  applyWake();
  tick();
}

function currentHoldMs() {
  if (settings.mode === "free") return 0;
  return (table[runtime.roundIdx]?.hold || 0) * 1000;
}
function currentRestMs() {
  return (table[runtime.roundIdx]?.rest || 0) * 1000;
}

function enterPhase(phase, durationMs) {
  runtime.phase = phase;
  runtime.phaseStart = performance.now();
  runtime.phaseDuration = durationMs;
  runtime.phaseEnd = runtime.phaseStart + durationMs;
  runtime.lastBeepSec = -1;
  runtime.lastVoiceSec = -1;

  if (phase === "prep") {
    speak("Get ready");
  } else if (phase === "hold") {
    if (settings.mode === "free") {
      speak("Hold");
      runtime.freeElapsed = 0;
      runtime.phaseStart = performance.now();
    } else {
      speak("Hold");
      beep(660, 0.25, 0.4);
    }
  } else if (phase === "rest") {
    speak("Breathe");
    beep(440, 0.25, 0.4);
  } else if (phase === "done") {
    speak("Done");
    beep(880, 0.2, 0.4);
    setTimeout(() => beep(1175, 0.3, 0.4), 220);
    runtime.running = false;
    $start.textContent = "Start";
    $pause.disabled = true;
    $skip.disabled = true;
    applyWake();
  }
  renderRuntime();
}

function advance() {
  if (runtime.phase === "prep") {
    enterPhase("hold", currentHoldMs());
    return;
  }
  if (runtime.phase === "hold") {
    if (settings.mode === "free") {
      enterPhase("done", 0);
      return;
    }
    const rest = currentRestMs();
    if (rest > 0) enterPhase("rest", rest);
    else nextRound();
    return;
  }
  if (runtime.phase === "rest") {
    nextRound();
    return;
  }
}

function nextRound() {
  runtime.roundIdx += 1;
  if (runtime.roundIdx >= table.length) {
    enterPhase("done", 0);
    return;
  }
  enterPhase("hold", currentHoldMs());
}

function togglePause() {
  if (!runtime.running) return;
  if (!runtime.paused) {
    runtime.paused = true;
    runtime.pausedRemaining = Math.max(0, runtime.phaseEnd - performance.now());
    if (settings.mode === "free" && runtime.phase === "hold") {
      runtime.freeElapsed += performance.now() - runtime.phaseStart;
    }
    cancelAnimationFrame(runtime.rafId);
    $start.textContent = "Resume";
    $pause.textContent = "Resume";
    renderRuntime();
  } else {
    runtime.paused = false;
    const now = performance.now();
    runtime.phaseStart = now;
    runtime.phaseEnd = now + runtime.pausedRemaining;
    $start.textContent = "Pause";
    $pause.textContent = "Pause";
    tick();
  }
}

function skip() {
  if (!runtime.running) return;
  if (settings.mode === "free" && runtime.phase === "hold") {
    runtime.freeElapsed += performance.now() - runtime.phaseStart;
    enterPhase("done", 0);
    return;
  }
  advance();
}

function reset() {
  cancelAnimationFrame(runtime.rafId);
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  runtime = freshRuntime();
  $start.textContent = "Start";
  $pause.textContent = "Pause";
  $pause.disabled = true;
  $skip.disabled = true;
  applyWake();
  renderRuntime();
}

function tick() {
  if (!runtime.running || runtime.paused) return;
  const now = performance.now();

  if (settings.mode === "free" && runtime.phase === "hold") {
    // counting up
    const elapsed = runtime.freeElapsed + (now - runtime.phaseStart);
    renderTime(elapsed, true);
    // target reached?
    const target = settings.config.free.target;
    if (target > 0 && elapsed >= target * 1000 && runtime.lastBeepSec !== -999) {
      beep(1175, 0.3, 0.4);
      runtime.lastBeepSec = -999;
    }
    runtime.rafId = requestAnimationFrame(tick);
    return;
  }

  const remainingMs = runtime.phaseEnd - now;
  if (remainingMs <= 0) {
    advance();
    if (runtime.running) runtime.rafId = requestAnimationFrame(tick);
    return;
  }

  renderTime(remainingMs, false);
  countdownCues(remainingMs);
  runtime.rafId = requestAnimationFrame(tick);
}

function countdownCues(remainingMs) {
  const secs = Math.ceil(remainingMs / 1000);
  if (secs <= 5 && secs >= 1 && secs !== runtime.lastBeepSec) {
    runtime.lastBeepSec = secs;
    beep(secs === 1 ? 988 : 660, 0.08, 0.25);
    if (settings.voiceOn && secs !== runtime.lastVoiceSec) {
      runtime.lastVoiceSec = secs;
      speak(String(secs));
    }
  }
}

function renderTime(ms, countUp) {
  const secs = countUp ? Math.floor(ms / 1000) : Math.ceil(ms / 1000);
  $time.textContent = fmt(secs);
}

function renderRuntime() {
  $timer.classList.remove("phase-hold", "phase-rest", "phase-prep", "phase-done");
  const totalRounds = table.length;
  const round = runtime.roundIdx + 1;

  if (runtime.phase === "idle") {
    $phase.textContent = "READY";
    if (settings.mode === "free") {
      $time.textContent = fmt(0);
      $meta.textContent = "Free hold — counts up. Skip or Stop to finish.";
    } else if (table.length) {
      const first = table[0];
      $time.textContent = fmt(settings.prep || first.hold);
      $meta.textContent = `${totalRounds} rounds · first hold ${fmt(first.hold)}`;
    } else {
      $time.textContent = fmt(0);
      $meta.textContent = "Configure rounds to start.";
    }
    $next.textContent = "";
  } else if (runtime.phase === "prep") {
    $timer.classList.add("phase-prep");
    $phase.textContent = "GET READY";
    if (settings.mode === "free") {
      $meta.textContent = "Breathe up. Hold begins after prep.";
    } else {
      $meta.textContent = `Round ${1}/${totalRounds} starting`;
    }
    const upHold = settings.mode === "free" ? null : table[0]?.hold;
    $next.textContent = upHold != null ? `Next: HOLD ${fmt(upHold)}` : "Next: HOLD";
  } else if (runtime.phase === "hold") {
    $timer.classList.add("phase-hold");
    $phase.textContent = "HOLD";
    if (settings.mode === "free") {
      $meta.textContent = "Free hold — counts up";
      const target = settings.config.free.target;
      $next.textContent = target > 0 ? `Target ${fmt(target)}` : "";
    } else {
      $meta.textContent = `Round ${round}/${totalRounds}`;
      const rest = table[runtime.roundIdx].rest;
      if (round < totalRounds) {
        const nextHold = table[runtime.roundIdx + 1]?.hold;
        $next.textContent = rest > 0
          ? `Next: REST ${fmt(rest)} → HOLD ${fmt(nextHold)}`
          : `Next: HOLD ${fmt(nextHold)}`;
      } else {
        $next.textContent = "Last round";
      }
    }
  } else if (runtime.phase === "rest") {
    $timer.classList.add("phase-rest");
    $phase.textContent = "REST";
    $meta.textContent = `Round ${round}/${totalRounds} done`;
    const nextHold = table[runtime.roundIdx + 1]?.hold;
    $next.textContent = nextHold ? `Next: HOLD ${fmt(nextHold)}` : "Next: finish";
  } else if (runtime.phase === "done") {
    $timer.classList.add("phase-done");
    $phase.textContent = "DONE";
    if (settings.mode === "free") {
      $meta.textContent = `Final hold: ${fmt(Math.floor(runtime.freeElapsed / 1000))}`;
    } else {
      $meta.textContent = `${totalRounds} rounds complete`;
    }
    $next.textContent = "";
  }

  // highlight current round in preview
  if ($roundList) {
    $roundList.querySelectorAll("li").forEach(li => {
      li.classList.toggle("current",
        (runtime.phase === "hold" || runtime.phase === "rest") &&
        parseInt(li.dataset.idx, 10) === runtime.roundIdx);
    });
  }
}

// page visibility — keep audio context alive on return
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    if (settings.wakeOn && runtime.running) applyWake();
  }
});

init();
