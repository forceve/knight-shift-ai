from __future__ import annotations

import time
import chess
import sys
from pathlib import Path

# Import PeSTO evaluation function
# ultimate_engine.py is at: backend/app/engine/ultimate_engine.py
# pesto_eval.py is at: pesto_eval.py (project root)
project_root = Path(__file__).parent.parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))
try:
    from pesto_eval import pesto_eval
except ImportError:
    # Fallback: try relative import from project root
    import importlib.util

    pesto_path = project_root / "pesto_eval.py"
    if pesto_path.exists():
        spec = importlib.util.spec_from_file_location("pesto_eval", pesto_path)
        pesto_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(pesto_module)
        pesto_eval = pesto_module.pesto_eval
    else:
        raise ImportError(f"Could not find pesto_eval.py at {pesto_path}")

from app.engine.base_engine import (
    BaseEngine,
    PIECE_VALUES,
    SearchResult,
    evaluate_terminal_position,
    is_time_exceeded,
)
from app.engine.transposition_table import TTEntry


class UltimateEngine(BaseEngine):
    """
    Ultimate engine: iterative deepening alpha-beta with PeSTO evaluation and
    tighter tactical control via advanced quiescence pruning.
    """

    name = "ultimate"

    def __init__(self):
        super().__init__(use_tt=True, tt_size_mb=16)
        # Quiescence safeguards
        self.qdepth_limit = 8
        self.qnode_limit = 20_000
        self.delta_margin = 90  # slack for delta pruning

    def _see(self, board: chess.Board, move: chess.Move) -> int:
        """
        Lightweight static exchange estimate. Positive means material gain for mover.
        """
        attacker = board.piece_type_at(move.from_square)
        if attacker is None:
            return 0
        captured_value = 0
        if board.is_capture(move):
            if board.is_en_passant(move):
                captured_value = PIECE_VALUES[chess.PAWN]
            else:
                captured = board.piece_type_at(move.to_square)
                captured_value = PIECE_VALUES.get(captured, 0) if captured else 0
        promo_gain = PIECE_VALUES.get(move.promotion, 0) - PIECE_VALUES[chess.PAWN] if move.promotion else 0
        attacker_value = PIECE_VALUES.get(attacker, 0)
        return captured_value + promo_gain - attacker_value

    def evaluate(self, board: chess.Board) -> int:
        """
        Use PeSTO evaluation + mobility + other factors.
        Returns side-to-move perspective (consistent with BaseEngine).
        """
        # Base PeSTO evaluation (already side-to-move perspective)
        score = pesto_eval(board)
        
        # Fix mobility: calculate both sides, use difference (avoids ply-to-ply oscillation)
        # Use copy to avoid mutating original board
        b = board.copy(stack=False)
        b.turn = chess.WHITE
        mob_w = b.legal_moves.count()  # More efficient than len(list(...))
        b.turn = chess.BLACK
        mob_b = b.legal_moves.count()
        
        # Mobility difference from side-to-move perspective
        mob_diff = (mob_w - mob_b) if board.turn == chess.WHITE else (mob_b - mob_w)
        score += 2 * mob_diff
        
        # Castling rights: reduced weight (not true king safety, just a small bias)
        castling_bonus = 0
        if board.has_castling_rights(chess.WHITE):
            castling_bonus += 5  # Reduced from 20 to 5
        if board.has_castling_rights(chess.BLACK):
            castling_bonus -= 5
        # Apply from side-to-move perspective
        score += castling_bonus if board.turn == chess.WHITE else -castling_bonus
        
        # Repetition penalty and drawish bias (already side-to-move aware)
        score -= self.repetition_penalty(board, current_eval=score)
        score += self.drawish_bias(board, score)
        
        return score

    # --- Quiescence helpers ---
    def _max_gain(self, board: chess.Board, move: chess.Move) -> int:
        """Upper bound of material gain for delta pruning."""
        gain = 0
        if board.is_capture(move):
            if board.is_en_passant(move):
                gain += PIECE_VALUES[chess.PAWN]
            else:
                captured = board.piece_type_at(move.to_square)
                gain += PIECE_VALUES.get(captured, 0) if captured else 0
        if move.promotion:
            gain += PIECE_VALUES.get(move.promotion, 0) - PIECE_VALUES[chess.PAWN]
        return gain

    def _is_losing_capture(self, board: chess.Board, move: chess.Move) -> bool:
        """Prune obviously losing captures via SEE."""
        if not board.is_capture(move):
            return False
        return self._see(board, move) < 0

    def _is_promotion_threat(self, board: chess.Board, move: chess.Move) -> bool:
        """
        Treat pawn pushes to the 7th (white) / 2nd (black) rank as forcing threats
        even when not immediate promotions.
        """
        piece = board.piece_type_at(move.from_square)
        if piece != chess.PAWN or move.promotion:
            return False
        to_rank = chess.square_rank(move.to_square)
        return (board.turn == chess.WHITE and to_rank == 6) or (board.turn == chess.BLACK and to_rank == 1)

    def _safe_check(self, board: chess.Board, move: chess.Move) -> bool:
        """Only include checks that are not outright losing."""
        if board.is_capture(move):
            return True
        board.push(move)
        attacked = board.is_attacked_by(board.turn, move.to_square)
        defended = board.is_attacked_by(not board.turn, move.to_square)
        board.pop()
        return not attacked or defended

    def _order_q_moves(self, board: chess.Board, moves) -> list[chess.Move]:
        """MVV-LVA + SEE + promotion bias to get fast cutoffs."""
        def score(move: chess.Move) -> int:
            s = 0
            if move.promotion:
                s += 2000 + PIECE_VALUES.get(move.promotion, 0)
            if board.is_capture(move):
                if board.is_en_passant(move):
                    captured_value = PIECE_VALUES[chess.PAWN]
                else:
                    captured = board.piece_type_at(move.to_square)
                    captured_value = PIECE_VALUES.get(captured, 0) if captured else 0
                attacker = board.piece_type_at(move.from_square)
                attacker_value = PIECE_VALUES.get(attacker, 0) if attacker else 0
                s += 10 * captured_value - attacker_value
                s += self._see(board, move)
            if board.gives_check(move):
                s += 300
            return s

        return sorted(moves, key=score, reverse=True)

    def _generate_q_moves(self, board: chess.Board, in_check: bool, qdepth: int) -> list[chess.Move]:
        """Generate tactical moves with guard rails against explosion."""
        if in_check:
            # Must consider all legal evasions; depth cap will stop runaway lines
            return list(board.legal_moves)

        moves: list[chess.Move] = []
        for move in board.legal_moves:
            if board.is_capture(move) or move.promotion:
                moves.append(move)
            elif board.gives_check(move) and qdepth < 4 and self._safe_check(board, move):
                moves.append(move)
            elif self._is_promotion_threat(board, move):
                moves.append(move)
        return moves

    def quiescence(self, board: chess.Board, alpha: int, beta: int, nodes: list[int], qnodes: list[int], qdepth: int = 0) -> int:
        # Handle terminal positions in search layer
        terminal_eval = evaluate_terminal_position(board)
        if terminal_eval is not None:
            nodes[0] += 1
            qnodes[0] += 1  # Count as quiescence node
            return terminal_eval

        stand_pat = self.evaluate(board)
        nodes[0] += 1
        qnodes[0] += 1  # Count as quiescence node
        if stand_pat >= beta:
            return beta
        if stand_pat > alpha:
            alpha = stand_pat

        # Hard caps to control explosion - use qnodes, not nodes
        if qdepth >= self.qdepth_limit or qnodes[0] >= self.qnode_limit:
            return alpha

        in_check = board.is_check()
        moves = self._generate_q_moves(board, in_check, qdepth)
        if not moves:
            return alpha

        for move in self._order_q_moves(board, moves):
            if not in_check:
                if board.is_capture(move) and self._is_losing_capture(board, move):
                    continue
                potential = self._max_gain(board, move)
                if stand_pat + potential + self.delta_margin <= alpha:
                    continue
                if board.gives_check(move) and not self._safe_check(board, move):
                    continue

            board.push(move)
            score = -self.quiescence(board, -beta, -alpha, nodes, qnodes, qdepth + 1)
            board.pop()

            if score >= beta:
                return beta
            if score > alpha:
                alpha = score
            if qnodes[0] >= self.qnode_limit:
                break
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
        qnodes: list[int],
    ) -> int:
        nodes[0] += 1  # count this AB node early (before TT/terminal checks)
        original_alpha = alpha

        # Handle terminal positions in search layer
        terminal_eval = evaluate_terminal_position(board)
        if terminal_eval is not None:
            return terminal_eval

        # Query transposition table
        hash_key = None
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
            score = self.quiescence(board, alpha, beta, nodes, qnodes, 0)
        else:
            moves = self.order_moves(board, board.legal_moves)
            best_score = -10_000_000
            for move in moves:
                if is_time_exceeded(start, time_limit):
                    break
                board.push(move)
                score = -self.alphabeta(board, depth - 1, -beta, -alpha, start, time_limit, nodes, qnodes)
                board.pop()
                if score > best_score:
                    best_score = score
                if score > alpha:
                    alpha = score
                if alpha >= beta:
                    break
            score = best_score

        # Store in transposition table
        if self.use_tt and self.hasher and self.tt and hash_key is not None:
            if score <= original_alpha:
                flag = TTEntry.UPPER_BOUND
            elif score >= beta:
                flag = TTEntry.LOWER_BOUND
            else:
                flag = TTEntry.EXACT
            self.tt.store(hash_key, score, depth, flag)

        return score

    def choose_move(self, board: chess.Board, time_limit: float | None = 1.2) -> SearchResult:
        # Clear cache at start of each move search
        self.clear_cache()

        best_move = None
        best_score = -10_000_000
        total_nodes = 0
        total_qnodes = 0  # Track quiescence nodes separately
        start = time.perf_counter()
        max_depth = 8
        searched_depth = 0

        # Move ordering should be updated per iteration (not outside loop)
        for depth in range(1, max_depth + 1):
            if is_time_exceeded(start, time_limit):
                break
            
            # Re-order moves for each depth (better move ordering as depth increases)
            ordered = self.order_moves(board, board.legal_moves)
            
            iteration_best_move = best_move
            iteration_best_score = -10_000_000
            for move in ordered:
                if is_time_exceeded(start, time_limit):
                    break
                board.push(move)
                nodes = [0]
                qnodes = [0]  # Track quiescence nodes
                score = -self.alphabeta(board, depth - 1, -1_000_000, 1_000_000, start, time_limit, nodes, qnodes)
                board.pop()
                total_nodes += nodes[0]
                total_qnodes += qnodes[0]  # Accumulate quiescence nodes
                if score > iteration_best_score:
                    iteration_best_score = score
                    iteration_best_move = move
            if iteration_best_move:
                best_move = iteration_best_move
                best_score = iteration_best_score
                searched_depth = depth
        
        time_used = time.perf_counter() - start
        nps = total_nodes / time_used if time_used > 0 else 0
        qnode_ratio = total_qnodes / total_nodes if total_nodes > 0 else 0
        
        # Debug info
        extra_info = {
            "depth": searched_depth,
            "nodes": total_nodes,
            "qnodes": total_qnodes,
            "time": time_used,
            "nps": nps,
            "qnode_ratio": qnode_ratio
        }
        
        return SearchResult(best_move, best_score, searched_depth, total_nodes, extra_info=extra_info)
