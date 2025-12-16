from __future__ import annotations

import chess

from app.engine.base_engine import BaseEngine, SearchResult, evaluate_terminal_position


class Level1Engine(BaseEngine):
    """
    Greedy algorithm: evaluates all legal moves one ply deep and picks the best move.
    No search depth, just immediate material + positional evaluation.
    """

    name = "level1 (greedy)"

    def choose_move(self, board: chess.Board, time_limit: float | None = None) -> SearchResult:
        if not board.legal_moves:
            return SearchResult(None, 0, 1, 0)

        best_move = None
        best_score = -10_000_000
        total_nodes = 0

        for move in board.legal_moves:
            board.push(move)
            # Handle terminal positions in search layer
            terminal_eval = evaluate_terminal_position(board)
            if terminal_eval is not None:
                score = -terminal_eval  # Negate because evaluate_terminal_position returns from opponent's perspective
            else:
                score = -self.evaluate(board)  # Negate because evaluate returns from board.turn's perspective (now opponent)
            board.pop()
            total_nodes += 1

            if score > best_score:
                best_score = score
                best_move = move

        return SearchResult(best_move, best_score, 1, total_nodes)
