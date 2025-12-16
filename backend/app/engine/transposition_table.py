"""
Transposition Table for caching chess position evaluations.

Stores previously computed evaluation results keyed by Zobrist hashes,
allowing engines to reuse evaluations when the same position is reached
via different move sequences.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Dict
import struct

from app.engine.zobrist_hash import get_hasher


@dataclass
class TTEntry:
    """
    Entry in the transposition table.
    
    Attributes:
        hash_key: Zobrist hash of the position (for verification)
        score: Evaluation score
        depth: Search depth at which this evaluation was computed
        flag: Type of score (EXACT, LOWER_BOUND, UPPER_BOUND)
        best_move: Best move found at this position (optional)
    """
    hash_key: int
    score: int
    depth: int
    flag: int  # 0=EXACT, 1=LOWER_BOUND, 2=UPPER_BOUND
    best_move: Optional[int] = None  # Store as UCI string hash or move index
    
    # Constants for flags
    EXACT = 0
    LOWER_BOUND = 1
    UPPER_BOUND = 2


class TranspositionTable:
    """
    Hash table for storing position evaluations.
    
    Uses replacement strategy: replace if new entry has greater or equal depth.
    This ensures we keep the most valuable (deepest) evaluations.
    """

    def __init__(self, size_mb: int = 16):
        """
        Initialize transposition table.
        
        Args:
            size_mb: Size of table in megabytes (default 16MB)
        """
        # Calculate number of entries (each entry ~24 bytes)
        entry_size = 24  # hash(8) + score(4) + depth(1) + flag(1) + move(4) + padding
        num_entries = (size_mb * 1024 * 1024) // entry_size
        # Round down to power of 2 for efficient modulo
        self.size = 1
        while self.size * 2 <= num_entries:
            self.size *= 2
        self.size = max(1024, self.size)  # Minimum 1024 entries
        
        self.table: Dict[int, TTEntry] = {}
        self.hits = 0
        self.misses = 0
        self.overwrites = 0

    def _index(self, hash_key: int) -> int:
        """Get table index from hash key."""
        return hash_key & (self.size - 1)

    def store(self, hash_key: int, score: int, depth: int, flag: int, best_move: Optional[int] = None) -> None:
        """
        Store an entry in the transposition table.
        
        Args:
            hash_key: Zobrist hash of the position
            score: Evaluation score
            depth: Search depth
            flag: Type of score (EXACT, LOWER_BOUND, UPPER_BOUND)
            best_move: Best move found (optional)
        """
        idx = self._index(hash_key)
        
        # Replacement strategy: replace if slot is empty, or if new entry has >= depth
        if idx not in self.table:
            self.table[idx] = TTEntry(hash_key, score, depth, flag, best_move)
        else:
            existing = self.table[idx]
            # Replace if same position (hash match) or if new entry is deeper
            if existing.hash_key == hash_key or depth >= existing.depth:
                if existing.hash_key != hash_key:
                    self.overwrites += 1
                self.table[idx] = TTEntry(hash_key, score, depth, flag, best_move)
            # Otherwise keep existing entry (it's from a deeper search)

    def probe(self, hash_key: int, depth: int, alpha: int, beta: int) -> Optional[tuple[int, int]]:
        """
        Probe the transposition table for a cached evaluation.
        
        Args:
            hash_key: Zobrist hash of the position
            depth: Current search depth
            alpha: Alpha bound (for alpha-beta)
            beta: Beta bound (for alpha-beta)
        
        Returns:
            Tuple of (score, flag) if found and usable, None otherwise.
            Flag indicates if score is exact, lower bound, or upper bound.
        """
        idx = self._index(hash_key)
        
        if idx not in self.table:
            self.misses += 1
            return None
        
        entry = self.table[idx]
        
        # Verify hash match (handle collisions)
        if entry.hash_key != hash_key:
            self.misses += 1
            return None
        
        # Only use entry if it's from a search at least as deep
        if entry.depth < depth:
            self.misses += 1
            return None
        
        self.hits += 1
        
        # Use entry based on flag
        if entry.flag == TTEntry.EXACT:
            return (entry.score, TTEntry.EXACT)
        elif entry.flag == TTEntry.LOWER_BOUND and entry.score >= beta:
            return (entry.score, TTEntry.LOWER_BOUND)
        elif entry.flag == TTEntry.UPPER_BOUND and entry.score <= alpha:
            return (entry.score, TTEntry.UPPER_BOUND)
        
        # Entry exists but not usable for current alpha-beta window
        return None

    def clear(self) -> None:
        """Clear all entries from the table."""
        self.table.clear()
        self.hits = 0
        self.misses = 0
        self.overwrites = 0

    def get_stats(self) -> dict:
        """Get statistics about table usage."""
        total = self.hits + self.misses
        hit_rate = (self.hits / total * 100) if total > 0 else 0.0
        return {
            "size": self.size,
            "entries": len(self.table),
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate": f"{hit_rate:.2f}%",
            "overwrites": self.overwrites,
        }

