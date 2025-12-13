# AI Workshop Chess Bot Whitebook

> Version 0.1 — Draft project overview for AI Workshop group project

---

## 1. Project Summary / 项目概述

**Course**: Artificial Intelligence Workshop (Semester 1, 2025–2026)

**Project overview**: A web-based **AI chess system** with multiple difficulty levels. It supports **Human vs Human (H2H)**, **Human vs Machine (H2M)**, and **Machine vs Machine (M2M)** game modes.

**Game choice**: Standard international **Chess** (not mini-chess). The system should be able to:

- Enforce chess rules and generate legal moves
- Provide at least **3 AI difficulty levels**
- Support H2H / H2M / M2M games, with H2H also used for debugging and demonstration.
- Demonstrate at least one **custom / improved AI algorithm** beyond the most basic baseline

**Planned tech stack**:

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Frontend chess UI**: React-compatible chessboard component (e.g. `react-chessboard` or similar)
- **Backend**: Python (FastAPI or similar REST framework)
- **Chess rules & engine base**: `python-chess` library

This whitebook serves as a **living design document** for developers and teammates working on the project, helping align the team on scope, architecture, milestones, and evaluation strategy.

---

## 2. Goals & Success Criteria / 目标与成功标准

### 2.1 Functional Goals

1. **Game modes**

   - **H2H**: Human vs Human using the same board UI, also useful for debugging and demonstration.
   - **H2M**: Human vs AI (interactive).
   - **M2M**: AI vs AI (non-interactive) for performance comparison and demo.

2. **Core chess features**

   - Legal move generation, including special rules (castling, promotion, en passant, check/checkmate, stalemate).
   - Basic game controls: start new game, choose side (white/black), choose AI level, resign, restart.
   - Move history display.

3. **Multi-level AI**

   - At least **3 difficulty levels** (e.g. Easy / Medium / Hard) with clearly distinguishable playing strengths.

### 2.2 Technical Goals

1. Design **improved evaluation or search strategy** to go beyond a naive baseline (e.g. better evaluation function, quiescence search, simple opening book, etc.).
2. Clean separation between **frontend UI**, **game logic (python-chess)**, and **AI search engine**.
3. Implement at least one **classical search-based chess AI** (e.g. Minimax/Negamax with Alpha–Beta pruning).
4. Code quality: consistent style, proper comments, modular structure, easy to extend.

### 2.3 Non-Functional Goals

- Simple, clean, and intuitive UI.

- Stable behavior: no illegal moves, no crashes, clear messages for check/checkmate/draw.

- Responsive, reasonably fast move calculation for the chosen depth.

---

## 3. Game Scope / 游戏范围

### 3.1 Included Features

- Standard 8×8 chess with usual starting position.
- Legal move generation and validation via `python-chess`.
- Check, checkmate, stalemate, threefold repetition and 50-move rule handled at least at engine level (even if not all rules are exposed in the UI in phase 1).
- Simple time measurement per move (for analysis), not full chess clock.

### 3.2 Planned UI Features

- Visual chessboard with drag-and-drop moves or click-click selection.
- Highlighting: selected piece, legal moves, last move, check status.
- Control panel: choose color, choose AI level, start/stop M2M match.
- Move list: algebraic notation or simple notation (e.g. `e2-e4`).
- **M2M match list view**: list recent or running M2M matches with engines, status, and result.
- **Game replay viewer**: step through finished games move by move (especially from M2M or batch tests).
- **Batch test management UI**: configure batch tests (engine pairs, number of games, side assignment) and view a test list with aggregated statistics.

### 3.3 Out-of-Scope (for MVP)

(for MVP)

- Online multiplayer over network.
- Complex time controls (increment, delay).
- Advanced features like PGN import/export, save/load multiple games (can be future work).

---

## 4. System Architecture / 系统架构

### 4.1 High-Level Overview

Layers:

1. **Frontend (React + TS + Tailwind)**

   - Renders chessboard and controls
   - Sends user moves and commands to backend
   - Receives updated board state and AI moves

2. **Backend API (Python)**

   - Exposes REST endpoints to create games, apply moves, and ask AI for moves
   - Manages game state (board, turn, result)
   - Delegates AI decisions to one of several engine modules (Level 1/2/3/Ultimate)

3. \*\*Chess Engine & Logic ( \*\* \*\*\*\*python-chess \*\* \*\***)**

   - Represents board state and rules
   - Generates legal moves, detects check/checkmate/draw
   - Provides utilities (FEN, move notation) for storage and communication

### 4.2 Frontend Design

**Tech stack**

- React + TypeScript
- Tailwind CSS for layout and styling
- React-compatible chessboard component (e.g. `react-chessboard`)

**Overall idea / 整体思路**

- Frontend is responsible for rendering the board and UI, collecting user actions, and calling backend APIs.
- All chess rules, legal-move checks, and win/draw detection live in the backend (`python-chess` + AI engines).

**Core page structure**

The main in-game single-page view (e.g. `GamePage`) contains:

- **Board area**

  - Renders the current position from FEN.
  - Handles drag-and-drop or click-to-move interactions.

- **Control panel**

  - Selects mode (H2H / H2M / M2M), AI level, and player color (white/black).
  - Creates and resets games, starts M2M matches or batch tests.

- **Status bar**

  - Shows whose turn it is and whether the game is in check/checkmate/draw.
  - Indicates when the AI is thinking and displays lightweight error messages.

- **Move list**

  - Displays move history (SAN or simple text).
  - Later reused by the replay viewer.

- **M2M / result views (optional)**

  - Summaries of recent M2M matches and entry points into game replays.

**State & data flow（抽象）**

Top-level React state maintains a "game state" object, including:

- `game_id`, current FEN, side to move, and result (if finished)
- Mode (H2H / H2M / M2M), AI level, player color
- Move history and UI flags such as `isThinking`, `errorMessage`

When the user makes a move:

1. Frontend sends the intended move to the backend.
2. Backend validates and applies the move, then returns the updated game state.
3. For H2M / M2M, frontend may immediately trigger an AI move request if it is the engine's turn.

For M2M and batch tests, the frontend mainly:

- Starts matches/tests based on user parameters.
- Displays match list, test list, and individual game replays using data from the backend.

**Component responsibilities（概念层面）**

- `ChessBoardView`: renders the board and reports user moves upward.
- `ControlPanel`: controls game parameters and start/reset actions.
- `StatusBar`: shows global game status and error/info messages.
- `MoveList`: displays move history and supports clicking moves for replay later.
- `M2MViewer`: shows M2M/batch results and integrates with replay controls.

**UI/UX principles**

- Board-first layout: board is the visual focus; control panel and lists stay compact.
- Clear visual feedback: highlight last move, show check/checkmate with obvious colors.
- While the engine is thinking, show a clear status indicator to avoid confusion.
- Use responsive layout to work reasonably on both desktop and mobile.
- Errors should be visible but not intrusive (e.g. status bar messages or light toasts).

### 4.3 Backend Design

**Tech stack**

- Python + FastAPI for the API layer
- `python-chess` to manage board state and legal moves
- Simple in-memory storage for MVP (can later be swapped for Redis or a database)

**Core modules（概念）**

- **Game Manager**

  - Creates, loads, and updates `GameSession` objects.
  - Each `game_id` maps to:
    - a `python-chess.Board` instance
    - mode (H2H / H2M / M2M), AI level, and player color
    - move history and result metadata.

- **AI Engine Interface**

  - Defines a common interface (e.g. `BaseEngine.choose_move(board, config)`).
  - Provides concrete engines: random, Level1/2/3, Ultimate engine.
  - Uses a simple registry/factory to choose the engine by `ai_level` or engine name.

- **Match Controller (M2M)**

  - Runs AI vs AI matches for demo and evaluation.
  - Supports both single matches and batch tests.
  - Records: engines used, move list, result, and optional evaluation info.
  - Exposes: match list, test list, and per-game details for replay.

- **API layer**

  - FastAPI routes expose a stable REST interface to the frontend.
  - Frontend sees only JSON game state, not internal engine details.

**Typical interaction flows（抽象）**

- **Create new game**

  - Frontend sends mode, AI level, and player color.
  - Game Manager creates a `GameSession`, initializes the board, and returns `game_id` plus initial state.

- **Human move (H2M / H2H)**

  - Frontend sends a move (e.g. UCI `from` → `to`).
  - Game Manager validates and applies the move using `python-chess`, updates the session, and returns the new state and status.

- **AI move (H2M / M2M)**

  - Backend selects the engine from the AI Engine Interface based on the session configuration.
  - Engine computes a move; Game Manager applies it and returns the updated state.

- **M2M / batch tests**

  - Frontend or an internal runner submits two engine configs and the number of games.
  - Match Controller runs multiple games, logging results under a test run ID.
  - Frontend queries match list / test list and per-game details for statistics and replay.

**Storage strategy（概念）**

- **MVP**: use in-process dictionaries to hold active games and recent results for simplicity.
- **Future**: abstract the storage layer so it can be replaced with Redis or a database when we need persistence across restarts or larger-scale testing.

### 4.4 Pages & Navigation / 页面与路径

**Goal**: clarify the overall site structure and how users move between pages. The app can be implemented as a SPA with routing, but from a product perspective we talk about logical pages.

**Page list (conceptual)**

- **Home page** (`/`)

  - Short introduction and primary actions, e.g. "Play vs AI", "Watch AI vs AI", and links to docs.
  - Can offer quick mode selection and then redirect to the Play page.

- **Play / Game page** (`/play` or `/game/:gameId`)

  - The **in-game single-page layout** described in 4.2.
  - Used for H2H and H2M by default, and optionally for viewing a single M2M game.
  - May receive an existing `game_id` (resume or replay) or create a new one.

- **M2M & Tests page** (`/m2m` or `/tests`)

  - Controls for starting M2M matches and batch tests (engine A/B, number of games, color assignment).
  - Shows **Match List** and **Test List** tables populated from the backend.
  - Clicking a match or test opens a specific game in replay mode.

- **Replay page** (`/replay/:gameId`) *(optional separate route)*

  - Board + move list + playback controls (play/pause, jump to move N).
  - Implementation choice: either a dedicated page or a "replay mode" of the Play page.

- **Settings / About page** *(optional)*

  - Basic configuration (e.g. default AI level, maximum search depth, time budget).
  - About text, credits, and external links.

**Navigation flow examples / 路径示意**

- **Play vs AI (H2M)**\
  `Home` → click "Play vs AI" → `Play` page (H2M mode) → user plays against engine.

- **Play H2H (local 2-player)**\
  `Home` → click "Play (H2H)" or "Local 2-player" → `Play` page (H2H mode) → two humans share the same board and alternate moves.

- **Watch AI vs AI and analyze**\
  `Home` → `M2M & Tests` page → start batch test → wait until done → open `Test List` → choose a game → open replay (`Replay` page or `Play` page in replay mode).

- **Developer / tester debugging**\
  Directly open `/game/:gameId` or `/replay/:gameId` from logs or tools to inspect a specific game.

## 5. AI Design / AI 设计

### 5.1 Baseline Engine

**Baseline idea**: Negamax with Alpha–Beta pruning + simple evaluation.

- **Search**:

  - Negamax/Minimax with alpha–beta.
  - Fixed depth per difficulty level.
  - Optional move ordering (captures first, checks first).

- **Evaluation function (first version)**:

  - Material balance (piece values).
  - Simple piece-square tables to encourage good piece placement.
  - Small bonuses/penalties for:
    - Pawn structure (doubled/isolated/connected pawns)
    - King safety (castled or not)
    - Mobility (number of legal moves)

### 5.2 Difficulty Levels

We map each user-visible difficulty to a specific engine configuration. The goal is to keep the strength gap clear (for user experience and for experiments in the paper) while keeping implementation complexity under control.

#### Level 1 — Easy / Shallow Minimax Bot

**Design goal**: Play obviously weaker than the other levels, with some random and "human-like" mistakes, but still follow basic tactics.

**Technical details (implementation)**

- **Search**: Negamax / Minimax **without** alpha–beta pruning.
- **Depth**: Fixed shallow depth, e.g. **1–2 plies** ("I move, opponent moves").
- **Evaluation**:
  - Pure **material balance** only (piece values).
  - No piece-square tables, mobility, or structural features.
- **Move selection**:
  - Evaluate all legal moves, find the best score range.
  - Randomly pick one move from the top few candidates to **intentionally weaken** play and avoid looking too deterministic.

This level is also useful as a simple baseline for comparison in the paper.

#### Level 2 — Medium / Classical Alpha–Beta Engine

**Design goal**: A reasonable classical engine that plays much stronger than Level 1, with basic tactical awareness.

**Technical details (implementation)**

- **Search**:
  - Negamax + **Alpha–Beta pruning**.
  - Depth: fixed **3 plies** (or iterative deepening up to depth 3 within a small time budget).
- **Move ordering**:
  - Simple heuristics: expand **captures and checks first**.
- **Evaluation function**:
  - Material balance (piece values).
  -
    - Simple heuristics, for example:
    * **Piece-Square Tables (PST)**: central squares and active squares get bonuses.
    * **Mobility**: number of legal moves × small weight.
- **Randomness**:
  - Only break ties between **exactly equal** scores by random choice.
  - No deliberate weakening beyond that.

This level corresponds to a "standard" textbook engine built with the workshop content on Minimax / Alpha–Beta. It is a good reference point when we evaluate stronger engines.

#### Level 3 — Hard / Enhanced Alpha–Beta Engine

**Design goal**: Our strongest built-in classic engine, still simple enough to explain clearly in the technical paper.

**Technical details (implementation)**

- **Search**:
  - Negamax + **Alpha–Beta** as in Level 2.
  - **Iterative deepening** with a per-move time budget (e.g. 0.5–1 s), so depth can reach around **4–5 plies** when possible.
- **Move ordering** (more aggressive than Level 2):
  - Prioritize principal variation (PV) move from previous iteration.
  - Then **MVV–LVA captures**, killer moves, checks, and finally quiet moves.
- **Quiescence search**:
  - At leaf nodes with sharp tactics (big captures/checks), continue exploring only capture (and possibly check) moves.
  - This helps reduce the **horizon effect** and stabilize evaluations in tactical positions.
- **Evaluation function**: extend Level 2 with more structure-aware terms, for example:
  - **King safety**: castled king, pawn shield, open files around king.
  - **Pawn structure**: penalties for doubled/isolated pawns; bonuses for passed pawns.
  - (Optional) **Phase-aware weights**: blend opening/endgame PSTs based on remaining material.

Level 3 should clearly outperform Level 2 in M2M matches and will be a key baseline when we evaluate the Ultimate/Custom engine.

### 5.3 Custom / Improved Agent (Ultimate Engine)

Goal: Implement an agent that **clearly outperforms** the baseline Hard level and can be described in the paper as “our proposed method”.

Possible improvements (choose a subset based on time):

- Enhanced evaluation: more features (king rings, pawn structure, piece activity).
- Simple **opening book** for first few moves based on curated lines.
- Iterative deepening + time budgeting per move.
- Better move ordering using history heuristics or killer moves.

The technical paper can then compare:

- **Baseline classical engine** vs **Improved/Ultimate engine**
- Win rate, average game length, evaluation speed, etc.

---

## 6. Game Modes & User Flows / 游戏模式与用户流程

### 6.1 H2M (Human vs Machine)

1. User opens web page.
2. Chooses: side (white/black), AI level, mode = H2M.
3. Backend creates game and returns initial board state.
4. User makes move on frontend → sends to backend → move validated and applied.
5. If it is AI’s turn, frontend requests AI move → backend engine chooses move → returns move and new board.
6. Repeat until checkmate/draw/resign.

### 6.2 M2M (Machine vs Machine)

1. User chooses two engines/levels to compare (e.g. Level 2 vs Level 3).
2. User can either start a **single M2M match** or configure a **batch test** (number of games, color assignment, optional constraints).
3. Backend starts the match or batch and plays moves in loop.
4. Frontend can show the current match in real time (or at chosen speed) and highlight result.
5. Completed matches appear in the **M2M match list**, where the user can select any game to open the **replay viewer** and step through moves.
6. Batch tests appear in a **test list**, showing aggregate statistics (e.g. win/draw/loss, average game length) and linking to individual game replays.

### 6.3 H2H (Human vs Human)

- Use the same board UI with no engine calls.
- Two human players share the device and take turns making moves.
- This mode is useful both for normal play and for debugging board rules and UI interactions.

---

## 7. Data, Logging & Evaluation / 数据记录与评估

### 7.1 Logging Design

Each game (especially in M2M mode) should have:

- Game metadata: `game_id`, timestamp, players/engines, starting side, and optional `test_run_id` if part of a batch test.
- Move list: move notation, ply number, side to move.
- Optional per-move data: evaluation score, search depth, node count, time spent.
- Result: winner (white/black), draw reason (stalemate, repetition, etc.), total moves.

Each **batch test** (test run) should have:

- Test metadata: `test_run_id`, engine A/B configuration, number of games, creation time, status.
- Aggregated metrics: win/draw/loss counts, average game length, average move time (if available).
- Links or references to all associated `game_id`s for replay.

Storage options:

- Simple: in-memory + export to JSON/CSV for analysis.
- Slightly advanced: lightweight database or file-based logs.

### 7.2 Experimental Plan (for Paper)

Experimental Plan (for Paper)

- **Scenario 1**: Level 3 vs Level 1/2 — show that difficulty levels are clearly separated.
- **Scenario 2**: UltimateEngine vs BaselineEngine — evaluate strength improvement.
- Metrics:
  - Win/draw/loss rate over N games
  - Average game length (in moves)
  - Average move time
  - Nodes searched per move (optional)

These experiments will support the **Experimental Results** and **Performance Analysis** sections of the technical paper.

---

## 8. UI/UX Guidelines / 界面与交互设计

- Clear **board first** layout; control panel and move list on one side.
- Use Tailwind CSS for simple, consistent styling.
- Visual indicators:
  - Current turn
  - Check/checkmate status
  - AI "thinking" state (spinner or message)
  - Last move highlight
- Error handling: if user attempts illegal move, show a small unobtrusive message.
- Accessibility: reasonable colors for dark/light squares and highlights.

---

## 9. Implementation Plan / 实现计划（阶段拆分）

### Phase 0 – Environment & Skeleton

- Set up repo structure (frontend + backend).
- Configure React + TS + Tailwind.
- Initialize Python backend with FastAPI.
- Add basic health-check endpoints.

### Phase 1 – Core Chess Logic

- Integrate `python-chess` and implement `GameManager`.
- Implement endpoints for creating a game and making moves (no AI yet).
- Ensure all standard rules work correctly.

### Phase 2 – Frontend Board & H2H

- Integrate a React chessboard component.
- Implement H2H mode: human vs human, moves going through backend.
- Basic status and move list.

### Phase 3 – Baseline AI & H2M

- Implement baseline AI engine (Level 1/2/3 as simple variations).
- Add H2M flow: user vs AI using baseline engine.
- Test behavior and responsiveness.

### Phase 4 – Improved Engine & M2M

- Implement UltimateEngine with improved evaluation/search.
- Add M2M controller to run engine vs engine games.
- Implement M2M viewer on frontend.
- Start collecting data for analysis.

### Phase 5 – Polish & Refactor

- Clean up code structure, comments, and documentation.
- Improve UI/UX and fix known bugs.
- Finalize logging & data export tools.

---

## 10. Risks & Mitigation / 风险与应对

**Risk 1 – AI too slow at higher depths**

- *Mitigation*: Limit depth; use iterative deepening with time budget; optimize move ordering; reduce evaluation complexity.

**Risk 2 – Frontend/Backend integration issues**

- *Mitigation*: Define a clear JSON API contract early, write small integration tests, and test endpoints using tools like Postman.

**Risk 3 – Scope creep (too many features)**

- *Mitigation*: Lock MVP scope (three AI levels, H2M/M2M, basic UI) and move extras (online multiplayer, advanced analysis) to "Future Work".

**Risk 4 – Hard to show difference between AI levels**

- *Mitigation*: Carefully tune search depth and evaluation; run internal tournaments and adjust until level separation is obvious.

---

## 11. Deliverables Checklist / 交付物清单

By the project deadline, the group should deliver:

1. **Program source code (Python + frontend)**
   - Organized repo with clear structure, comments, and instructions to run.
2. **Running demo**
   - H2H, H2M, M2M chess games.
3. **Experimental data**
   - Logs and summary tables/figures for engine comparisons.

---

## 12. Future Work / 后续扩展方向

Potential extensions beyond the course requirements:

- Online multiplayer with user accounts and ratings.
- Opening book and endgame tablebases integration.
- More advanced AI (e.g. Monte Carlo Tree Search, reinforcement learning-based agents).
- Stronger UI features: analysis mode, hints, evaluation bar, engine lines.
- Packaging desktop or offline versions (e.g. local executable that opens the React frontend in browser).

---

*This whitebook is a working document. The team can update sections as the project evolves, but major changes in scope/architecture should be reflected here to keep everyone aligned.*

