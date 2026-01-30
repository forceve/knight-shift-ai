from __future__ import annotations

import argparse
import os
import random
from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Tuple

import chess

from app.engine.mcts_cnn_engine import MCTSCNNEvalEngine
from app.engine.mcts_engine import MCTSEngine
from app.engine.nn_eval import TinyChessCNN, board_to_tensor, ensure_torch, save_value_network, load_value_network
from app.models.schemas import AILevel, PlayerColor
from app.utils import evaluate_status


@dataclass
class Sample:
    tensor: "torch.Tensor"  # type: ignore[name-defined]
    value: float


def _outcome_to_value(winner: PlayerColor | None, turn: chess.Color) -> float:
    if winner is None:
        return 0.0
    if (winner == PlayerColor.WHITE and turn == chess.WHITE) or (winner == PlayerColor.BLACK and turn == chess.BLACK):
        return 1.0
    return -1.0


def _generate_single_game(args_tuple):
    """
    在子进程中生成单局游戏的函数。
    这个函数必须是模块级别的，以便可以被pickle序列化。
    
    Args:
        args_tuple: (game_idx, engine_type, engine_params, max_moves, time_limit)
            - game_idx: 游戏索引
            - engine_type: "MCTSEngine" 或 "MCTSCNNEvalEngine"
            - engine_params: 引擎参数字典
            - max_moves: 最大步数
            - time_limit: 每步时间限制
    
    Returns:
        (game_idx, samples_list, move_count, winner_str)
        samples_list: List[Tuple[tensor, value]] - 需要转换为Sample对象
    """
    (game_idx, engine_type, engine_params, max_moves, time_limit) = args_tuple
    
    # 在子进程中重新导入，避免序列化问题
    import chess
    from app.engine.mcts_engine import MCTSEngine
    from app.engine.mcts_cnn_engine import MCTSCNNEvalEngine
    from app.engine.nn_eval import board_to_tensor, ensure_torch, load_value_network
    from app.utils import evaluate_status
    
    torch, _ = ensure_torch()
    
    # 在子进程中创建引擎实例
    if engine_type == "MCTSEngine":
        engine = MCTSEngine(
            simulations=engine_params.get("simulations", 200),
            c_puct=engine_params.get("c_puct", 1.3),
            rollout_depth=engine_params.get("rollout_depth", 10),
        )
    elif engine_type == "MCTSCNNEvalEngine":
        value_path = engine_params.get("value_path")
        engine = MCTSCNNEvalEngine(
            value_path=value_path,
            simulations=engine_params.get("simulations", 500),
            c_puct=engine_params.get("c_puct", 1.3),
            rollout_depth=engine_params.get("rollout_depth", 10),
            device=engine_params.get("device"),
        )
    else:
        raise ValueError(f"Unknown engine type: {engine_type}")
    
    # 生成单局游戏
    board = chess.Board()
    trajectory = []
    move_count = 0
    
    while not board.is_game_over() and len(trajectory) < max_moves:
        tensor = board_to_tensor(board)
        trajectory.append((tensor, board.turn))
        result = engine.choose_move(board, time_limit=time_limit)
        if result.move is None:
            break
        board.push(result.move)
        move_count += 1
    
    status, winner, _, _ = evaluate_status(board)
    
    # 转换为样本（返回tensor和value的元组，因为Sample对象不能直接序列化）
    # 注意：winner是字符串类型（"white"或"black"）或None
    samples = []
    winner_str = str(winner).lower() if winner is not None else None
    
    for tensor, turn in trajectory:
        if winner is None:
            value = 0.0
        elif winner_str == "white" and turn == chess.WHITE:
            value = 1.0
        elif winner_str == "black" and turn == chess.BLACK:
            value = 1.0
        else:
            value = -1.0
        samples.append((tensor, value))
    
    winner_display = winner_str if winner_str else "draw"
    return game_idx, samples, move_count, winner_display


def generate_selfplay_samples(engine, games: int, max_moves: int = 120, time_limit: float | None = 0.7, workers: int | None = None) -> List[Sample]:
    """
    生成自对弈样本，支持进程池并行。
    
    Args:
        engine: 引擎实例
        games: 游戏数量
        max_moves: 最大步数
        time_limit: 每步时间限制
        workers: 进程池大小，None则自动计算，1则使用单进程模式
    """
    torch, _ = ensure_torch()
    
    engine_type = type(engine).__name__
    
    # 确定是否使用并行
    use_parallel = workers is not None and workers > 1
    if workers is None:
        # 自动计算：对于大量游戏使用并行，小量游戏使用单进程
        use_parallel = games > 100
        if use_parallel:
            workers = min(os.cpu_count() or 4, games, 8)  # 最多8个进程
        else:
            workers = 1
    
    if not use_parallel:
        # 单进程模式（原有逻辑）
        samples: List[Sample] = []
        print(f"Starting to generate {games} games (single process)...", flush=True)
        print(f"Engine type: {engine_type}, time_limit={time_limit}, max_moves={max_moves}", flush=True)
        for game_idx in range(games):
            if game_idx == 0:
                print(f"Starting first game...", flush=True)
            board = chess.Board()
            trajectory: List[Tuple["torch.Tensor", chess.Color]] = []
            move_count = 0
            while not board.is_game_over() and len(trajectory) < max_moves:
                tensor = board_to_tensor(board)
                trajectory.append((tensor, board.turn))
                result = engine.choose_move(board, time_limit=time_limit)
                if result.move is None:
                    break
                board.push(result.move)
                move_count += 1
            status, winner, _, _ = evaluate_status(board)
            for tensor, turn in trajectory:
                value = _outcome_to_value(winner, turn)
                samples.append(Sample(tensor=tensor, value=value))
            # Print progress
            progress_interval = max(1, min(10, games // 100)) if games > 100 else 1
            if (game_idx + 1) % progress_interval == 0 or (game_idx + 1) == games:
                print(f"Progress: {game_idx + 1}/{games} games completed (last game: {move_count} moves)", flush=True)
            if game_idx == 0:
                print(f"First game completed: {move_count} moves, {len(trajectory)} positions, winner={winner}", flush=True)
        print(f"Finished generating {games} games, total samples: {len(samples)}", flush=True)
        return samples
    
    # 并行模式
    print(f"Starting to generate {games} games using {workers} parallel workers...", flush=True)
    print(f"Engine type: {engine_type}, time_limit={time_limit}, max_moves={max_moves}", flush=True)
    
    # 准备引擎参数（需要可序列化）
    if engine_type == "MCTSEngine":
        engine_params = {
            "simulations": engine.simulations,
            "c_puct": engine.c_puct,
            "rollout_depth": engine.rollout_depth,
        }
    elif engine_type == "MCTSCNNEvalEngine":
        # 获取模型路径 - 优先使用保存的路径，否则尝试从引擎获取
        value_path = getattr(engine, '_checkpoint_path', None)
        if value_path is None:
            # 尝试从引擎的初始化参数推断
            # MCTSCNNEvalEngine在__init__中会设置checkpoint路径
            # 如果无法获取，需要从外部传入（通过args.load）
            pass
        engine_params = {
            "value_path": value_path,
            "simulations": engine.simulations,
            "c_puct": engine.c_puct,
            "rollout_depth": engine.rollout_depth,
            "device": getattr(engine, 'device', None),
        }
    else:
        raise ValueError(f"Unsupported engine type for multiprocessing: {engine_type}")
    
    # 准备任务参数
    tasks = [
        (i, engine_type, engine_params, max_moves, time_limit)
        for i in range(games)
    ]
    
    all_samples: List[Sample] = []
    completed_games = 0
    results_by_idx: dict[int, tuple] = {}  # 用于按顺序收集结果
    
    # 使用进程池并行执行
    with ProcessPoolExecutor(max_workers=workers) as executor:
        # 提交所有任务
        futures = {executor.submit(_generate_single_game, task): task[0] for task in tasks}
        
        # 收集结果
        for future in as_completed(futures):
            try:
                game_idx, samples_tuples, move_count, winner_str = future.result()
                results_by_idx[game_idx] = (samples_tuples, move_count, winner_str)
                completed_games += 1
                
                # 打印进度
                progress_interval = max(1, min(10, games // 100)) if games > 100 else 1
                if completed_games % progress_interval == 0 or completed_games == games:
                    print(f"Progress: {completed_games}/{games} games completed", flush=True)
                
                if completed_games == 1:
                    print(f"First game completed: {move_count} moves, {len(samples_tuples)} positions, winner={winner_str}", flush=True)
                    
            except Exception as e:
                game_idx = futures[future]
                print(f"Error generating game {game_idx}: {e}", flush=True)
        
        # 按顺序收集所有样本（保持游戏顺序）
        for game_idx in range(games):
            if game_idx in results_by_idx:
                samples_tuples, move_count, winner_str = results_by_idx[game_idx]
                for tensor, value in samples_tuples:
                    all_samples.append(Sample(tensor=tensor, value=value))
    
    print(f"Finished generating {games} games, total samples: {len(all_samples)}", flush=True)
    return all_samples


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
    parser.add_argument("--load", type=str, default=None, help="Path to existing checkpoint to load and continue training.")
    parser.add_argument("--use-cnn", action="store_true", help="Use CNN model for self-play generation (requires --load).")
    parser.add_argument("--simulations", type=int, default=200, help="MCTS simulations per move (when using CNN).")
    parser.add_argument("--workers", type=int, default=None, help="Number of parallel workers for self-play generation (optional).")
    args = parser.parse_args()

    _, _ = ensure_torch()
    
    # Load or create model
    if args.load:
        model = load_value_network(args.load)
        print(f"Loaded model from {args.load}", flush=True)
    else:
        model = TinyChessCNN()
        print("Starting with fresh model", flush=True)

    # Choose generator engine
    if args.use_cnn:
        if not args.load:
            print("Warning: --use-cnn requires --load. Falling back to heuristic MCTS.")
            generator = MCTSEngine(simulations=args.simulations, rollout_depth=10)
        else:
            # Use CNN model for self-play
            generator = MCTSCNNEvalEngine(value_path=args.load, simulations=args.simulations, rollout_depth=10)
            print(f"Using CNN model for self-play generation (simulations={args.simulations})", flush=True)
            # 保存checkpoint路径以便在子进程中使用（用于并行训练）
            generator._checkpoint_path = args.load
    else:
        # Use heuristic-only MCTS to bootstrap data
        generator = MCTSEngine(simulations=args.simulations, rollout_depth=10)
        print(f"Using heuristic MCTS for self-play generation (simulations={args.simulations})", flush=True)

    print(f"Generating {args.games} self-play games...", flush=True)
    print(f"Configuration: simulations={args.simulations}, time_limit={args.time_limit}, max_moves={args.max_moves}, workers={args.workers}", flush=True)
    samples = generate_selfplay_samples(
        generator,
        games=args.games,
        max_moves=args.max_moves,
        time_limit=args.time_limit,
        workers=args.workers,
    )
    print(f"Generated {len(samples)} training samples", flush=True)

    print(f"Training for {args.epochs} epochs...", flush=True)
    train_value_network(model, samples, epochs=args.epochs, batch_size=args.batch_size, lr=args.lr)
    save_value_network(model, args.out)
    print(f"Saved value network to {args.out}", flush=True)


if __name__ == "__main__":
    main()
