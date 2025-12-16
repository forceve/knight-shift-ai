from __future__ import annotations

import time
from pathlib import Path
from typing import Optional

import chess

from app.engine.base_engine import SearchResult, is_time_exceeded
from app.engine.mcts_engine import MCTSEngine, MCTSNode
from app.engine.nn_eval import evaluate_with_cnn, load_value_network, ensure_torch


class MCTSCNNEvalEngine(MCTSEngine):
    """
    MCTS variant that uses a small CNN value network to evaluate leaf positions instead of random rollouts.
    Falls back to the heuristic rollout from the base class if PyTorch is unavailable.
    """

    name = "mcts+cnn"

    def __init__(self, value_path: str | None = None, simulations: int = 500, c_puct: float = 1.3, rollout_depth: int = 10, device: Optional[str] = None):
        # MCTSEngine.__init__ already enables TT, so we just need to call it
        super().__init__(simulations=simulations, c_puct=c_puct, rollout_depth=rollout_depth)
        self.device = device
        checkpoint = value_path or str(Path(__file__).resolve().parent / "checkpoints" / "mcts_value.pt")
        try:
            ensure_torch()
        except Exception:
            self.model = None
        else:
            self.model = load_value_network(checkpoint, device=device)

    def choose_move(self, board: chess.Board, time_limit: float | None = 1.6) -> SearchResult:
        # No need to adjust simulations count anymore since we removed the fixed limit
        # The engine will run as many simulations as time allows
        return super().choose_move(board, time_limit=time_limit)

    def _evaluate_leaf(self, node: MCTSNode, start: float, time_limit: Optional[float]) -> float:
        board = node.board
        if board.is_checkmate():
            return -1.0
        if board.is_stalemate() or board.is_insufficient_material() or board.can_claim_threefold_repetition() or board.can_claim_fifty_moves():
            return 0.0

        # Check cache first (CNN evaluation is expensive, so caching is very beneficial)
        if self.use_tt and self.hasher and self.tt:
            hash_key = self.hasher.hash_position(board)
            cached = self.tt.probe(hash_key, 0, -1_000_000, 1_000_000)
            if cached:
                score, _ = cached
                # Convert from centipawns to [-1, 1] range
                return max(-1.0, min(1.0, score / 5000.0))

        if self.model is not None and not is_time_exceeded(start, time_limit):
            try:
                value = evaluate_with_cnn(self.model, board, device=self.device)
                # Cache CNN evaluation result
                if self.use_tt and self.hasher and self.tt:
                    score_centipawns = int(value * 5000)
                    self.tt.store(hash_key, score_centipawns, 0, TTEntry.EXACT)
                return max(-1.0, min(1.0, value))
            except Exception:
                # Fall back to rollout if evaluation fails unexpectedly
                pass

        value = super()._evaluate_leaf(node, start, time_limit)
        
        # Cache the result from parent's rollout
        if self.use_tt and self.hasher and self.tt:
            hash_key = self.hasher.hash_position(board)
            score_centipawns = int(value * 5000)
            self.tt.store(hash_key, score_centipawns, 0, TTEntry.EXACT)
        
        return value
