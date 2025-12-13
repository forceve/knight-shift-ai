from __future__ import annotations

import time
import chess

from app.engine.base_engine import BaseEngine, SearchResult, is_time_exceeded


class Level3Engine(BaseEngine):
    """
    Iterative deepening alpha-beta with basic quiescence to stabilize tactical positions.
    """

    name = "level3"

    def quiescence(self, board: chess.Board, alpha: int, beta: int, nodes: list[int]) -> int:
        stand_pat = self.evaluate(board)
        nodes[0] += 1
        if stand_pat >= beta:
            return beta
        if alpha < stand_pat:
            alpha = stand_pat
        # Explore captures only
        for move in self.order_moves(board, board.legal_moves):
            if not board.is_capture(move):
                continue
            board.push(move)
            score = -self.quiescence(board, -beta, -alpha, nodes)
            board.pop()
            if score >= beta:
                return beta
            if score > alpha:
                alpha = score
        return alpha

    def alphabeta(self, board: chess.Board, depth: int, alpha: int, beta: int, start: float, time_limit: float | None, nodes: list[int]) -> int:
        if depth == 0 or board.is_game_over():
            return self.quiescence(board, alpha, beta, nodes)
        moves = self.order_moves(board, board.legal_moves)
        for move in moves:
            if is_time_exceeded(start, time_limit):
                break
            board.push(move)
            score = -self.alphabeta(board, depth - 1, -beta, -alpha, start, time_limit, nodes)
            board.pop()
            if score > alpha:
                alpha = score
            if alpha >= beta:
                break
        nodes[0] += 1
        return alpha

    def choose_move(self, board: chess.Board, time_limit: float | None = 0.6) -> SearchResult:
        best_move = None
        best_score = -10_000_000
        total_nodes = 0
        start = time.perf_counter()
        max_depth = 4
        searched_depth = 0

        ordered = self.order_moves(board, board.legal_moves)
        for depth in range(1, max_depth + 1):
            if is_time_exceeded(start, time_limit):
                break
            iteration_best_move = best_move
            iteration_best_score = -10_000_000
            for move in ordered:
                if is_time_exceeded(start, time_limit):
                    break
                board.push(move)
                nodes = [0]
                score = -self.alphabeta(board, depth - 1, -1_000_000, 1_000_000, start, time_limit, nodes)
                board.pop()
                total_nodes += nodes[0]
                if score > iteration_best_score:
                    iteration_best_score = score
                    iteration_best_move = move
            if iteration_best_move:
                best_move = iteration_best_move
                best_score = iteration_best_score
                searched_depth = depth
        return SearchResult(best_move, best_score, searched_depth, total_nodes)
