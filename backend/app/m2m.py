from __future__ import annotations

import datetime as dt
import threading
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional

import chess

from app.engine.registry import get_engine
from app.history_store import HistoryStore
from app.models.schemas import AILevel, BatchTestSummary, MatchDetail, MatchSummary, PlayerColor
from app.utils import evaluate_status, to_player_color, winner_from_board


@dataclass
class M2MMatch:
    match_id: str
    white_engine: AILevel
    black_engine: AILevel
    status: str
    winner: Optional[PlayerColor]
    result_reason: Optional[str]
    move_history: List[str]
    final_fen: str
    created_at: str

    def to_summary(self) -> MatchSummary:
        return MatchSummary(
            match_id=self.match_id,
            status=self.status,
            winner=self.winner,
            result_reason=self.result_reason,
            white_engine=self.white_engine,
            black_engine=self.black_engine,
            moves=len(self.move_history),
            created_at=self.created_at,
        )

    def to_detail(self) -> MatchDetail:
        return MatchDetail(
            **self.to_summary().model_dump(),
            move_history=self.move_history,
            final_fen=self.final_fen,
        )


@dataclass
class BatchTest:
    test_id: str
    white_engine: AILevel
    black_engine: AILevel
    games: int
    swap_colors: bool
    max_moves: int
    status: str = "running"
    matches: List[str] = field(default_factory=list)
    results: Dict[str, int] = field(default_factory=lambda: {"white": 0, "black": 0, "draw": 0})
    created_at: str = field(default_factory=lambda: dt.datetime.utcnow().isoformat())

    def to_summary(self) -> BatchTestSummary:
        return BatchTestSummary(
            test_id=self.test_id,
            status=self.status,
            white_engine=self.white_engine,
            black_engine=self.black_engine,
            games=self.games,
            completed=len(self.matches),
            results=dict(self.results),
            matches=list(self.matches),
            swap_colors=self.swap_colors,
            max_moves=self.max_moves,
            created_at=self.created_at,
        )


class M2MController:
    def __init__(self, history: HistoryStore):
        self.matches: Dict[str, M2MMatch] = {}
        self.tests: Dict[str, BatchTest] = {}
        self.history = history

    def _run_match_sync(self, match_id: str, white_engine: AILevel, black_engine: AILevel, max_moves: int, start_fen: Optional[str]):
        board = chess.Board(start_fen) if start_fen else chess.Board()
        move_history: List[str] = []
        status = "in_progress"
        winner: Optional[PlayerColor] = None
        result_reason: Optional[str] = None

        for _ in range(max_moves):
            if board.is_game_over():
                break
            engine = get_engine(white_engine if board.turn == chess.WHITE else black_engine)
            result = engine.choose_move(board)
            if result.move is None:
                break
            san = board.san(result.move)
            board.push(result.move)
            move_history.append(san)
            status, winner, result_reason, _ = evaluate_status(board)
            if status != "in_progress":
                break

        if status == "in_progress":
            status, winner, result_reason, _ = evaluate_status(board)
            if status == "in_progress":
                status = "draw"
                result_reason = result_reason or ("max_moves" if len(move_history) >= max_moves else "draw")
                winner = None

        match = self.matches[match_id]
        match.status = status
        match.winner = winner
        match.result_reason = result_reason
        match.move_history = move_history
        match.final_fen = board.fen()
        self.history.add_m2m(match_id=match_id, white_engine=white_engine, black_engine=black_engine, winner=winner, result_reason=result_reason or "", moves=len(move_history))

    def run_match(self, white_engine: AILevel, black_engine: AILevel, max_moves: int = 200, start_fen: Optional[str] = None) -> M2MMatch:
        match_id = str(uuid.uuid4())
        match = M2MMatch(
            match_id=match_id,
            white_engine=white_engine,
            black_engine=black_engine,
            status="running",
            winner=None,
            result_reason=None,
            move_history=[],
            final_fen=start_fen or chess.STARTING_FEN,
            created_at=dt.datetime.utcnow().isoformat(),
        )
        self.matches[match_id] = match

        worker = threading.Thread(target=self._run_match_sync, args=(match_id, white_engine, black_engine, max_moves, start_fen), daemon=True)
        worker.start()
        return match

    def _run_batch_worker(self, test_id: str, white_engine: AILevel, black_engine: AILevel, games: int, swap_colors: bool, max_moves: int, start_fen: Optional[str] = None):
        batch = self.tests[test_id]
        for game_idx in range(games):
            swap = swap_colors and (game_idx % 2 == 1)
            w_engine = black_engine if swap else white_engine
            b_engine = white_engine if swap else black_engine
            match_id = str(uuid.uuid4())
            placeholder = M2MMatch(
                match_id=match_id,
                white_engine=w_engine,
                black_engine=b_engine,
                status="running",
                winner=None,
                result_reason=None,
                move_history=[],
                final_fen=start_fen or chess.STARTING_FEN,
                created_at=dt.datetime.utcnow().isoformat(),
            )
            self.matches[match_id] = placeholder
            self._run_match_sync(match_id, w_engine, b_engine, max_moves, start_fen)
            finished = self.matches[match_id]
            batch.matches.append(match_id)
            if finished.winner is None:
                batch.results["draw"] += 1
            elif finished.winner == PlayerColor.WHITE:
                batch.results["white"] += 1
            else:
                batch.results["black"] += 1
        batch.status = "completed"

    def run_batch(self, white_engine: AILevel, black_engine: AILevel, games: int, swap_colors: bool, max_moves: int, start_fen: Optional[str] = None) -> BatchTest:
        test_id = str(uuid.uuid4())
        batch = BatchTest(
            test_id=test_id,
            white_engine=white_engine,
            black_engine=black_engine,
            games=games,
            swap_colors=swap_colors,
            max_moves=max_moves,
        )
        self.tests[test_id] = batch
        worker = threading.Thread(target=self._run_batch_worker, args=(test_id, white_engine, black_engine, games, swap_colors, max_moves, start_fen), daemon=True)
        worker.start()
        return batch

    def list_matches(self) -> List[MatchSummary]:
        return [m.to_summary() for m in self.matches.values()]

    def get_match(self, match_id: str) -> MatchDetail:
        if match_id not in self.matches:
            raise KeyError("match_not_found")
        return self.matches[match_id].to_detail()

    def list_tests(self) -> List[BatchTestSummary]:
        return [t.to_summary() for t in self.tests.values()]

    def get_test(self, test_id: str) -> BatchTestSummary:
        if test_id not in self.tests:
            raise KeyError("test_not_found")
        return self.tests[test_id].to_summary()
