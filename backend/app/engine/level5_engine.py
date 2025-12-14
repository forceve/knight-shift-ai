from __future__ import annotations

import chess

from app.engine.base_engine import BaseEngine, SearchResult


class Level5Engine(BaseEngine):
    """
    Alpha-beta with fixed depth and simple move ordering (captures/checks first). (原level2)
    """

    name = "level5 (原level2)"

    def alphabeta(self, board: chess.Board, depth: int, alpha: int, beta: int) -> tuple[int, int]:
        if depth == 0 or board.is_game_over():
            return self.evaluate(board), 1

        nodes = 0
        best = -10_000_000
        moves = self.order_moves(board, board.legal_moves)
        for move in moves:
            board.push(move)
            score, child_nodes = self.alphabeta(board, depth - 1, -beta, -alpha)
            board.pop()
            nodes += child_nodes + 1
            score = -score
            if score > best:
                best = score
            if best > alpha:
                alpha = best
            if alpha >= beta:
                break
        return best, nodes

    def choose_move(self, board: chess.Board, time_limit: float | None = None) -> SearchResult:
        depth = 3
        best_move = None
        best_score = -10_000_000
        total_nodes = 0
        moves = self.order_moves(board, board.legal_moves)
        for move in moves:
            board.push(move)
            score, nodes = self.alphabeta(board, depth - 1, -1_000_000, 1_000_000)
            board.pop()
            total_nodes += nodes + 1
            score = -score
            if score > best_score:
                best_score = score
                best_move = move
        return SearchResult(best_move, best_score, depth, total_nodes)
