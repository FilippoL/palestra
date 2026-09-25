# Palestra 🏋️

A minimal, installable PWA for tracking gym workouts — plans, sets/reps, rest timers, and history. No build step, no backend, no dependencies: just HTML, CSS, and vanilla JS, with data stored locally on your device.

**Live app:** https://filippol.github.io/palestra/

## Features

- **Workout plans** — organized into days, each with exercises (sets, reps, rest time), including a preloaded example schedule
- **Guided sessions** — step through an exercise, log each set, and get an automatic rest timer between sets
- **Exercise illustrations** — simple animated stick-figure diagrams per movement (see [draw.js](draw.js))
- **History** — past sessions are logged and viewable later
- **Tools** — a standalone stopwatch/interval timer tab
- **Installable PWA** — add to your home screen for a standalone, offline-capable app (service worker caches all assets)
- **Local-first** — all data lives in `localStorage` on your device; nothing is sent to a server

## Running locally

No build tools required — serve the directory with any static file server:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Project structure

| File | Purpose |
|---|---|
| [index.html](index.html) | Markup, styles, and app shell |
| [app.js](app.js) | App state, rendering, and event handling |
| [data.js](data.js) | Seed workout plans |
| [draw.js](draw.js) | SVG exercise illustrations |
| [sw.js](sw.js) | Service worker (offline caching) |
| [manifest.webmanifest](manifest.webmanifest) | PWA manifest |

## License

[MIT](LICENSE)
