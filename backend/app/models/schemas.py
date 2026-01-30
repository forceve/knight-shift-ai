from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class GameMode(str, Enum):
    H2H = "h2h"
    H2M = "h2m"
    M2M = "m2m"


class AILevel(str, Enum):
    LEVEL1 = "level1"
    LEVEL2 = "level2"
    LEVEL3 = "level3"
    LEVEL4 = "level4"
    LEVEL5 = "level5"
    ULTIMATE = "ultimate"
    MCTS = "mcts"
    MCTS_CNN = "mcts_cnn"


class PlayerColor(str, Enum):
    WHITE = "white"
    BLACK = "black"


class HealthResponse(BaseModel):
    status: str = "ok"


class AILevelsResponse(BaseModel):
    levels: List[AILevel]


class CreateGameRequest(BaseModel):
    mode: GameMode = GameMode.H2H
    ai_level: Optional[AILevel] = None
    white_engine: Optional[AILevel] = None  # For M2M mode
    black_engine: Optional[AILevel] = None  # For M2M mode
    player_color: PlayerColor = PlayerColor.WHITE
    start_fen: Optional[str] = None


class MoveRequest(BaseModel):
    from_square: str = Field(..., pattern=r"^[a-h][1-8]$")
    to_square: str = Field(..., pattern=r"^[a-h][1-8]$")
    promotion: Optional[str] = Field(
        None, description="One of q, r, b, n (lowercase) when promoting"
    )


class ResignRequest(BaseModel):
    player: PlayerColor


class GameState(BaseModel):
    game_id: str
    mode: GameMode
    ai_level: Optional[AILevel] = None
    player_color: Optional[PlayerColor] = None
    fen: str
    turn: PlayerColor
    status: str
    winner: Optional[PlayerColor] = None
    result_reason: Optional[str] = None
    last_move: Optional[str] = None
    move_history: List[str] = Field(default_factory=list)
    in_check: bool = False
    avg_rollouts_per_move: Optional[float] = None  # Average rollouts per move (for MCTS engines debugging)


class MoveResponse(BaseModel):
    state: GameState
    ai_move: Optional[str] = None


class M2MMatchRequest(BaseModel):
    white_engine: AILevel
    black_engine: AILevel
    max_moves: int = Field(200, ge=10, le=500)
    start_fen: Optional[str] = None
    time_limit_white: Optional[float] = Field(default=None, ge=0.05, le=30, description="Per-move time budget for white engine (seconds)")
    time_limit_black: Optional[float] = Field(default=None, ge=0.05, le=30, description="Per-move time budget for black engine (seconds)")


class M2MBatchRequest(BaseModel):
    white_engine: AILevel
    black_engine: AILevel
    games: int = Field(4, ge=1, le=50)
    swap_colors: bool = True
    max_moves: int = Field(200, ge=10, le=500)
    start_fen: Optional[str] = None
    time_limit_white: Optional[float] = Field(default=None, ge=0.05, le=30)
    time_limit_black: Optional[float] = Field(default=None, ge=0.05, le=30)


class MatchSummary(BaseModel):
    match_id: str
    status: str
    winner: Optional[PlayerColor] = None
    result_reason: Optional[str] = None
    white_engine: AILevel
    black_engine: AILevel
    moves: int
    created_at: str
    time_limit_white: Optional[float] = None
    time_limit_black: Optional[float] = None


class MatchDetail(MatchSummary):
    move_history: List[str]
    final_fen: str


class HistoryType(str, Enum):
    GAME = "game"
    M2M = "m2m"


class HistoryEntry(BaseModel):
    id: str
    kind: HistoryType
    mode: Optional[GameMode] = None
    ai_level: Optional[AILevel] = None
    player_color: Optional[PlayerColor] = None
    white_engine: Optional[AILevel] = None
    black_engine: Optional[AILevel] = None
    winner: Optional[PlayerColor] = None
    result_reason: Optional[str] = None
    moves: int
    created_at: str


class BenchmarkRow(BaseModel):
    time_limit: float
    results: Dict[str, int]
    games: int
    avg_moves: float
    white_win_rate: float
    black_win_rate: float
    draw_rate: float


class BatchTestSummary(BaseModel):
    test_id: str
    kind: str
    status: str
    white_engine: AILevel
    black_engine: AILevel
    games: int
    total_games: int
    completed: int
    results: Dict[str, int]
    matches: List[str]
    swap_colors: bool
    max_moves: int
    time_limit_white: Optional[float] = None
    time_limit_black: Optional[float] = None
    created_at: str
    time_limits: Optional[List[float]] = None
    games_per_limit: Optional[int] = None
    rows: Optional[List[BenchmarkRow]] = None
    image_base64: Optional[str] = None


class TimeBenchmarkRequest(BaseModel):
    white_engine: AILevel
    black_engine: AILevel
    time_limits: List[float]
    games_per_limit: int = Field(2, ge=1, le=20)
    swap_colors: bool = True
    max_moves: int = Field(200, ge=10, le=500)
    start_fen: Optional[str] = None


class PagedMatches(BaseModel):
    items: List[MatchSummary]
    page: int
    page_size: int
    total: int


class PagedTests(BaseModel):
    items: List[BatchTestSummary]
    page: int
    page_size: int
    total: int


class TrainingConfig(BaseModel):
    games: int = Field(10000, ge=1, le=100000, description="Number of self-play games to generate")
    max_moves: int = Field(120, ge=10, le=500)
    time_limit: float = Field(0.7, ge=0.1, le=10.0, description="Per-move time limit during data generation")
    epochs: int = Field(6, ge=1, le=50)
    batch_size: int = Field(32, ge=8, le=256)
    lr: float = Field(1e-3, ge=1e-5, le=1e-1, description="Learning rate")
    load_checkpoint: Optional[str] = Field(None, description="Path to existing checkpoint to load")
    use_cnn: bool = Field(False, description="Use CNN model for self-play generation (requires load_checkpoint)")
    simulations: int = Field(200, ge=50, le=1000, description="MCTS simulations per move")
    workers: Optional[int] = Field(None, ge=1, le=32, description="Number of parallel workers for self-play generation (optional)")


class TrainingStatus(BaseModel):
    training_id: str
    status: str  # "queued", "running", "completed", "failed", "cancelled"
    config: TrainingConfig
    progress: Dict[str, Any] = Field(default_factory=dict)  # games_completed, samples_generated, epochs_done, etc.
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error: Optional[str] = None
    checkpoint_path: Optional[str] = None
