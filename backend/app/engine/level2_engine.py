from __future__ import annotations

import random
import chess

from app.engine.base_engine import BaseEngine, PIECE_VALUES, SearchResult


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

    def minimax(self, board: chess.Board, depth: int) -> tuple[int, int]:
        if depth == 0 or board.is_game_over():
            return self.evaluate_material(board) - self.repetition_penalty(board), 1
        best = -10_000_000
        nodes = 0
        for move in board.legal_moves:
            board.push(move)
            score, child_nodes = self.minimax(board, depth - 1)
            board.pop()
            nodes += child_nodes + 1
            best = max(best, -score)
        return best, nodes

    def choose_move(self, board: chess.Board, time_limit: float | None = None) -> SearchResult:
        depth = 2  # shallow
        scored = []
        total_nodes = 0
        for move in board.legal_moves:
            board.push(move)
            score, nodes = self.minimax(board, depth - 1)
            board.pop()
            total_nodes += nodes + 1
            # Apply repetition avoidance
            penalty = self.repetition_penalty(board)
            scored.append((move, -score - penalty))

        if not scored:
            return SearchResult(None, 0, depth, total_nodes)

        scored.sort(key=lambda x: x[1], reverse=True)
        top_n = min(3, len(scored))
        move, score = random.choice(scored[:top_n])
        return SearchResult(move, score, depth, total_nodes)
