"""
示例：如何在引擎中集成 Transposition Table

这个文件展示了如何修改 Level3Engine 来使用 Zobrist Hash 缓存。
实际实现时，应该直接修改对应的引擎文件。
"""

from __future__ import annotations

import time
import chess

from app.engine.base_engine import BaseEngine, SearchResult, is_time_exceeded
from app.engine.transposition_table import TTEntry


class Level3EngineWithTT(BaseEngine):
    """
    Level3Engine 的缓存版本示例。
    
    关键修改点：
    1. __init__ 中启用缓存
    2. alphabeta 方法中查询和存储缓存
    3. choose_move 开始时清理缓存
    """

    name = "level3+tt"

    def __init__(self):
        # 启用transposition table，使用16MB缓存
        super().__init__(use_tt=True, tt_size_mb=16)

    def quiescence(self, board: chess.Board, alpha: int, beta: int, nodes: list[int]) -> int:
        """Quiescence搜索通常不需要缓存（深度浅，变化快）"""
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

    def alphabeta(
        self, 
        board: chess.Board, 
        depth: int, 
        alpha: int, 
        beta: int, 
        start: float, 
        time_limit: float | None, 
        nodes: list[int]
    ) -> int:
        """Alpha-beta搜索，集成transposition table"""
        
        # 1. 查询缓存
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
                
                # 如果窗口被完全限制，可以立即返回
                if alpha >= beta:
                    return score
        
        # 2. 正常搜索
        if depth == 0 or board.is_game_over():
            return self.quiescence(board, alpha, beta, nodes)
        
        moves = self.order_moves(board, board.legal_moves)
        original_alpha = alpha
        best_score = -10_000_000
        best_move = None
        
        for move in moves:
            if is_time_exceeded(start, time_limit):
                break
            board.push(move)
            score = -self.alphabeta(board, depth - 1, -beta, -alpha, start, time_limit, nodes)
            board.pop()
            
            if score > best_score:
                best_score = score
                best_move = move
            
            if score > alpha:
                alpha = score
            if alpha >= beta:
                break
        
        nodes[0] += 1
        
        # 3. 存储结果到缓存
        if self.use_tt and self.hasher and self.tt:
            # 确定flag类型
            if best_score <= original_alpha:
                flag = TTEntry.UPPER_BOUND
            elif best_score >= beta:
                flag = TTEntry.LOWER_BOUND
            else:
                flag = TTEntry.EXACT
            
            # 存储最佳走子（可选，用于move ordering优化）
            move_hash = best_move if best_move else None
            self.tt.store(hash_key, best_score, depth, flag, move_hash)
        
        return best_score

    def choose_move(self, board: chess.Board, time_limit: float | None = 0.6) -> SearchResult:
        # 每局游戏开始时清理缓存（避免跨游戏污染）
        self.clear_cache()
        
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
        
        # 可选：打印缓存统计信息（用于调试）
        if self.use_tt and self.tt:
            stats = self.tt.get_stats()
            print(f"TT Stats: {stats}")
        
        return SearchResult(best_move, best_score, searched_depth, total_nodes)


# 使用说明：
# 1. 将上述代码集成到实际的 Level3Engine 类中
# 2. 在 __init__ 中调用 super().__init__(use_tt=True)
# 3. 在 choose_move 开始时调用 self.clear_cache()
# 4. 在 alphabeta 中添加缓存查询和存储逻辑
# 
# 对于 MCTS 引擎，缓存逻辑略有不同：
# - 在 _evaluate_leaf 中查询缓存
# - 在评估后存储结果
# - 不需要在每次模拟时清理缓存（只在游戏开始时清理）

