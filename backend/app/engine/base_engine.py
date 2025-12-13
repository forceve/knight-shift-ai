from __future__ import annotations

import random
import time
from dataclasses import dataclass
from typing import List, Optional, Sequence, Tuple

import chess
from chess import Board


PIECE_VALUES = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 20000,
}

# Basic piece-square tables (opening-ish). Indexed by square for white; black mirrored.
PST_PAWN = [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
]

PST_KNIGHT = [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
]

PST_BISHOP = [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
]

PST_ROOK = [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0,
]

PST_QUEEN = [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20,
]

PST_KING_OPENING = [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20,
]

PST_KING_ENDGAME = [
    -50, -40, -30, -20, -20, -30, -40, -50,
    -30, -20, -10, 0, 0, -10, -20, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -30, 0, 0, 0, 0, -30, -30,
    -50, -30, -30, -30, -30, -30, -30, -50,
]


def mirror_for_color(square: chess.Square, color: chess.Color) -> int:
    return square if color == chess.WHITE else chess.square_mirror(square)


PIECE_PSTS = {
    chess.PAWN: PST_PAWN,
    chess.KNIGHT: PST_KNIGHT,
    chess.BISHOP: PST_BISHOP,
    chess.ROOK: PST_ROOK,
    chess.QUEEN: PST_QUEEN,
}


@dataclass
class SearchResult:
    move: Optional[chess.Move]
    score: int
    depth: int
    nodes: int


class BaseEngine:
    """
    Base engine with helpers for evaluation and move ordering.
    """

    name: str = "base"

    def choose_move(self, board: chess.Board, time_limit: float | None = None) -> SearchResult:
        raise NotImplementedError

    # --- Evaluation helpers ---
    def evaluate(self, board: chess.Board) -> int:
        score = 0
        # Material + PST
        for piece_type in PIECE_VALUES:
            for color in (chess.WHITE, chess.BLACK):
                pieces = board.pieces(piece_type, color)
                mult = 1 if color == chess.WHITE else -1
                score += len(pieces) * PIECE_VALUES[piece_type] * mult
                if piece_type in PIECE_PSTS:
                    pst = PIECE_PSTS[piece_type]
                    for sq in pieces:
                        score += pst[mirror_for_color(sq, color)] * mult

        # Mobility
        mobility = len(list(board.legal_moves))
        score += 2 * mobility if board.turn == chess.WHITE else -2 * mobility

        # King safety light heuristic: castling rights
        if board.has_castling_rights(chess.WHITE):
            score += 20
        if board.has_castling_rights(chess.BLACK):
            score -= 20

        score -= self.repetition_penalty(board)

        return score if board.turn == chess.WHITE else -score

    def order_moves(self, board: chess.Board, moves: Sequence[chess.Move]) -> List[chess.Move]:
        def move_score(move: chess.Move) -> int:
            if board.is_capture(move):
                captured = board.piece_type_at(move.to_square)
                mover = board.piece_type_at(move.from_square)
                if captured and mover:
                    return 10 * PIECE_VALUES[captured] - PIECE_VALUES[mover]
            if board.gives_check(move):
                return 500
            return 0

        return sorted(moves, key=move_score, reverse=True)

    # Utility: random tiebreaker among best moves
    def pick_best_with_tiebreak(self, scored_moves: List[Tuple[chess.Move, int]]) -> SearchResult:
        if not scored_moves:
            return SearchResult(None, 0, 0, 0)
        best_score = max(score for _, score in scored_moves)
        best_moves = [m for m, s in scored_moves if s == best_score]
        move = random.choice(best_moves)
        return SearchResult(move, best_score, 1, len(scored_moves))

    def repetition_penalty(self, board: Board) -> int:
        # Encourage avoiding threefold repetition claims.
        if board.is_fivefold_repetition() or board.is_repetition(3) or board.can_claim_threefold_repetition():
            return 5000
        return 0


def is_time_exceeded(start_time: float, time_limit: Optional[float]) -> bool:
    return time_limit is not None and (time.perf_counter() - start_time) >= time_limit
