from __future__ import annotations

import base64
import datetime as dt
import io
import json
import os
import threading
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional

import matplotlib.pyplot as plt
from concurrent.futures import ProcessPoolExecutor, as_completed

import chess

from app.engine.registry import get_engine
from app.history_store import HistoryStore
from app.models.schemas import AILevel, BatchTestSummary, MatchDetail, MatchSummary, PagedMatches, PagedTests, PlayerColor
from app.utils import evaluate_status, to_player_color, winner_from_board


@dataclass
class M2MMatch:
    match_id: str
    white_engine: AILevel
    black_engine: AILevel
    status: str
    winner: Optional[PlayerColor]
    result_reason: Optional[str]
    move_history: List[str]
    final_fen: str
    created_at: str
    time_limit_white: Optional[float] = None
    time_limit_black: Optional[float] = None

    def to_summary(self) -> MatchSummary:
        return MatchSummary(
            match_id=self.match_id,
            status=self.status,
            winner=self.winner,
            result_reason=self.result_reason,
            white_engine=self.white_engine,
            black_engine=self.black_engine,
            moves=len(self.move_history),
            created_at=self.created_at,
            time_limit_white=self.time_limit_white,
            time_limit_black=self.time_limit_black,
        )

    def to_detail(self) -> MatchDetail:
        return MatchDetail(
            **self.to_summary().model_dump(),
            move_history=self.move_history,
            final_fen=self.final_fen,
        )


@dataclass
class TestPackage:
    test_id: str
    kind: str  # "batch" or "time_scaled"
    white_engine: AILevel
    black_engine: AILevel
    games: int
    swap_colors: bool
    max_moves: int
    status: str = "running"
    matches: List[str] = field(default_factory=list)
    results: Dict[str, int] = field(default_factory=lambda: {"white": 0, "black": 0, "draw": 0})
    completed: int = 0
    created_at: str = field(default_factory=lambda: dt.datetime.utcnow().isoformat())
    time_limit_white: Optional[float] = None
    time_limit_black: Optional[float] = None
    time_limits: Optional[List[float]] = None
    games_per_limit: Optional[int] = None
    rows: Optional[List[dict]] = None
    image_base64: Optional[str] = None
    start_fen: Optional[str] = None

    def total_games(self) -> int:
        if self.kind == "time_scaled" and self.time_limits and self.games_per_limit:
            return len(self.time_limits) * self.games_per_limit
        return self.games

    def to_summary(self) -> BatchTestSummary:
        return BatchTestSummary(
            test_id=self.test_id,
            kind=self.kind,
            status=self.status,
            white_engine=self.white_engine,
            black_engine=self.black_engine,
            games=self.games,
            total_games=self.total_games(),
            completed=self.completed if self.completed else len(self.matches),
            results=dict(self.results),
            matches=list(self.matches),
            swap_colors=self.swap_colors,
            max_moves=self.max_moves,
            time_limit_white=self.time_limit_white,
            time_limit_black=self.time_limit_black,
            created_at=self.created_at,
            time_limits=self.time_limits,
            games_per_limit=self.games_per_limit,
            rows=self.rows,
            image_base64=self.image_base64,
        )


class M2MController:
    def __init__(self, history: HistoryStore):
        self.matches: Dict[str, M2MMatch] = {}
        self.tests: Dict[str, TestPackage] = {}
        self.history = history
        self.tests_dir = Path(__file__).resolve().parents[2] / "tests"
        self.tests_dir.mkdir(parents=True, exist_ok=True)
        self.lock = threading.Lock()
        # Base worker count: CPU cores; can override with env M2M_MAX_WORKERS
        self.base_max_workers = int(os.getenv("M2M_MAX_WORKERS", os.cpu_count() or 4))
        self._load_tests_from_disk()

    # --- Helpers for engines & parallelism ---
    def _make_engine(self, level: AILevel):
        """Create a fresh engine instance to avoid sharing state (TT, caches) across threads."""
        proto = get_engine(level)
        return proto.__class__()  # type: ignore

    def _calculate_max_workers(self, white_engine: AILevel, black_engine: AILevel) -> int:
        """
        Decide thread pool size based on engine heaviness and CPU.
        Heavier engines (MCTS_CNN, ULTIMATE) get fewer workers to avoid overload.
        """
        heavy_engines = {AILevel.MCTS_CNN, AILevel.ULTIMATE}
        is_heavy = white_engine in heavy_engines or black_engine in heavy_engines
        has_gpu = os.getenv("CUDA_VISIBLE_DEVICES") not in (None, "", "-1")

        if is_heavy and not has_gpu:
            return max(1, self.base_max_workers // 2)
        if is_heavy:
            return max(1, self.base_max_workers)
        # light / medium engines
        return max(1, min(self.base_max_workers * 2, 20))

    def _load_tests_from_disk(self):
        for json_file in self.tests_dir.glob("*.json"):
            try:
                data = json.loads(json_file.read_text(encoding="utf-8"))
                if "kind" not in data:
                    data["kind"] = "batch"
                if "completed" not in data:
                    data["completed"] = len(data.get("matches", []))
                data["white_engine"] = AILevel(data["white_engine"])
                data["black_engine"] = AILevel(data["black_engine"])
                test = TestPackage(**data)
                self.tests[test.test_id] = test
            except Exception:
                continue

    def _persist_test(self, test: TestPackage):
        payload = {
            "test_id": test.test_id,
            "kind": test.kind,
            "white_engine": str(test.white_engine),
            "black_engine": str(test.black_engine),
            "games": test.games,
            "swap_colors": test.swap_colors,
            "max_moves": test.max_moves,
            "status": test.status,
            "matches": list(test.matches),
            "results": dict(test.results),
            "completed": test.completed,
            "created_at": test.created_at,
            "time_limit_white": test.time_limit_white,
            "time_limit_black": test.time_limit_black,
            "time_limits": test.time_limits,
            "games_per_limit": test.games_per_limit,
            "rows": test.rows,
            "image_base64": test.image_base64,
            "start_fen": test.start_fen,
        }
        path = self.tests_dir / f"{test.test_id}.json"
        with path.open("w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

    def _run_match_sync(self, match_id: str, white_engine: AILevel, black_engine: AILevel, max_moves: int, start_fen: Optional[str], time_limit_white: Optional[float], time_limit_black: Optional[float]):
        board = chess.Board(start_fen) if start_fen else chess.Board()
        move_history: List[str] = []
        status = "in_progress"
        winner: Optional[PlayerColor] = None
        result_reason: Optional[str] = None

        # Fresh instances per match to avoid shared state across threads
        white_engine_instance = self._make_engine(white_engine)
        black_engine_instance = self._make_engine(black_engine)

        for _ in range(max_moves):
            if board.is_game_over():
                break
            engine = white_engine_instance if board.turn == chess.WHITE else black_engine_instance
            time_budget = time_limit_white if board.turn == chess.WHITE else time_limit_black
            result = engine.choose_move(board, time_limit=time_budget)
            if result.move is None:
                break
            san = board.san(result.move)
            board.push(result.move)
            move_history.append(san)
            status, winner, result_reason, _ = evaluate_status(board)
            if status != "in_progress":
                break

        if status == "in_progress":
            status, winner, result_reason, _ = evaluate_status(board)
            if status == "in_progress":
                status = "draw"
                result_reason = result_reason or ("max_moves" if len(move_history) >= max_moves else "draw")
                winner = None

        match = self.matches[match_id]
        match.status = status
        match.winner = winner
        match.result_reason = result_reason
        match.move_history = move_history
        match.final_fen = board.fen()
        self.history.add_m2m(match_id=match_id, white_engine=white_engine, black_engine=black_engine, winner=winner, result_reason=result_reason or "", moves=len(move_history))

    def run_match(self, white_engine: AILevel, black_engine: AILevel, max_moves: int = 200, start_fen: Optional[str] = None, time_limit_white: Optional[float] = None, time_limit_black: Optional[float] = None) -> M2MMatch:
        match_id = str(uuid.uuid4())
        match = M2MMatch(
            match_id=match_id,
            white_engine=white_engine,
            black_engine=black_engine,
            status="running",
            winner=None,
            result_reason=None,
            move_history=[],
            final_fen=start_fen or chess.STARTING_FEN,
            created_at=dt.datetime.utcnow().isoformat(),
            time_limit_white=time_limit_white,
            time_limit_black=time_limit_black,
        )
        self.matches[match_id] = match

        worker = threading.Thread(target=self._run_match_sync, args=(match_id, white_engine, black_engine, max_moves, start_fen, time_limit_white, time_limit_black), daemon=True)
        worker.start()
        return match

    def _run_batch_worker(self, test_id: str, white_engine: AILevel, black_engine: AILevel, games: int, swap_colors: bool, max_moves: int, start_fen: Optional[str], time_limit_white: Optional[float], time_limit_black: Optional[float]):
        batch = self.tests[test_id]
        max_workers = self._calculate_max_workers(white_engine, black_engine)

        def run_single_match(game_idx: int) -> tuple[str, bool, Optional[PlayerColor]]:
            swap = swap_colors and (game_idx % 2 == 1)
            w_engine = black_engine if swap else white_engine
            b_engine = white_engine if swap else black_engine
            match_id = str(uuid.uuid4())
            placeholder = M2MMatch(
                match_id=match_id,
                white_engine=w_engine,
                black_engine=b_engine,
                status="running",
                winner=None,
                result_reason=None,
                move_history=[],
                final_fen=start_fen or chess.STARTING_FEN,
                created_at=dt.datetime.utcnow().isoformat(),
                time_limit_white=time_limit_white if not swap else time_limit_black,
                time_limit_black=time_limit_black if not swap else time_limit_white,
            )
            with self.lock:
                self.matches[match_id] = placeholder

            self._run_match_sync(
                match_id,
                w_engine,
                b_engine,
                max_moves,
                start_fen,
                time_limit_white if not swap else time_limit_black,
                time_limit_black if not swap else time_limit_white,
            )
            finished = self.matches[match_id]
            return match_id, swap, finished.winner

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {executor.submit(run_single_match, idx): idx for idx in range(games)}
            for future in as_completed(futures):
                try:
                    match_id, swap, winner = future.result()
                    with self.lock:
                        batch.matches.append(match_id)
                        batch.completed = len(batch.matches)
                        if winner is None:
                            batch.results["draw"] += 1
                        else:
                            # Map winner from board color to engine
                            # If swap: winner WHITE means black_engine won, winner BLACK means white_engine won
                            # If not swap: winner WHITE means white_engine won, winner BLACK means black_engine won
                            if (winner == PlayerColor.WHITE and not swap) or (winner == PlayerColor.BLACK and swap):
                                batch.results["white"] += 1
                            else:
                                batch.results["black"] += 1
                        self._persist_test(batch)
                except Exception as exc:
                    print(f"Batch worker error: {exc}")
        batch.status = "completed"
        with self.lock:
            self._persist_test(batch)

    def run_batch(self, white_engine: AILevel, black_engine: AILevel, games: int, swap_colors: bool, max_moves: int, start_fen: Optional[str] = None, time_limit_white: Optional[float] = None, time_limit_black: Optional[float] = None) -> TestPackage:
        test_id = str(uuid.uuid4())
        batch = TestPackage(
            test_id=test_id,
            kind="batch",
            white_engine=white_engine,
            black_engine=black_engine,
            games=games,
            swap_colors=swap_colors,
            max_moves=max_moves,
            time_limit_white=time_limit_white,
            time_limit_black=time_limit_black,
            start_fen=start_fen,
        )
        self.tests[test_id] = batch
        with self.lock:
            self._persist_test(batch)
        worker = threading.Thread(target=self._run_batch_worker, args=(test_id, white_engine, black_engine, games, swap_colors, max_moves, start_fen, time_limit_white, time_limit_black), daemon=True)
        worker.start()
        return batch

    def _play_game_oneoff(self, white_engine: AILevel, black_engine: AILevel, max_moves: int, start_fen: Optional[str], time_limit_white: Optional[float], time_limit_black: Optional[float]) -> tuple[Optional[PlayerColor], int, str]:
        board = chess.Board(start_fen) if start_fen else chess.Board()
        move_history: List[str] = []
        status = "in_progress"
        winner: Optional[PlayerColor] = None
        for _ in range(max_moves):
            if board.is_game_over():
                break
            engine = get_engine(white_engine if board.turn == chess.WHITE else black_engine)
            time_budget = time_limit_white if board.turn == chess.WHITE else time_limit_black
            result = engine.choose_move(board, time_limit=time_budget)
            if result.move is None:
                break
            san = board.san(result.move)
            board.push(result.move)
            move_history.append(san)
            status, winner, _, _ = evaluate_status(board)
            if status != "in_progress":
                break
        if status == "in_progress":
            status, winner, _, _ = evaluate_status(board)
            if status == "in_progress":
                status = "draw"
                winner = None
        return winner, len(move_history), status

    def _run_time_scaled_worker(self, test_id: str, white_engine: AILevel, black_engine: AILevel, time_limits: List[float], games_per_limit: int, swap_colors: bool, max_moves: int, start_fen: Optional[str]):
        test = self.tests[test_id]
        rows = []
        max_workers = self._calculate_max_workers(white_engine, black_engine)

        for tl in time_limits:
            results = {"white": 0, "black": 0, "draw": 0}
            total_moves = 0

            def run_single_game(game_idx: int) -> tuple[Optional[PlayerColor], int, bool]:
                swap = swap_colors and (game_idx % 2 == 1)
                w_engine = black_engine if swap else white_engine
                b_engine = white_engine if swap else black_engine
                winner, moves, status = self._play_game_oneoff(w_engine, b_engine, max_moves, start_fen, tl, tl)
                return winner, moves, swap

            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = {executor.submit(run_single_game, idx): idx for idx in range(games_per_limit)}
                for future in as_completed(futures):
                    try:
                        winner, moves, swap = future.result()
                        total_moves += moves
                        with self.lock:
                            test.completed += 1
                            if winner is None:
                                results["draw"] += 1
                                test.results["draw"] += 1
                            else:
                                if (winner == PlayerColor.WHITE and not swap) or (winner == PlayerColor.BLACK and swap):
                                    results["white"] += 1
                                    test.results["white"] += 1
                                else:
                                    results["black"] += 1
                                    test.results["black"] += 1
                            self._persist_test(test)
                    except Exception as exc:
                        print(f"Time benchmark worker error: {exc}")

            games = games_per_limit if games_per_limit > 0 else 1
            rows.append(
                {
                    "time_limit": tl,
                    "results": results,
                    "games": games_per_limit,
                    "avg_moves": total_moves / games,
                    "white_win_rate": results["white"] / games,
                    "black_win_rate": results["black"] / games,
                    "draw_rate": results["draw"] / games,
                }
            )
            test.rows = rows
            with self.lock:
                self._persist_test(test)
        test.rows = rows
        test.image_base64 = self._render_time_plot(rows, white_engine, black_engine)
        test.status = "completed"
        with self.lock:
            self._persist_test(test)

    def run_time_benchmark(self, white_engine: AILevel, black_engine: AILevel, time_limits: List[float], games_per_limit: int, swap_colors: bool, max_moves: int, start_fen: Optional[str] = None) -> TestPackage:
        test_id = str(uuid.uuid4())
        total_games = len(time_limits) * games_per_limit
        test = TestPackage(
            test_id=test_id,
            kind="time_scaled",
            white_engine=white_engine,
            black_engine=black_engine,
            games=total_games,
            swap_colors=swap_colors,
            max_moves=max_moves,
            time_limits=time_limits,
            games_per_limit=games_per_limit,
            start_fen=start_fen,
        )
        self.tests[test_id] = test
        with self.lock:
            self._persist_test(test)
        worker = threading.Thread(target=self._run_time_scaled_worker, args=(test_id, white_engine, black_engine, time_limits, games_per_limit, swap_colors, max_moves, start_fen), daemon=True)
        worker.start()
        return test

    def _render_time_plot(self, rows: List[dict], white_engine: AILevel, black_engine: AILevel) -> str:
        xs = [row["time_limit"] for row in rows]
        white_rates = [row["white_win_rate"] for row in rows]
        black_rates = [row["black_win_rate"] for row in rows]
        draw_rates = [row["draw_rate"] for row in rows]

        fig, ax = plt.subplots(figsize=(6, 4))
        ax.plot(xs, white_rates, marker="o", label=f"{white_engine} win rate", color="#7AE1A0")
        ax.plot(xs, black_rates, marker="s", label=f"{black_engine} win rate", color="#7AA2F7")
        ax.plot(xs, draw_rates, marker="^", label="Draw rate", color="#E5D2A8", linestyle="--")
        ax.set_xlabel("Per-move time (seconds)")
        ax.set_ylabel("Rate")
        ax.set_ylim(0, 1)
        ax.grid(True, linestyle="--", alpha=0.3)
        ax.legend()
        fig.tight_layout()
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=140)
        plt.close(fig)
        buf.seek(0)
        return base64.b64encode(buf.getvalue()).decode("ascii")

    def list_matches(self, page: int = 1, page_size: int = 100) -> PagedMatches:
        page_size = min(page_size, 100)
        items = sorted(self.matches.values(), key=lambda m: m.created_at, reverse=True)
        total = len(items)
        start = max(0, (page - 1) * page_size)
        end = start + page_size
        selected = items[start:end]
        return PagedMatches(items=[m.to_summary() for m in selected], page=page, page_size=page_size, total=total)

    def get_match(self, match_id: str) -> MatchDetail:
        if match_id not in self.matches:
            raise KeyError("match_not_found")
        return self.matches[match_id].to_detail()

    def list_tests(self, page: int = 1, page_size: int = 100) -> PagedTests:
        page_size = min(page_size, 100)
        items = sorted(self.tests.values(), key=lambda t: t.created_at, reverse=True)
        total = len(items)
        start = max(0, (page - 1) * page_size)
        end = start + page_size
        selected = items[start:end]
        return PagedTests(items=[t.to_summary() for t in selected], page=page, page_size=page_size, total=total)

    def get_test(self, test_id: str) -> BatchTestSummary:
        if test_id not in self.tests:
            raise KeyError("test_not_found")
        return self.tests[test_id].to_summary()
