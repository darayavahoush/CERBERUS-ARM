# Frontend guide

## Run

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173, starts on sample data
```

Set `VITE_BACKEND_MODE=live` in `frontend/.env` to start on the Python backend instead. The **Sample / Live** switch in the top bar overrides it per browser. Vite proxies `/api` and `/ws` to `localhost:8000`.

## Structure

| Path | What it does |
| --- | --- |
| `src/api/mock.js` | In-browser stand-in for the backend. Same response shapes as `backend/app.py`. Seeded, so runs are reproducible. |
| `src/api/live.js` | Real client for the FastAPI endpoints, with timeouts and readable errors. |
| `src/api/BackendProvider.jsx` | Chooses sample or live, tracks connection state, re-checks every 10 s while live. |
| `src/lib/SimProvider.jsx` | Simulation state shared by the Console (run, step, plan, perception, debrief). Saves finished episodes. |
| `src/lib/store.js` | localStorage stores for episodes and training batches. |
| `src/components/Stage.jsx` | The SVG workspace (arm, bays, pillar, objects, trail). Keyboard accessible. |
| `src/pages/*` | Home, About, Console, Training, Episodes. Routing is hash-based (`#/console`), so no server config is needed. |

## Moving from sample to live data

Everything the UI needs already exists in `backend/app.py` except two things the frontend currently keeps on the device:

1. **Episode history.** The Console records each finished episode in `localStorage`. A `GET /api/episodes` returning `{id, ts, instruction, target, bin, success, collision, steps, reward, jerk, source}` would let the Episodes page read it from the server instead (swap `episodeStore` for an `api.episodes()` call).
2. **Training history.** `POST /api/train/step` returns one aggregate per call and the Training page stores each batch locally. A `GET /api/train/history` would survive a browser reset.

Also note: `/api/env/step` does not currently return a `jerk` value in `info`; the Episodes page shows 0 for live runs until it does.

## Images

Every image slot is an `<Img name="…">` that loads `frontend/public/images/<name>.webp` (then `.png`, then `.jpg`). Until a file exists, a labelled placeholder with the brief shows instead, so nothing breaks. Generate these and drop them into `frontend/public/images/` with exactly these names:

| File name | Where | Size | Prompt |
| --- | --- | --- | --- |
| `head-eye` | Home, “Eye” card | 1200×900 | Overhead macro photo of a robot arm workspace, small coloured cubes, spheres and stars on a matte grey table, soft teal rim light, shallow depth of field, no text. |
| `head-muscle` | Home, “Muscle” card | 1200×900 | Close-up of a two-joint industrial robot arm gripping a small cube, dramatic violet side light, dark background, clean product photography, no text. |
| `head-brain` | Home, “Brain” card | 1200×900 | Abstract blueprint-style illustration of a sentence turning into a step plan, cobalt blue and white line art, yellow accent, no readable text. |
| `console-screenshot` | Home, “Inside the console” | 1600×1000 | Not generated: take a real screenshot of `#/console` at 1440 px wide after a finished run. |
| `architecture` | About | 1200×900 | Clean architecture diagram: instruction → planner → vision → agent → arm → dashboard. Cobalt (#1B2F8E) and white, yellow (#F5C518) accents, rounded boxes, no photo. |

Style notes for the generator: keep the palette to cobalt `#1B2F8E`, signal yellow `#F5C518`, white and cool grey; teal, violet and cobalt are used as the Eye, Muscle and Brain colours; no text baked into images.
