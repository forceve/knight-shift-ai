from __future__ import annotations

import time
import chess

from app.engine.base_engine import BaseEngine, SearchResult, is_time_exceeded, evaluate_terminal_position
from app.engine.transposition_table import TTEntry


class Level3Engine(BaseEngine):
    """
    Iterative deepening alpha-beta with basic quiescence to stabilize tactical positions.
    Uses transposition table caching for improved performance.
    """

    name = "level3"

    def __init__(self):
        super().__init__(use_tt=True, tt_size_mb=16)

    def quiescence(self, board: chess.Board, alpha: int, beta: int, nodes: list[int]) -> int:
        # Handle terminal positions in search layer
        terminal_eval = evaluate_terminal_position(board)
        if terminal_eval is not None:
            nodes[0] += 1
            return terminal_eval

        # Simple capture-only quiescence to steady leaf evaluations
        stand_pat = self.evaluate(board)
        nodes[0] += 1
        if stand_pat >= beta:
            return beta
        if stand_pat > alpha:
            alpha = stand_pat

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

    def alphabeta(
        self,
        board: chess.Board,
        depth: int,
        alpha: int,
        beta: int,
        start: float,
        time_limit: float | None,
        nodes: list[int],
    ) -> int:
        original_alpha = alpha

        # Handle terminal positions in search layer
        terminal_eval = evaluate_terminal_position(board)
        if terminal_eval is not None:
            return terminal_eval

        # Query transposition table
        if self.use_tt and self.hasher and self.tt:
            hash_key = self.hasher.hash_position(board)
            cached = self.tt.probe(hash_key, depth, alpha, beta)
            if cached:
                score, flag = cached
                if flag == TTEntry.EXACT:
                    return score
                elif flag == TTEntry.LOWER_BOUND:
                    alpha = max(alpha, score)
                elif flag == TTEntry.UPPER_BOUND:
                    beta = min(beta, score)
                if alpha >= beta:
                    return score

        if depth == 0:
            score = self.quiescence(board, alpha, beta, nodes)
        else:
            moves = self.order_moves(board, board.legal_moves)
            best_score = -10_000_000
            for move in moves:
                if is_time_exceeded(start, time_limit):
                    break
                board.push(move)
                score = -self.alphabeta(board, depth - 1, -beta, -alpha, start, time_limit, nodes)
                board.pop()
                if score > best_score:
                    best_score = score
                if score > alpha:
                    alpha = score
                if alpha >= beta:
                    break
            score = best_score
            nodes[0] += 1

        # Store in transposition table
        if self.use_tt and self.hasher and self.tt:
            if score <= original_alpha:
                flag = TTEntry.UPPER_BOUND
            elif score >= beta:
                flag = TTEntry.LOWER_BOUND
            else:
                flag = TTEntry.EXACT
            self.tt.store(hash_key, score, depth, flag)

        return score

    def choose_move(self, board: chess.Board, time_limit: float | None = 0.6) -> SearchResult:
        # Clear cache at start of each move search
        self.clear_cache()

        best_move = None
        best_score = -10_000_000
        total_nodes = 0
        start = time.perf_counter()
        max_depth = 6
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
