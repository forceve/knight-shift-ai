from __future__ import annotations

import datetime as dt
from typing import List

from app.models.schemas import AILevel, GameMode, HistoryEntry, HistoryType, PlayerColor


class HistoryStore:
    def __init__(self):
        self.entries: List[HistoryEntry] = []

    def add_game(self, game_id: str, mode: GameMode, ai_level, player_color: PlayerColor | None, winner, result_reason: str, moves: int):
        entry = HistoryEntry(
            id=game_id,
            kind=HistoryType.GAME,
            mode=mode,
            ai_level=ai_level,
            player_color=player_color,
            winner=winner,
            result_reason=result_reason,
            moves=moves,
            created_at=dt.datetime.utcnow().isoformat(),
        )
        self.entries.insert(0, entry)

    def add_m2m(self, match_id: str, white_engine: AILevel, black_engine: AILevel, winner, result_reason: str, moves: int):
        entry = HistoryEntry(
            id=match_id,
            kind=HistoryType.M2M,
            white_engine=white_engine,
            black_engine=black_engine,
            winner=winner,
            result_reason=result_reason,
            moves=moves,
            created_at=dt.datetime.utcnow().isoformat(),
        )
        self.entries.insert(0, entry)

    def list_entries(self) -> List[HistoryEntry]:
        return list(self.entries)
