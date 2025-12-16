from __future__ import annotations

import math
from pathlib import Path
from typing import Optional

import chess

try:
    import torch
    import torch.nn as nn
except Exception as exc:  # pragma: no cover - torch may be unavailable in light environments
    torch = None  # type: ignore
    nn = None  # type: ignore
    _IMPORT_ERROR = exc
else:
    _IMPORT_ERROR = None


PIECE_PLANES = {
    chess.PAWN: 0,
    chess.KNIGHT: 1,
    chess.BISHOP: 2,
    chess.ROOK: 3,
    chess.QUEEN: 4,
    chess.KING: 5,
}


def ensure_torch():
    if torch is None or nn is None:
        raise ImportError(f"PyTorch is required for CNN evaluation: {_IMPORT_ERROR}")
    return torch, nn


def board_to_tensor(board: chess.Board):
    """
    Encode board into a 14x8x8 tensor:
    - 6 planes for white pieces
    - 6 planes for black pieces
    - 1 plane for side to move
    - 1 plane for half-move clock / drawish pressure
    """
    torch, _ = ensure_torch()
    planes = torch.zeros((14, 8, 8), dtype=torch.float32)
    for piece_type, offset in PIECE_PLANES.items():
        for sq in board.pieces(piece_type, chess.WHITE):
            r, f = divmod(sq, 8)
            planes[offset, r, f] = 1.0
        for sq in board.pieces(piece_type, chess.BLACK):
            r, f = divmod(sq, 8)
            planes[offset + 6, r, f] = 1.0

    # Side to move plane
    planes[12, :, :] = 1.0 if board.turn == chess.WHITE else 0.0

    # Drawish pressure plane: scaled half-move clock (fifty-move proximity)
    planes[13, :, :] = min(board.halfmove_clock / 100.0, 1.0)
    return planes


class TinyChessCNN(nn.Module):  # type: ignore[misc]
    def __init__(self, channels: int = 32):
        torch, nn_mod = ensure_torch()
        super().__init__()
        self.backbone = nn_mod.Sequential(
            nn_mod.Conv2d(14, channels, kernel_size=3, padding=1),
            nn_mod.ReLU(inplace=True),
            nn_mod.Conv2d(channels, channels, kernel_size=3, padding=1),
            nn_mod.ReLU(inplace=True),
        )
        self.value_head = nn_mod.Sequential(
            nn_mod.Flatten(),
            nn_mod.Linear(channels * 8 * 8, 128),
            nn_mod.ReLU(inplace=True),
            nn_mod.Linear(128, 1),
            nn_mod.Tanh(),
        )

    def forward(self, x):  # type: ignore[override]
        h = self.backbone(x)
        v = self.value_head(h)
        return v


def load_value_network(path: Optional[str | Path], device: Optional[str] = None) -> TinyChessCNN:
    torch, _ = ensure_torch()
    model = TinyChessCNN()
    device = device or ("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)
    if path:
        p = Path(path)
        if p.exists():
            state = torch.load(p, map_location=device)
            model.load_state_dict(state)
    model.eval()
    return model


def evaluate_with_cnn(model: TinyChessCNN, board: chess.Board, device: Optional[str] = None) -> float:
    torch, _ = ensure_torch()
    device = device or next(model.parameters()).device
    with torch.no_grad():
        tensor = board_to_tensor(board).unsqueeze(0).to(device)
        value = model(tensor).squeeze().item()
        return float(max(-1.0, min(1.0, value)))


def save_value_network(model: TinyChessCNN, path: str | Path):
    torch, _ = ensure_torch()
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), p)
