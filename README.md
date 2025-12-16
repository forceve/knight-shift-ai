# Knight Shift AI

Web-based chess lab with FastAPI backend, python-chess engines (now including MCTS + CNN value net), and a React + TypeScript + Tailwind frontend.

## Project layout
- `backend/` – FastAPI app, AI engines, M2M runner.
- `frtend/` – Vite React UI with react-chessboard.
- `knight-shift-ai-whitebook.md` – Original design doc.
- `PROJECT_TODO.md` – Status tracker derived from the whitebook.

## Backend
Requirements: Python 3.11+, pip.

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # or source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 6789
```

### Key endpoints
- `GET /health` – service status.
- `POST /games` – create a game (`mode`: h2h|h2m|m2m, `ai_level`: level1..level5|ultimate|mcts|mcts_cnn, `player_color`: white|black).
- `GET /games/{id}` – fetch game state (FEN, move history, status).
- `POST /games/{id}/move` – submit human move (`from_square`, `to_square`, `promotion` optional).
- `POST /games/{id}/ai-move` – ask AI to move (used for H2M or M2M); accepts optional `time_limit` (seconds) to enforce per-move budget.
- `POST /games/{id}/resign` – resign game.
- `POST /m2m/match` – run AI vs AI match once (returns detail + moves). Supports per-side time limits via `time_limit_white` / `time_limit_black`.
- `POST /m2m/batch` – run batch of AI matches (aggregated results) with optional per-side time limits.
- `POST /m2m/time-benchmark` – run a sweep of per-move time limits for two engines and returns aggregated stats + a PNG (base64) chart.
- `GET /m2m/matches` / `GET /m2m/tests` – listings.

## Frontend
Requirements: Node 18+ and pnpm/npm/yarn.

```bash
cd frtend
npm install
npm run dev
# Vite dev server defaults to http://localhost:6790
```

Set `VITE_API_BASE` in `.env` if the backend is not on `http://localhost:6789`.

### Time-scaled benchmarking UI
- `/play` includes a per-move AI time control for H2M.
- `/m2m` includes per-move limits for matches/batches and a “Time-scaled Benchmark” tool that runs background sweeps and renders a 2D chart comparing two engines across time budgets.
- All batch/benchmark runs are persisted under `tests/` so progress survives page refresh and can be re-read from the Test Packages list.

### Self-play training (CNN value net)
Generate data and fine-tune the tiny CNN value head used by the `mcts_cnn` engine:
```bash
cd backend
python -m app.training.selfplay --games 20 --max-moves 140 --time-limit 0.8 --epochs 8
# Model saved to backend/app/engine/checkpoints/mcts_value.pt by default
```

## Using the app
- Pages:
  - `/` Home overview.
  - `/play` Board: H2H / H2M with controls, status bar, move list.
  - `/m2m` Start AI vs AI matches (async, parallel) and view the match list.
  - `/replay/:matchId` Step through completed M2M games.
  - `/history` View recent H2H/H2M and M2M results.
- Choose mode (H2H/H2M) and AI level, pick your color, and start a new game on `/play`.
- If you pick black, the AI opens; promotion defaults to queen for now.
- Use "AI Move" to trigger the engine when it is its turn; status bar shows check/finish state.
- On `/m2m`, run quick AI vs AI matches; click "Replay" to open the viewer. Matches appear immediately with running status and update as they finish.
- Replay viewer supports autoplay with adjustable speed.

## One-click launcher / pseudo exe
- Prep once: `pip install -r backend/requirements.txt` and `npm install --prefix frtend`
- Run `python launcher.py` to start backend (6789), frontend (6790), and open the browser automatically.
- Optional: `pyinstaller --onefile launcher.py` to build a single-file launcher; still requires Node/npm and Python deps available on the host.

## Notes / Next steps
- Replay viewer for finished games is stubbed in the plan (`PROJECT_TODO.md`).
- Data storage is in-memory for MVP; swap with Redis/DB if persistence is needed.
