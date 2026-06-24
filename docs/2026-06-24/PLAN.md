# Plan: Apnea Trainer rebuild

## Goal

Rebuild the existing vanilla `index.html` / `app.js` / `styles.css` apnea trainer as a typed, componentized single-page application (SPA) with a deep-sea "trance" aesthetic, installable as a progressive web app (PWA) and hosted on GitHub Pages, while preserving all current training behavior and adding a training log.

## Decisions (settled)

- **Host:** GitHub Pages (static only, no server runtime).
- **Stack:** Bun + Vite + React + TypeScript + TanStack Router (SPA) +
  Tailwind v4 + `vite-plugin-pwa`.
  - _Why Router/Vite over TanStack Start:_ Pages is static-only, so Start's SSR / server functions can't run; Router on a Vite SPA gives type-safe routing and clean static output with far less machinery. Migrating Router → Start is a reasonable later step **if** a backend is ever added.
  - _Why not a framework-free build:_ Tailwind + TS already require a build step, and routing + future visuals justify React.
- **Visual direction:** "Abyss", cold cyan bioluminescence on near-black navy.
- **Data:** `localStorage` only; JSON shape kept portable for future cloud sync.

## Behavior to preserve (from current app)

- **Modes & table generation**
  - **CO₂:** fixed `hold`; `rest` interpolates `restStart → restEnd` across rounds (linear); last round rest = 0.
  - **O₂:** fixed `rest`; `hold` interpolates `holdStart → holdEnd`; last round rest = 0.
  - **Free:** single count-up hold, optional `target` (beep on reach).
  - **Custom:** explicit per-round `{ hold, rest }`; last round rest ignored.
- **Runtime phase machine:** `idle → prep → hold → rest → done`, advancing per round; `rest` skipped when 0.
- **Cues:** prep countdown, hold/rest start tones, 5→1s countdown beeps + spoken numbers, done chord.
- **Controls:** start / pause(resume) / skip / reset; keyboard `Space` / `S` / `R`.
- **Settings:** beeps on/off, voice on/off, prep seconds (0–60), screen wake-lock; presets for CO₂/O₂.
- **Persistence:** settings saved to `localStorage`.

## New features

1. **Session history log**: on reaching `done`, append a `SessionLog` entry.
2. **Personal best**: best free-hold `maxHoldSec`; flag new records.
3. **Export / import**: download/restore `{ settings, history }` as JSON.
4. **Notes / RPE**: editable note + 1–10 rating per log entry.

## Data model

```ts
type Mode = "co2" | "o2" | "free" | "custom";

interface Settings {
  mode: Mode;
  config: {
    co2: { hold: number; rounds: number; restStart: number; restEnd: number };
    o2: { rest: number; rounds: number; holdStart: number; holdEnd: number };
    free: { target: number };
    custom: { rounds: { hold: number; rest: number }[] };
  };
  prep: number;       // seconds
  soundOn: boolean;
  voiceOn: boolean;
  wakeOn: boolean;
  motion: "full" | "reduced"; // ambient animation level
}

interface SessionLog {
  id: string;
  date: string;        // ISO 8601
  mode: Mode;
  rounds: number;
  totalSec: number;
  maxHoldSec: number;
  note: string;
  rpe: number | null;  // 1–10
}

// localStorage keys
// "apnea-trainer-settings-v1" -> Settings
// "apnea-trainer-history-v1"  -> SessionLog[]
```

All times stored as integer **seconds**.

## Routes

- `/`: **Trainer**: mode tabs, config, preview, timer + orb, controls.
- `/history`: **History**: session list, personal best, notes/RPE, export/import.
- `/settings`: **Settings**: sound/voice/prep/wake/motion (may start inline).

## Proposed structure

```
src/
  main.tsx                 # app entry, router mount
  router.tsx               # TanStack Router setup
  routes/
    __root.tsx             # shell + nav + ambient background
    index.tsx              # Trainer
    history.tsx            # History / log
    settings.tsx           # Settings
  lib/
    timer.ts               # phase machine + table generation (pure, testable)
    audio.ts               # beeps + speech
    storage.ts             # settings + history load/save, export/import
    format.ts              # time parse/format
    presets.ts             # preset tables
  state/
    useTrainer.ts          # runtime state hook
    useSettings.ts         # persisted settings hook
    useHistory.ts          # persisted history hook
  components/
    BreathOrb.tsx          # animated breathing orb
    Particles.tsx          # drifting plankton
    Timer.tsx              # phase + numerals
    Controls.tsx
    ModeTabs.tsx
    ConfigPanels.tsx
    RoundPreview.tsx
    HistoryList.tsx
  styles/
    index.css              # @import "tailwindcss"; @theme tokens
public/
  icons/                   # PWA icons (192/512/maskable)
vite.config.ts             # base, react, tailwind, pwa
```

## Design system: "Abyss"

- **Palette**
  - Abyss background: `#03070d` → `#060b14` (radial, slowly drifting).
  - Glass panels: translucent navy + `backdrop-blur`.
  - Bioluminescent accent: cyan/teal `#22d3ee` / `#5ac8fa`, with soft glow.
  - Phase tints: hold = warm coral glow, rest = teal, prep = amber, done = blue.
- **Motion**
  - Breathing orb scales up during HOLD, down during REST/prep, with a slow pulse at idle.
  - Drifting particles + caustic gradient shift (disabled at `motion: reduced` and under `prefers-reduced-motion`).
- **Typography:** ultra-light, wide letter-spacing, lowercase labels; huge feather-light timer numerals (tabular).
- **Trance mode:** while running, config UI fades; only orb + time + minimal controls remain, dimly lit.

## PWA & deploy

- `vite-plugin-pwa` with `registerType: "autoUpdate"`, app-shell precache, and a manifest (name, theme/background `#03070d`, `display: standalone`, icons).
- `base: "/<repo>/"` in `vite.config.ts`; PWA `scope`/`start_url` match.
- GitHub Actions: build with Bun → upload `dist/` → deploy to Pages on `main`.

## Out of scope (for now)

- Cloud sync / accounts / multi-device. (Data model stays portable for it.)
- WebGL/shader orb (CSS-only first; canvas/shader is a later visual upgrade).
- Charts/trends over time.
