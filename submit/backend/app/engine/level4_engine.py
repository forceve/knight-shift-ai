from __future__ import annotations

import time
import chess

from app.engine.base_engine import (
    BaseEngine,
    PIECE_VALUES,
    PST_KING_ENDGAME,
    PST_KING_OPENING,
    SearchResult,
    is_time_exceeded,
    evaluate_terminal_position,
)
from app.engine.transposition_table import TTEntry


class Level4Engine(BaseEngine):
    """
    Level 4: Enhanced evaluation to simulate human-like decision making.
    - Phase-adaptive evaluation
    - Center control and open file bonuses
    - Improved pawn structure for endgame promotion potential
    Uses transposition table caching for improved performance.
    """

    name = "level4"

    def __init__(self):
        super().__init__(use_tt=True, tt_size_mb=16)

    def _get_game_phase(self, board: chess.Board) -> str:
        total_pieces = sum(len(board.pieces(pt, c)) for pt in chess.PIECE_TYPES for c in (chess.WHITE, chess.BLACK))
        if total_pieces > 24:
            return "opening"
        elif total_pieces > 12:
            return "middlegame"
        else:
            return "endgame"

    def evaluate(self, board: chess.Board) -> int:
        phase = self._get_game_phase(board)
        score = 0
        material = 0

        # Material and PSTs
        for piece_type, value in PIECE_VALUES.items():
            w = board.pieces(piece_type, chess.WHITE)
            b = board.pieces(piece_type, chess.BLACK)
            material += (len(w) - len(b)) * value
            score += len(w) * value
            score -= len(b) * value
            pst = self._pst_for_piece(piece_type, self._is_endgame(board))
            if pst:
                for sq in w:
                    score += pst[sq]
                for sq in b:
                    score -= pst[chess.square_mirror(sq)]

        # Phase-adaptive weights
        material_weight = 0.8 if phase == "opening" else 1.0 if phase == "middlegame" else 0.6
        pawn_weight = 0.5 if phase == "opening" else 1.0 if phase == "middlegame" else 1.5
        mobility_weight = 1.0 if phase == "middlegame" else 0.5
        center_weight = 1.2 if phase == "opening" else 1.0
        open_file_weight = 0.8 if phase == "middlegame" else 1.0

        # Apply weights
        score += material * (material_weight - 1)  # Adjust from base
        score += self._pawn_structure(board) * pawn_weight
        score += self._king_safety(board)

        # Mobility (adjusted)
        mobility = len(list(board.legal_moves))
        score += mobility_weight * mobility if board.turn == chess.WHITE else -mobility_weight * mobility

        # Center control
        center_squares = [chess.D4, chess.E4, chess.D5, chess.E5]
        center_score = sum(10 if board.piece_at(sq) and board.color_at(sq) == board.turn else 0 for sq in center_squares)
        score += center_weight * center_score if board.turn == chess.WHITE else -center_weight * center_score

        # Open file bonus (for rooks)
        open_file_score = 0
        for file in range(8):
            if all(not board.piece_at(chess.square(file, rank)) for rank in range(8)):
                rooks_white = len([sq for sq in board.pieces(chess.ROOK, chess.WHITE) if chess.square_file(sq) == file])
                rooks_black = len([sq for sq in board.pieces(chess.ROOK, chess.BLACK) if chess.square_file(sq) == file])
                open_file_score += (rooks_white - rooks_black) * 20
        score += open_file_score * open_file_weight

        return score if board.turn == chess.WHITE else -score

    def _is_endgame(self, board: chess.Board) -> bool:
        total_queens = len(board.pieces(chess.QUEEN, chess.WHITE)) + len(
            board.pieces(chess.QUEEN, chess.BLACK)
        )
        minor_major = sum(
            len(board.pieces(pt, color))
            for pt in (chess.ROOK, chess.BISHOP, chess.KNIGHT, chess.QUEEN)
            for color in (chess.WHITE, chess.BLACK)
        )
        return total_queens == 0 or minor_major <= 4

    def _pst_for_piece(self, piece_type: chess.PieceType, endgame: bool):
        if piece_type == chess.KING:
            return PST_KING_ENDGAME if endgame else PST_KING_OPENING
        return None

    def _pawn_structure(self, board: chess.Board) -> int:
        phase = self._get_game_phase(board)
        endgame = phase == "endgame"
        score = 0
        for color in (chess.WHITE, chess.BLACK):
            direction = 1 if color == chess.WHITE else -1
            pawns = board.pieces(chess.PAWN, color)
            files = [0] * 8
            for sq in pawns:
                files[chess.square_file(sq)] += 1
                rank = chess.square_rank(sq)
                # Passed pawn bonus with promotion potential
                if self._is_passed_pawn(board, sq, color):
                    dist = (7 - rank) if color == chess.WHITE else rank
                    base = 50 + (7 - dist) * 15  # Closer to promotion, higher bonus
                    if endgame:
                        base = int(base * 1.8)  # Boost in endgame
                    if (color == chess.WHITE and rank == 6) or (color == chess.BLACK and rank == 1):  # Sprint rank
                        base += 80  # Extra sprint bonus
                    score += base if color == chess.WHITE else -base
                # Advanced pawn bonus
                adv = rank if color == chess.WHITE else (7 - rank)
                adv_bonus = 5 * adv
                if endgame:
                    adv_bonus = int(adv_bonus * 1.5)
                score += adv_bonus if color == chess.WHITE else -adv_bonus
            # Doubled/isolation
            for file_idx, count in enumerate(files):
                if count > 1:
                    penalty = 15 * (count - 1)
                    score += -penalty if color == chess.WHITE else penalty
                left = files[file_idx - 1] if file_idx > 0 else 0
                right = files[file_idx + 1] if file_idx < 7 else 0
                if count == 1 and left == 0 and right == 0:
                    score += -20 if color == chess.WHITE else 20
        return score

    def _is_passed_pawn(self, board: chess.Board, sq: chess.Square, color: chess.Color) -> bool:
        file_idx = chess.square_file(sq)
        rank = chess.square_rank(sq)
        for f in range(max(0, file_idx - 1), min(7, file_idx + 1) + 1):
            for r in range(rank + 1, 8) if color == chess.WHITE else range(rank - 1, -1, -1):
                target = chess.square(f, r)
                if board.piece_at(target) and board.color_at(target) != color and board.piece_type_at(target) == chess.PAWN:
                    return False
        return True

    def _king_safety(self, board: chess.Board) -> int:
        score = 0
        for color in (chess.WHITE, chess.BLACK):
            king_sq = board.king(color)
            if king_sq is None:
                continue
            rank = chess.square_rank(king_sq)
            if (color == chess.WHITE and rank == 0) or (color == chess.BLACK and rank == 7):
                score += 30 if color == chess.WHITE else -30
            file_idx = chess.square_file(king_sq)
            for f in [file_idx - 1, file_idx, file_idx + 1]:
                if 0 <= f <= 7:
                    ranks = range(0, 2) if color == chess.WHITE else range(6, 8)
                    if not any(board.piece_at(chess.square(f, r)) for r in ranks):
                        score += -15 if color == chess.WHITE else 15
        return score

    def order_moves(self, board: chess.Board, moves):
        def score(move: chess.Move) -> int:
            s = 0
            if board.is_capture(move):
                captured = board.piece_type_at(move.to_square)
                mover = board.piece_type_at(move.from_square)
                if captured and mover:
                    s += 10 * PIECE_VALUES[captured] - PIECE_VALUES[mover]
            if board.gives_check(move):
                s += 300
            if move.promotion:
                s += 200
            return s
        return sorted(moves, key=score, reverse=True)

    def quiescence(self, board: chess.Board, alpha: int, beta: int, nodes: list[int]) -> int:
        # Handle terminal positions in search layer
        terminal_eval = evaluate_terminal_position(board)
        if terminal_eval is not None:
            nodes[0] += 1
            return terminal_eval
        
        # Quiescence通常不需要缓存（深度浅，变化快）
        stand_pat = self.evaluate(board)
        nodes[0] += 1
        if stand_pat >= beta:
            return beta
        if alpha < stand_pat:
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

    def alphabeta(self, board: chess.Board, depth: int, alpha: int, beta: int, start: float, time_limit: float | None, nodes: list[int]) -> int:
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

    def choose_move(self, board: chess.Board, time_limit: float | None = 1.5) -> SearchResult:
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
