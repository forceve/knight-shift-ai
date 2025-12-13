# Knight Shift AI

Web-based chess lab with FastAPI backend, python-chess engines (4 difficulty levels), and a React + TypeScript + Tailwind frontend.

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
- `POST /games` – create a game (`mode`: h2h|h2m|m2m, `ai_level`: level1|level2|level3|ultimate, `player_color`: white|black).
- `GET /games/{id}` – fetch game state (FEN, move history, status).
- `POST /games/{id}/move` – submit human move (`from_square`, `to_square`, `promotion` optional).
- `POST /games/{id}/ai-move` – ask AI to move (used for H2M or M2M).
- `POST /games/{id}/resign` – resign game.
- `POST /m2m/match` – run AI vs AI match once (returns detail + moves).
- `POST /m2m/batch` – run batch of AI matches (aggregated results).
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
