from __future__ import annotations

import argparse
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Tuple

import chess

from app.engine.mcts_cnn_engine import MCTSCNNEvalEngine
from app.engine.mcts_engine import MCTSEngine
from app.engine.nn_eval import TinyChessCNN, board_to_tensor, ensure_torch, save_value_network
from app.models.schemas import AILevel, PlayerColor
from app.utils import evaluate_status


@dataclass
class Sample:
    tensor: "torch.Tensor"
    value: float


def _outcome_to_value(winner: PlayerColor | None, turn: chess.Color) -> float:
    if winner is None:
        return 0.0
    if (winner == PlayerColor.WHITE and turn == chess.WHITE) or (winner == PlayerColor.BLACK and turn == chess.BLACK):
        return 1.0
    return -1.0


def generate_selfplay_samples(engine, games: int, max_moves: int = 120, time_limit: float | None = 0.7) -> List[Sample]:
    torch, _ = ensure_torch()
    samples: List[Sample] = []
    for _ in range(games):
        board = chess.Board()
        trajectory: List[Tuple["torch.Tensor", chess.Color]] = []
        while not board.is_game_over() and len(trajectory) < max_moves:
            tensor = board_to_tensor(board)
            trajectory.append((tensor, board.turn))
            result = engine.choose_move(board, time_limit=time_limit)
            if result.move is None:
                break
            board.push(result.move)
        status, winner, _, _ = evaluate_status(board)
        for tensor, turn in trajectory:
            value = _outcome_to_value(winner, turn)
            samples.append(Sample(tensor=tensor, value=value))
    return samples


def train_value_network(model: TinyChessCNN, samples: Iterable[Sample], epochs: int = 4, batch_size: int = 32, lr: float = 1e-3, device: str | None = None):
    torch, nn = ensure_torch()
    tensors = torch.stack([s.tensor for s in samples])
    targets = torch.tensor([s.value for s in samples], dtype=torch.float32).unsqueeze(1)
    device = device or ("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)
    dataset = torch.utils.data.TensorDataset(tensors.to(device), targets.to(device))
    loader = torch.utils.data.DataLoader(dataset, batch_size=batch_size, shuffle=True)
    optim = torch.optim.Adam(model.parameters(), lr=lr)
    loss_fn = nn.MSELoss()

    for _ in range(epochs):
        for xb, yb in loader:
            optim.zero_grad()
            preds = model(xb)
            loss = loss_fn(preds, yb)
            loss.backward()
            optim.step()

    model.eval()
    return model


def main():
    parser = argparse.ArgumentParser(description="Self-play generator + CNN value fine-tuning for the MCTS+CNN engine.")
    parser.add_argument("--games", type=int, default=12, help="Number of self-play games to generate.")
    parser.add_argument("--max-moves", type=int, default=120)
    parser.add_argument("--time-limit", type=float, default=0.7, help="Per-move limit during data generation.")
    parser.add_argument("--epochs", type=int, default=6)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--out", type=str, default=str(Path(__file__).resolve().parent.parent / "engine" / "checkpoints" / "mcts_value.pt"))
    args = parser.parse_args()

    # Use the heuristic-only MCTS to bootstrap data to avoid cold-start.
    generator = MCTSEngine(simulations=200, rollout_depth=10)
    samples = generate_selfplay_samples(generator, games=args.games, max_moves=args.max_moves, time_limit=args.time_limit)

    _, _ = ensure_torch()
    model = TinyChessCNN()
    train_value_network(model, samples, epochs=args.epochs, batch_size=args.batch_size, lr=args.lr)
    save_value_network(model, args.out)
    print(f"Saved value network to {args.out}")


if __name__ == "__main__":
    main()
