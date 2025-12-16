from __future__ import annotations

import random
import time
from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Tuple, Any

import chess
from chess import Board

from app.engine.transposition_table import TranspositionTable, TTEntry
from app.engine.zobrist_hash import get_hasher


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
    extra_info: Optional[Dict[str, Any]] = None  # For debugging info (e.g., MCTS simulations, rollout stats)


class BaseEngine:
    """
    Base engine with helpers for evaluation and move ordering.
    
    Supports optional transposition table caching via Zobrist hashing.
    Enable caching for engines that benefit from position reuse (e.g., iterative deepening, MCTS).
    """

    name: str = "base"

    def __init__(self, use_tt: bool = False, tt_size_mb: int = 16):
        """
        Initialize engine with optional transposition table.
        
        Args:
            use_tt: Whether to enable transposition table caching
            tt_size_mb: Size of transposition table in megabytes (if enabled)
        """
        self.use_tt = use_tt
        self.tt: Optional[TranspositionTable] = TranspositionTable(tt_size_mb) if use_tt else None
        self.hasher = get_hasher() if use_tt else None

    def clear_cache(self) -> None:
        """Clear the transposition table cache. Should be called at the start of each game."""
        if self.tt:
            self.tt.clear()

    def choose_move(self, board: chess.Board, time_limit: float | None = None) -> SearchResult:
        raise NotImplementedError

    # --- Evaluation helpers ---
    def evaluate(self, board: chess.Board) -> int:
        """
        Evaluate a normal chess position (not terminal).
        Does NOT handle checkmate, stalemate, or draws - these should be handled
        in the search layer using evaluate_terminal_position().
        
        Following PeSTO design: keep evaluation function "quiet" by handling
        special cases in search layer.
        """
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

        side_eval = score if board.turn == chess.WHITE else -score
        side_eval -= self.repetition_penalty(board, current_eval=side_eval)
        side_eval += self.drawish_bias(board, side_eval)

        return side_eval

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
            return SearchResult(None, 0, 0, 0, None)
        best_score = max(score for _, score in scored_moves)
        best_moves = [m for m, s in scored_moves if s == best_score]
        move = random.choice(best_moves)
        return SearchResult(move, best_score, 1, len(scored_moves), None)

    def repetition_penalty(self, board: Board, current_eval: Optional[int] = None) -> int:
        """
        Encourage avoiding threefold/fivefold repetition in winning positions while still allowing
        drawing lines when behind. current_eval is from the perspective of side-to-move.
        
        Now includes prevention: penalizes positions that are approaching repetition.
        """
        # Check if already in threefold/fivefold repetition
        if board.is_fivefold_repetition() or board.is_repetition(3) or board.can_claim_threefold_repetition():
            base = 3000
            if current_eval is not None:
                if current_eval > 200:
                    base = 6000 + min(2000, current_eval // 2)
                elif current_eval < -200:
                    base = 800
            return base
        
        # Prevention: count how many times current position appears in history
        # Skip if no moves made (initial position)
        if len(board.move_stack) == 0:
            return 0
        
        # Get current position (without move counters)
        current_fen_base = board.fen().rsplit(' ', 4)[0]
        repetition_count = 0
        
        # Count occurrences in history
        temp_board = board.copy(stack=False)
        for _ in range(len(board.move_stack)):
            if len(temp_board.move_stack) == 0:
                break
            temp_board.pop()
            hist_fen_base = temp_board.fen().rsplit(' ', 4)[0]
            if hist_fen_base == current_fen_base:
                repetition_count += 1
        
        # Apply prevention penalty based on repetition count
        # Only penalize from 2nd repetition onwards (1st repetition is normal)
        if repetition_count >= 2:
            # Already appeared twice, next repetition = threefold (very bad)
            if current_eval is not None and current_eval > 100:
                return 4000 + min(1000, current_eval // 3)
            return 3000
        
        return 0

    def drawish_bias(self, board: Board, current_eval: int) -> int:
        """
        Add a bias to avoid drawish outcomes (threefold/stalemate/50-move) when ahead.
        Positive current_eval means side-to-move is better.
        """
        bias = 0
        # Penalize creeping toward stalemate with big advantage
        if current_eval > 250 and not board.is_check() and len(list(board.legal_moves)) <= 2:
            bias -= 1200
        # Avoid fifty-move draws when better
        if board.halfmove_clock >= 80 and current_eval > 200:
            bias -= 700
        # Threefold/claim bias
        if board.is_fivefold_repetition() or board.can_claim_threefold_repetition():
            if current_eval > 200:
                bias -= 5000 + min(2000, current_eval // 2)
            elif current_eval < -150:
                bias += 1200
        return bias


def is_time_exceeded(start_time: float, time_limit: Optional[float]) -> bool:
    return time_limit is not None and (time.perf_counter() - start_time) >= time_limit


def evaluate_terminal_position(board: chess.Board) -> Optional[int]:
    """
    Evaluate terminal positions (checkmate, stalemate, draw).
    Returns the evaluation score from side-to-move perspective, or None if not terminal.
    
    This function should be called in the search layer before calling evaluate().
    Following PeSTO design: keep evaluation function "quiet" by handling special cases in search.
    """
    if board.is_checkmate():
        # Side-to-move is checkmated, so evaluation is very negative
        return -20_000
    
    if board.is_stalemate():
        # Stalemate is a draw, but we bias slightly based on material
        # This helps avoid stalemate when ahead
        score = 0
        for piece_type in PIECE_VALUES:
            score += len(board.pieces(piece_type, chess.WHITE)) * PIECE_VALUES[piece_type]
            score -= len(board.pieces(piece_type, chess.BLACK)) * PIECE_VALUES[piece_type]
        side_eval = score if board.turn == chess.WHITE else -score
        # Bias: if ahead, stalemate is bad; if behind, stalemate is good
        stalemate_bias = 8000 if side_eval > 0 else -500
        return side_eval - stalemate_bias
    
    if board.is_insufficient_material():
        return 0
    
    if board.can_claim_threefold_repetition() or board.can_claim_fifty_moves():
        # Draw by repetition or 50-move rule
        # Bias based on material advantage
        score = 0
        for piece_type in PIECE_VALUES:
            score += len(board.pieces(piece_type, chess.WHITE)) * PIECE_VALUES[piece_type]
            score -= len(board.pieces(piece_type, chess.BLACK)) * PIECE_VALUES[piece_type]
        side_eval = score if board.turn == chess.WHITE else -score
        # Small bias to avoid draws when ahead
        if side_eval > 200:
            return side_eval - 500
        elif side_eval < -200:
            return side_eval + 500
        return 0
    
    return None  # Not a terminal position
