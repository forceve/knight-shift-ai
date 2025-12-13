from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.engine.registry import ENGINE_REGISTRY
from app.game_manager import GameManager
from app.m2m import M2MController
from app.models.schemas import (
    AILevel,
    AILevelsResponse,
    BatchTestSummary,
    CreateGameRequest,
    HistoryEntry,
    GameState,
    HealthResponse,
    MatchDetail,
    MatchSummary,
    M2MBatchRequest,
    M2MMatchRequest,
    MoveRequest,
    MoveResponse,
    ResignRequest,
)
from app.history_store import HistoryStore

app = FastAPI(title="Knight Shift AI Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

history_store = HistoryStore()
games = GameManager(history_store)
m2m = M2MController(history_store)


@app.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse()


@app.get("/ai-levels", response_model=AILevelsResponse)
def get_ai_levels():
    """Return list of available AI levels."""
    return AILevelsResponse(levels=list(ENGINE_REGISTRY.keys()))


@app.post("/games", response_model=GameState)
def create_game(req: CreateGameRequest):
    session = games.create_game(req.mode, req.ai_level, req.player_color, req.start_fen)
    return session.to_state()


@app.get("/games/{game_id}", response_model=GameState)
def get_game(game_id: str):
    try:
        return games.get_game(game_id).to_state()
    except KeyError:
        raise HTTPException(status_code=404, detail="game_not_found")


@app.post("/games/{game_id}/move", response_model=MoveResponse)
def human_move(game_id: str, req: MoveRequest):
    try:
        return games.apply_move(game_id, req.from_square, req.to_square, req.promotion)
    except KeyError:
        raise HTTPException(status_code=404, detail="game_not_found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/games/{game_id}/ai-move", response_model=MoveResponse)
def ai_move(game_id: str, time_limit: float | None = None):
    try:
        return games.ai_move(game_id, time_limit)
    except KeyError:
        raise HTTPException(status_code=404, detail="game_not_found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/games/{game_id}/resign", response_model=GameState)
def resign(game_id: str, req: ResignRequest):
    try:
        return games.resign(game_id, req.player)
    except KeyError:
        raise HTTPException(status_code=404, detail="game_not_found")


@app.post("/m2m/match", response_model=MatchDetail)
def run_match(req: M2MMatchRequest):
    match = m2m.run_match(req.white_engine, req.black_engine, req.max_moves, req.start_fen)
    return match.to_detail()


@app.post("/m2m/batch", response_model=BatchTestSummary)
def run_batch(req: M2MBatchRequest):
    batch = m2m.run_batch(req.white_engine, req.black_engine, req.games, req.swap_colors, req.max_moves)
    return batch.to_summary()


@app.get("/m2m/matches", response_model=list[MatchSummary])
def list_matches():
    return m2m.list_matches()


@app.get("/m2m/matches/{match_id}", response_model=MatchDetail)
def get_match(match_id: str):
    try:
        return m2m.get_match(match_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="match_not_found")


@app.get("/m2m/tests", response_model=list[BatchTestSummary])
def list_tests():
    return m2m.list_tests()


@app.get("/m2m/tests/{test_id}", response_model=BatchTestSummary)
def get_test(test_id: str):
    try:
        return m2m.get_test(test_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="test_not_found")


@app.get("/history", response_model=list[HistoryEntry])
def history():
    return history_store.list_entries()
