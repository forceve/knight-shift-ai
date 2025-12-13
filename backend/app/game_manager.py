from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional

import chess

from app.history_store import HistoryStore
from app.engine.registry import get_engine
from app.models.schemas import AILevel, GameMode, GameState, MoveResponse, PlayerColor
from app.utils import evaluate_status, to_player_color, winner_from_board


@dataclass
class GameSession:
    game_id: str
    mode: GameMode
    board: chess.Board
    ai_level: Optional[AILevel] = None
    player_color: Optional[PlayerColor] = None
    move_history: List[str] = field(default_factory=list)
    status: str = "in_progress"
    winner: Optional[PlayerColor] = None
    result_reason: Optional[str] = None
    last_move: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_state(self) -> GameState:
        turn_color = to_player_color(self.board.turn)
        in_check_status = self.board.is_check()
        return GameState(
            game_id=self.game_id,
            mode=self.mode,
            ai_level=self.ai_level,
            player_color=self.player_color,
            fen=self.board.fen(),
            turn=turn_color,
            status=self.status,
            winner=self.winner,
            result_reason=self.result_reason,
            last_move=self.last_move,
            move_history=list(self.move_history),
            in_check=in_check_status,
        )


class GameManager:
    def __init__(self, history: HistoryStore):
        self.games: Dict[str, GameSession] = {}
        self.history = history

    def create_game(self, mode: GameMode, ai_level: Optional[AILevel], player_color: Optional[PlayerColor], start_fen: Optional[str]) -> GameSession:
        board = chess.Board(start_fen) if start_fen else chess.Board()
        game_id = str(uuid.uuid4())
        session = GameSession(
            game_id=game_id,
            mode=mode,
            board=board,
            ai_level=ai_level,
            player_color=player_color,
        )
        self.games[game_id] = session
        return session

    def get_game(self, game_id: str) -> GameSession:
        if game_id not in self.games:
            raise KeyError("game_not_found")
        return self.games[game_id]

    def apply_move(self, game_id: str, from_sq: str, to_sq: str, promotion: Optional[str]) -> MoveResponse:
        session = self.get_game(game_id)
        if session.status != "in_progress":
            return MoveResponse(state=session.to_state(), ai_move=None)
        if session.mode == GameMode.H2M and session.player_color is not None:
            expected = session.player_color == PlayerColor.WHITE
            if session.board.turn != expected:
                raise ValueError("not_player_turn")

        move = self._build_move(from_sq, to_sq, promotion)
        if move not in session.board.legal_moves:
            raise ValueError("illegal_move")

        san = session.board.san(move)
        session.board.push(move)
        session.last_move = san
        session.move_history.append(san)
        status, winner, reason, in_check = evaluate_status(session.board)
        session.status = status
        session.winner = winner
        session.result_reason = reason
        if status != "in_progress":
            self.history.add_game(
                game_id=session.game_id,
                mode=session.mode,
                ai_level=session.ai_level,
                player_color=session.player_color,
                winner=winner,
                result_reason=reason or "",
                moves=len(session.move_history),
            )

        return MoveResponse(state=session.to_state(), ai_move=None)

    def ai_move(self, game_id: str, time_limit: Optional[float] = None) -> MoveResponse:
        session = self.get_game(game_id)
        if session.status != "in_progress":
            return MoveResponse(state=session.to_state(), ai_move=None)
        if session.mode == GameMode.H2H:
            raise ValueError("ai_not_enabled")
        if session.ai_level is None:
            raise ValueError("missing_ai_level")
        # Ensure it is AI's turn in H2M; for M2M we allow either side since both AI.
        if session.mode == GameMode.H2M and session.player_color is not None:
            player_is_white = session.player_color == PlayerColor.WHITE
            if session.board.turn == player_is_white:
                raise ValueError("ai_wait_player_turn")

        engine = get_engine(session.ai_level)
        result = engine.choose_move(session.board, time_limit=time_limit)
        if result.move is None:
            # No legal move; set status based on board outcome.
            session.status, session.winner, session.result_reason, _ = evaluate_status(session.board)
            return MoveResponse(state=session.to_state(), ai_move=None)

        san = session.board.san(result.move)
        session.board.push(result.move)
        session.last_move = san
        session.move_history.append(san)
        status, winner, reason, _ = evaluate_status(session.board)
        session.status = status
        session.winner = winner
        session.result_reason = reason
        if status != "in_progress":
            self.history.add_game(
                game_id=session.game_id,
                mode=session.mode,
                ai_level=session.ai_level,
                player_color=session.player_color,
                winner=winner,
                result_reason=reason or "",
                moves=len(session.move_history),
            )
        return MoveResponse(state=session.to_state(), ai_move=result.move.uci())

    def resign(self, game_id: str, player: PlayerColor) -> GameState:
        session = self.get_game(game_id)
        session.status = "resigned"
        session.winner = PlayerColor.BLACK if player == PlayerColor.WHITE else PlayerColor.WHITE
        session.result_reason = "resign"
        self.history.add_game(
            game_id=session.game_id,
            mode=session.mode,
            ai_level=session.ai_level,
            player_color=session.player_color,
            winner=session.winner,
            result_reason=session.result_reason or "",
            moves=len(session.move_history),
        )
        return session.to_state()

    def _build_move(self, from_sq: str, to_sq: str, promotion: Optional[str]) -> chess.Move:
        promo_char = ""
        if promotion:
            mapping = {"q": "q", "r": "r", "b": "b", "n": "n"}
            if promotion.lower() not in mapping:
                raise ValueError("invalid_promotion")
            promo_char = mapping[promotion.lower()]
        return chess.Move.from_uci(f"{from_sq}{to_sq}{promo_char}")
