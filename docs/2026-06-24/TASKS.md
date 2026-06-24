# Tasks: Apnea Trainer rebuild

Status: `[ ]` todo · `[~]` in progress · `[x]` done

## 0. Scaffold

- [x] Init project with Bun (`package.json`, scripts: dev/build/preview).
- [x] Add Vite + React + TypeScript; `tsconfig` with strict mode.
- [x] Add Tailwind v4 via `@tailwindcss/vite`; `src/styles/index.css`.
- [x] Add TanStack Router; mount in `main.tsx`, define `__root` + routes.
- [x] Set `base: "/<repo>/"` in `vite.config.ts` (currently `/stopwatch/`).
- [x] Verify `bun run dev` and `bun run build` work.

## 1. Core logic (ported, typed, framework-free)

- [x] `lib/format.ts`: `parseTime`, `fmt` (seconds ↔ `mm:ss`).
- [x] `lib/timer.ts`: table generation for co2/o2/free/custom + phase machine.
- [x] `lib/audio.ts`: beep (Web Audio) + speak (SpeechSynthesis), gated by settings.
- [x] `lib/presets.ts`: CO₂/O₂ presets.
- [x] `lib/storage.ts`: load/save settings + history, export/import JSON.
- [x] Unit-test table generation + time parsing (Bun test): `lib/logic.test.ts`.

## 2. State

- [x] `useSettings`: persisted settings, defaults, migration-safe load.
- [x] `useTrainer`: runtime phase machine, rAF tick, pause/skip/reset, wake-lock.
- [x] `useHistory`: persisted log; append on `done`; edit note/RPE; delete.

## 3. Trainer UI (route `/`)

- [x] `ModeTabs`, `ConfigPanels` (co2/o2/free/custom), preset load.
- [x] `RoundPreview` with current-round highlight + totals.
- [x] `Timer` (phase label, numerals, meta/next line).
- [x] `Controls` (start/pause/skip/reset) + keyboard shortcuts.
- [x] Settings (beeps/voice/prep/wake/motion): `/settings`.

## 4. Abyss design

- [x] `@theme` tokens (palette, glow, blur) in `index.css`.
- [x] Ambient background: drifting radial gradient + vignette.
- [x] `BreathOrb`: scales with phase (hold↑ / rest↓), idle pulse.
- [x] `Particles`: drifting plankton (CSS), respects reduced motion.
- [x] Frosted-glass panels; ultra-light type scale.
- [x] Trance mode: fade config while running.
- [x] Honor `prefers-reduced-motion` + in-app motion toggle.

## 5. Logging features (route `/history`)

- [x] Append `SessionLog` on session completion.
- [x] `HistoryList`: date, mode, rounds, total, max hold; delete entry.
- [x] Personal best (free max hold) + "new PB" flag.
- [x] Note + RPE editing per entry.
- [x] Export JSON download; import with validation + merge.

## 6. PWA + deploy

- [x] Generate icons (192 / 512 / maskable) into `public/icons/` (`scripts/gen-icons.mjs`).
- [x] Configure `vite-plugin-pwa` (manifest, autoUpdate, app-shell precache).
- [ ] Verify offline load + install prompt in preview. (SW builds; not manually verified.)
- [x] GitHub Actions workflow: Bun build → deploy `dist/` to Pages.
- [ ] Confirm correct base path on the live Pages URL. (Needs the deployed repo.)

## 7. Polish

- [ ] README screenshots/GIF of trance mode.
- [~] Accessibility pass (focus states, aria-live timer, contrast). aria-live + reduced-motion done; full audit pending.
- [ ] Final cross-device check (mobile install, wake-lock, audio unlock).
