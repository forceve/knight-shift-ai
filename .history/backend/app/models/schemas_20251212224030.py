from __future__ import annotations

from enum import Enum
from typing import List, Optional

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
    ULTIMATE = "ultimate"


class PlayerColor(str, Enum):
    WHITE = "white"
    BLACK = "black"


class HealthResponse(BaseModel):
    status: str = "ok"


class CreateGameRequest(BaseModel):
    mode: GameMode = GameMode.H2H
    ai_level: Optional[AILevel] = None
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


class MoveResponse(BaseModel):
    state: GameState
    ai_move: Optional[str] = None


class M2MMatchRequest(BaseModel):
    white_engine: AILevel
    black_engine: AILevel
    max_moves: int = Field(200, ge=10, le=500)
    start_fen: Optional[str] = None


class M2MBatchRequest(BaseModel):
    white_engine: AILevel
    black_engine: AILevel
    games: int = Field(4, ge=1, le=50)
    swap_colors: bool = True
    max_moves: int = Field(200, ge=10, le=500)


class MatchSummary(BaseModel):
    match_id: str
    status: str
    winner: Optional[PlayerColor] = None
    result_reason: Optional[str] = None
    white_engine: AILevel
    black_engine: AILevel
    moves: int
    created_at: str


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


class BatchTestSummary(BaseModel):
    test_id: str
    status: str
    white_engine: AILevel
    black_engine: AILevel
    games: int
    completed: int
    results: dict
    matches: List[str]
    swap_colors: bool
    max_moves: int
    created_at: str
