# Knight Shift AI – Execution Plan

Derived from `knight-shift-ai-whitebook.md`. Items marked `[ ]` are pending, `[x]` are complete.

## Backend
- [x] FastAPI app skeleton, requirements, and health check.
- [x] Game manager with python-chess state, legal move validation, resign/draw detection.
- [x] REST endpoints: create game, apply human move, request AI move, fetch game state.
- [x] AI engines: Level1 (shallow no alpha-beta), Level2 (alpha-beta depth 3), Level3 (iterative deepening + quiescence), Ultimate (improved eval + time budget).
- [x] M2M controller: start matches/batches, store results, list matches/tests, replay data.
- [x] Logging structures for games/matches with move history and metadata.

## Frontend
- [x] Vite React + TypeScript + Tailwind scaffold.
- [x] Board UI (react-chessboard), move input, highlights, status bar, move list.
- [x] Controls for mode (H2H/H2M/M2M), color, AI level, new/reset game, resign.
- [x] H2M flow triggering AI moves; error handling + thinking indicator.
- [x] M2M/test panel: start matches/batches, list results, open replay viewer.
- [x] Replay viewer to step through moves of completed games (with autoplay).
- [x] Click-to-move UX with legal move highlight.
- [x] Endgame modal with stats.
- [x] History list (H2M/H2H/M2M) persisted in-memory via API.

## Docs & Ops
- [x] README with run instructions (backend & frontend) and API overview.
- [x] Default configs and sample env hints.
- [x] Quick test instructions.
