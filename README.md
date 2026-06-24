# Apnea Trainer

A static breath-hold (apnea) trainer (CO₂ / O₂ tables, free-hold, and custom sessions) with a calm, deep-sea "trance" interface. Installable as a progressive web app (PWA) and hosted on GitHub Pages.

> Dry static apnea practice only. Train within your limits, never in or near water without a trained buddy, and stop if you feel unwell.

## Features

- **Four training modes**
  - **CO₂ table**: fixed hold, rest shrinks each round (CO₂ tolerance).
  - **O₂ table**: fixed rest, hold grows each round (hypoxia tolerance).
  - **Free / max**: single count-up hold with an optional target.
  - **Custom**: define each round's hold/rest individually.
- **Guided runtime**: prep countdown, phase machine (prep → hold → rest → done), beeps, spoken countdown, screen wake-lock.
- **Deep-sea "Abyss" UI**: near-black navy, a single bioluminescent breathing orb that expands on hold and contracts on rest, drifting plankton particles, frosted-glass panels, and a distraction-free **trance mode** while running.
- **Training log**: every completed session is saved locally with date, mode, rounds, total time, and max hold.
- **Personal best**: tracks your longest free hold and flags new records.
- **Notes & RPE**: annotate each session with a note and a 1–10 perceived effort rating.
- **Export / import**: download your settings + history as JSON and restore it on another device.
- **Installable PWA**: works offline once loaded.

## Tech stack

- **Bun**: package manager and task runner
- **Vite** + **React** + **TypeScript**: client-only single-page application (SPA)
- **TanStack Router**: type-safe routing (Trainer / History / Settings)
- **Tailwind CSS v4**: styling via `@tailwindcss/vite`
- **vite-plugin-pwa**: service worker (SW), offline precache, web manifest

No backend: all data lives in `localStorage`. The JSON data model is kept clean
so it can later sync to a server without a rewrite.

## Requirements

- **[Bun](https://bun.sh) ≥ 1.0**: package manager and task runner (use `bun`, not `npm`).
- A modern browser (Chrome, Edge, Firefox, Safari). The app needs JavaScript; PWA install and offline support need a Chromium- or Safari-based browser.
- No backend, database, or API keys: everything runs client-side.

## Getting started

```bash
bun install      # install dependencies
bun run dev      # start the dev server
bun run build    # type-check + build to dist/
bun run preview  # preview the production build locally
```

## Deployment (GitHub Pages)

The app builds to static files in `dist/` and ships via a GitHub Actions workflow on push to `main`. Because Pages serves the app from a subpath (`/<repo>/`), Vite's `base` and the PWA scope are configured to match.

See [`docs/2026-06-24/PLAN.md`](docs/2026-06-24/PLAN.md) for the architecture and [`docs/2026-06-24/TASKS.md`](docs/2026-06-24/TASKS.md) for the build checklist.

## SEO

Because this is a client-rendered SPA, `index.html` carries the indexable surface:

- **Meta**: descriptive `<title>`, meta description, and canonical URL.
- **Social**: Open Graph and Twitter Card tags (preview image from `public/icons/icon-512.png`).
- **Structured data**: JSON-LD `WebApplication` / `HealthApplication` schema.

Body content is client-rendered, so non-JS crawlers only see the head. If organic search matters later, add prerendering/SSR for the route content.

Update the hard-coded `https://nandazman.github.io/apnea-trainer/` URLs in
`index.html` if the repo or host changes.

## Keyboard shortcuts

| Key     | Action       |
| ------- | ------------ |
| `Space` | start /pause |
| `S`     | skip phase   |
| `R`     | reset        |
