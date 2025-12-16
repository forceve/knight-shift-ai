from __future__ import annotations

import random
import chess

from app.engine.base_engine import BaseEngine, PIECE_VALUES, SearchResult, evaluate_terminal_position


class Level2Engine(BaseEngine):
    """
    Shallow minimax without alpha-beta, material-only eval and random tie-breaking to keep play weak. (原level1)
    """

    name = "level2 (原level1)"

    def evaluate_material(self, board: chess.Board) -> int:
        score = 0
        for piece_type, value in PIECE_VALUES.items():
            score += len(board.pieces(piece_type, chess.WHITE)) * value
            score -= len(board.pieces(piece_type, chess.BLACK)) * value
        return score if board.turn == chess.WHITE else -score

    def alphabeta(self, board: chess.Board, depth: int, alpha: int, beta: int) -> tuple[int, int]:
        # Handle terminal positions in search layer
        terminal_eval = evaluate_terminal_position(board)
        if terminal_eval is not None:
            return terminal_eval, 1
        
        if depth == 0:
            eval_score = self.evaluate_material(board)
            eval_score -= self.repetition_penalty(board, current_eval=eval_score)
            return eval_score, 1

        best = -10_000_000
        nodes = 1  # count current node
        for move in self.order_moves(board, board.legal_moves):
            board.push(move)
            score, child_nodes = self.alphabeta(board, depth - 1, -beta, -alpha)
            board.pop()
            nodes += child_nodes
            score = -score
            if score > best:
                best = score
            if best > alpha:
                alpha = best
            if alpha >= beta:
                break
        return best, nodes

    def choose_move(self, board: chess.Board, time_limit: float | None = None) -> SearchResult:
        depth = 3  # slightly deeper but still lightweight
        scored = []
        total_nodes = 0
        for move in board.legal_moves:
            board.push(move)
            score, nodes = self.alphabeta(board, depth - 1, -1_000_000, 1_000_000)
            board.pop()
            total_nodes += nodes
            scored.append((move, -score))

        if not scored:
            return SearchResult(None, 0, depth, total_nodes)

        scored.sort(key=lambda x: x[1], reverse=True)
        top_n = min(3, len(scored))
        move, score = random.choice(scored[:top_n])
        return SearchResult(move, score, depth, total_nodes)
