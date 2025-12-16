from __future__ import annotations

import math
import random
import time
from typing import Dict, Optional, Tuple

import chess

from app.engine.base_engine import BaseEngine, SearchResult, is_time_exceeded
from app.engine.transposition_table import TTEntry


class MCTSNode:
    def __init__(self, board: chess.Board, parent: Optional["MCTSNode"] = None, prior: float = 0.0, move: Optional[chess.Move] = None):
        self.board = board
        self.parent = parent
        self.prior = prior
        self.move = move
        self.children: Dict[chess.Move, MCTSNode] = {}
        self.visit_count = 0
        self.value_sum = 0.0

    @property
    def value(self) -> float:
        if self.visit_count == 0:
            return 0.0
        return self.value_sum / self.visit_count

    def is_expanded(self) -> bool:
        return len(self.children) > 0

    def expand(self, engine: BaseEngine):
        if self.board.is_game_over():
            return
        legal_moves = list(self.board.legal_moves)
        ordered = engine.order_moves(self.board, legal_moves)
        if not ordered:
            return
        prior = 1.0 / len(ordered)
        for mv in ordered:
            next_board = self.board.copy(stack=False)
            next_board.push(mv)
            self.children[mv] = MCTSNode(next_board, parent=self, prior=prior, move=mv)

    def select(self, c_puct: float) -> Tuple[chess.Move, "MCTSNode"]:
        best_move: Optional[chess.Move] = None
        best_child: Optional[MCTSNode] = None
        best_score = -1e9
        sqrt_visits = math.sqrt(self.visit_count + 1)
        for mv, child in self.children.items():
            u = c_puct * child.prior * sqrt_visits / (1 + child.visit_count)
            score = child.value + u
            if score > best_score:
                best_score = score
                best_move = mv
                best_child = child
        assert best_move is not None and best_child is not None
        return best_move, best_child


class MCTSEngine(BaseEngine):
    """
    Monte Carlo Tree Search with lightweight rollouts guided by base evaluation.
    Uses transposition table caching to improve rollout efficiency.
    """

    name = "mcts"

    def __init__(self, simulations: int = 600, c_puct: float = 1.4, rollout_depth: int = 14):
        super().__init__(use_tt=True, tt_size_mb=16)
        self.simulations = simulations
        self.c_puct = c_puct
        self.rollout_depth = rollout_depth

    # --- Core MCTS ---
    def choose_move(self, board: chess.Board, time_limit: float | None = 1.5) -> SearchResult:
        # Clear cache at start of each move search
        self.clear_cache()
        
        if board.is_game_over():
            return SearchResult(None, 0, 0, 0, None)
        root_board = board.copy(stack=False)
        root = MCTSNode(root_board)
        root.expand(self)
        start = time.perf_counter()
        simulations_run = 0

        # Run simulations until time limit is reached (no fixed count limit)
        # This allows the engine to fully utilize available time
        while not is_time_exceeded(start, time_limit):
            self._simulate(root, start, time_limit)
            simulations_run += 1

        best_move = self._best_move(root)
        if best_move is None:
            return SearchResult(None, 0, 1, simulations_run, extra_info={"simulations": simulations_run, "avg_rollouts_per_move": simulations_run})
        best_child = root.children[best_move]
        score_hint = int(best_child.value * 10_000)
        depth_hint = min(self.rollout_depth, 8)
        # Include debugging info: simulations run (which equals total rollouts for MCTS)
        extra_info = {
            "simulations": simulations_run,
            "avg_rollouts_per_move": simulations_run,  # For MCTS, each simulation is one rollout
        }
        return SearchResult(best_move, score_hint, depth_hint, simulations_run, extra_info=extra_info)

    def _simulate(self, root: MCTSNode, start: float, time_limit: Optional[float]) -> None:
        node = root
        path = [node]

        # Selection
        while node.is_expanded() and node.children:
            if is_time_exceeded(start, time_limit):
                return
            _, node = node.select(self.c_puct)
            path.append(node)

        # Expansion
        if not node.is_expanded():
            node.expand(self)

        # Evaluation
        value = self._evaluate_leaf(node, start, time_limit)

        # Backpropagate with alternating perspective
        for n in reversed(path):
            n.visit_count += 1
            n.value_sum += value
            value = -value

    def _evaluate_leaf(self, node: MCTSNode, start: float, time_limit: Optional[float]) -> float:
        board = node.board
        if board.is_checkmate():
            return -1.0
        if board.is_stalemate() or board.is_insufficient_material() or board.can_claim_threefold_repetition() or board.can_claim_fifty_moves():
            return 0.0

        # Try to get cached evaluation (for rollout end positions)
        if self.use_tt and self.hasher and self.tt:
            hash_key = self.hasher.hash_position(board)
            # Use depth=0 for leaf evaluations (quiescence-like)
            cached = self.tt.probe(hash_key, 0, -1_000_000, 1_000_000)
            if cached:
                score, _ = cached
                # Convert from centipawns to [-1, 1] range
                return max(-0.99, min(0.99, score / 5000.0))

        rollout_board = board.copy(stack=False)
        value = self._rollout(rollout_board, start, time_limit)
        
        # Cache the evaluation result (store as centipawns)
        if self.use_tt and self.hasher and self.tt:
            # Convert back to centipawns for storage
            score_centipawns = int(value * 5000)
            self.tt.store(hash_key, score_centipawns, 0, TTEntry.EXACT)
        
        return value

    def _rollout(self, board: chess.Board, start: float, time_limit: Optional[float]) -> float:
        depth = 0
        # Cache positions during rollout to avoid re-evaluating same positions
        while depth < self.rollout_depth and not board.is_game_over():
            if is_time_exceeded(start, time_limit):
                break
            
            # Check cache for current position (can happen if we've seen this position before)
            if self.use_tt and self.hasher and self.tt:
                hash_key = self.hasher.hash_position(board)
                cached = self.tt.probe(hash_key, 0, -1_000_000, 1_000_000)
                if cached:
                    score, _ = cached
                    # Convert from centipawns to [-1, 1] and return early
                    return max(-0.99, min(0.99, score / 5000.0))
            
            moves = list(board.legal_moves)
            if not moves:
                break
            move = self._sample_move(board, moves)
            board.push(move)
            depth += 1

        if board.is_checkmate():
            return -1.0
        if board.is_stalemate() or board.is_insufficient_material():
            return 0.0
        
        # Final position evaluation - check cache first
        hash_key = None
        if self.use_tt and self.hasher and self.tt:
            hash_key = self.hasher.hash_position(board)
            cached = self.tt.probe(hash_key, 0, -1_000_000, 1_000_000)
            if cached:
                score, _ = cached
                return max(-0.99, min(0.99, score / 5000.0))
        
        # Heuristic evaluation scaled to [-1, 1]
        eval_score = self.evaluate(board)
        value = max(-0.99, min(0.99, eval_score / 5000.0))
        
        # Cache the final position evaluation
        if self.use_tt and self.hasher and self.tt and hash_key is not None:
            self.tt.store(hash_key, eval_score, 0, TTEntry.EXACT)
        
        return value

    def _sample_move(self, board: chess.Board, moves) -> chess.Move:
        ordered = self.order_moves(board, moves)
        top_k = max(1, min(4, len(ordered)))
        return random.choice(ordered[:top_k])

    def _best_move(self, root: MCTSNode) -> Optional[chess.Move]:
        if not root.children:
            return None
        # Highest visit count wins; tiebreaker by value
        best_move = None
        best_visits = -1
        best_value = -1e9
        for mv, child in root.children.items():
            if child.visit_count > best_visits or (child.visit_count == best_visits and child.value > best_value):
                best_move = mv
                best_visits = child.visit_count
                best_value = child.value
        return best_move
