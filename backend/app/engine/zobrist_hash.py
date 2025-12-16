"""
Zobrist Hashing implementation for chess position caching.

Zobrist hashing is a technique to generate hash values for chess positions
by XORing random numbers associated with piece-square combinations.
This allows efficient position comparison and transposition table lookups.
"""

from __future__ import annotations

import random
from typing import Optional

import chess
from chess import Board, Square, PieceType, Color


class ZobristHasher:
    """
    Generates Zobrist hash values for chess positions.
    
    Each piece type on each square gets a unique random 64-bit number.
    Additional random numbers for castling rights, en passant, and side to move.
    """

    def __init__(self, seed: Optional[int] = None):
        """Initialize Zobrist hash tables with random numbers."""
        self.rng = random.Random(seed if seed is not None else 0xDEADBEEF)
        
        # Table: [piece_type][color][square] -> random 64-bit int
        # piece_type: 0-5 (PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING)
        # color: 0-1 (WHITE, BLACK)
        # square: 0-63
        self.piece_table: list[list[list[int]]] = [
            [
                [self.rng.getrandbits(64) for _ in range(64)]
                for _ in range(2)  # colors
            ]
            for _ in range(6)  # piece types
        ]
        
        # Castling rights: 4 combinations (white kingside, white queenside, black kingside, black queenside)
        self.castling_table = [self.rng.getrandbits(64) for _ in range(4)]
        
        # En passant: 8 files
        self.en_passant_table = [self.rng.getrandbits(64) for _ in range(8)]
        
        # Side to move (black to move)
        self.side_to_move = self.rng.getrandbits(64)

    def _piece_index(self, piece_type: PieceType) -> int:
        """Convert piece type to table index (0-5)."""
        return piece_type - 1  # PAWN=1 -> 0, KING=6 -> 5

    def hash_position(self, board: Board) -> int:
        """
        Compute Zobrist hash for the current board position.
        
        Returns:
            A 64-bit integer hash value.
        """
        h = 0
        
        # Hash pieces on squares
        for square in chess.SQUARES:
            piece = board.piece_at(square)
            if piece:
                piece_idx = self._piece_index(piece.piece_type)
                color_idx = 0 if piece.color == chess.WHITE else 1
                h ^= self.piece_table[piece_idx][color_idx][square]
        
        # Hash castling rights
        if board.has_kingside_castling_rights(chess.WHITE):
            h ^= self.castling_table[0]
        if board.has_queenside_castling_rights(chess.WHITE):
            h ^= self.castling_table[1]
        if board.has_kingside_castling_rights(chess.BLACK):
            h ^= self.castling_table[2]
        if board.has_queenside_castling_rights(chess.BLACK):
            h ^= self.castling_table[3]
        
        # Hash en passant square
        if board.ep_square is not None:
            file_idx = chess.square_file(board.ep_square)
            h ^= self.en_passant_table[file_idx]
        
        # Hash side to move
        if board.turn == chess.BLACK:
            h ^= self.side_to_move
        
        return h

    def update_hash(self, current_hash: int, move: chess.Move, board: Board) -> int:
        """
        Incrementally update hash after a move (more efficient than recalculating).
        
        Note: This requires knowing the move and the board state before the move.
        For simplicity, we'll use hash_position() in most cases, but this method
        can be optimized for performance-critical paths.
        
        Args:
            current_hash: Hash before the move
            move: The move being made
            board: Board state before the move (to check castling, en passant, etc.)
        
        Returns:
            Updated hash value
        """
        # For now, just recalculate - can be optimized later
        # This would require tracking previous board state
        return self.hash_position(board)


# Global instance (singleton pattern)
_global_hasher: Optional[ZobristHasher] = None


def get_hasher() -> ZobristHasher:
    """Get the global Zobrist hasher instance."""
    global _global_hasher
    if _global_hasher is None:
        _global_hasher = ZobristHasher()
    return _global_hasher

