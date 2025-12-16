#!/usr/bin/env python3
"""
Synthetic test result generator for batch tests and time-scaled benchmarks.

The backend saves test packages as JSON files under `tests/`. This helper can
generate those JSON blobs without running any games, which is useful for
populating demo data or quickly preparing custom scenarios.

Examples:
  # Batch test with custom result split and auto-generated match ids
  python tools/generate_test_results.py batch --white-engine AILevel.LEVEL3 --black-engine AILevel.LEVEL1 \\
    --games 12 --white-wins 6 --black-wins 3 --draws 3 --time-limit-white 2.5

  # Time-scaled benchmark (TSB) with a gentle white advantage and placeholder chart
  python tools/generate_test_results.py tsb --white-engine AILevel.MCTS --black-engine AILevel.LEVEL2 \\
    --time-limits 0.5 1.0 1.5 2.0 --games-per-limit 8 --white-base 0.55 --white-ramp 0.05 \\
    --placeholder-image

  # Load per-row data from an existing JSON file instead of auto-generating
  python tools/generate_test_results.py tsb --rows-from custom_rows.json --image-from tools/charts/time_scaled/some.png
"""

from __future__ import annotations

import argparse
import base64
import json
import random
import sys
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

# 1x1 transparent PNG (base64) to satisfy front-end placeholders when needed.
PLACEHOLDER_PNG_BASE64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII="
)


def iso_now() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def distribute_counts(total: int, rates: Sequence[float], rng: random.Random) -> List[int]:
    """
    Convert fractional rates into integer counts that add up to `total`.
    Uses largest-remainder; ties are shuffled by RNG for determinism with seed.
    """
    if total <= 0:
        return [0 for _ in rates]

    weights = [max(0.0, r) for r in rates]
    weight_sum = sum(weights)
    if weight_sum <= 0:
        weights = [1.0 for _ in rates]
        weight_sum = float(len(weights))

    normalized = [w / weight_sum for w in weights]
    raw = [r * total for r in normalized]
    counts = [int(v) for v in raw]
    remainder = total - sum(counts)

    # Distribute the leftover counts by largest remainder; shuffle to break ties.
    remainders = [(raw[i] - counts[i], i) for i in range(len(counts))]
    rng.shuffle(remainders)
    remainders.sort(key=lambda x: x[0], reverse=True)
    for i in range(remainder):
        _, idx = remainders[i % len(remainders)]
        counts[idx] += 1

    return counts


def encode_image(path: Path) -> str:
    with path.open("rb") as f:
        return base64.b64encode(f.read()).decode("ascii")


def parse_optional_rate(value: Optional[float]) -> Optional[float]:
    if value is None:
        return None
    return clamp01(value)


@dataclass
class BatchArgs:
    white_engine: str
    black_engine: str
    games: int
    swap_colors: bool
    max_moves: int
    status: str
    time_limit_white: Optional[float]
    time_limit_black: Optional[float]
    white_wins: Optional[int]
    black_wins: Optional[int]
    draws: Optional[int]
    white_rate: Optional[float]
    black_rate: Optional[float]
    draw_rate: Optional[float]
    completed: Optional[int]
    no_matches: bool
    matches: Optional[int]
    start_fen: Optional[str]
    test_id: Optional[str]
    created_at: Optional[str]
    count: int


@dataclass
class TSBArgs:
    white_engine: str
    black_engine: str
    swap_colors: bool
    max_moves: int
    status: str
    time_limits: List[float]
    games_per_limit: int
    white_base: float
    black_base: float
    draw_base: float
    white_ramp: float
    black_ramp: float
    draw_ramp: float
    noise: float
    avg_base: float
    avg_ramp: float
    avg_jitter: float
    rows_from: Optional[Path]
    image_from: Optional[Path]
    placeholder_image: bool
    completed: Optional[int]
    start_fen: Optional[str]
    test_id: Optional[str]
    created_at: Optional[str]
    count: int


def normalize_rates(w: float, b: float, d: float) -> Tuple[float, float, float]:
    w = max(0.0, w)
    b = max(0.0, b)
    d = max(0.0, d)
    total = w + b + d
    if total <= 0:
        return 1.0 / 3.0, 1.0 / 3.0, 1.0 / 3.0
    return w / total, b / total, d / total


def build_results_from_counts(
    games: int, white: Optional[int], black: Optional[int], draw: Optional[int], rng: random.Random, rate_hint: Tuple[float, float, float]
) -> Dict[str, int]:
    if games < 0:
        raise ValueError("games must be non-negative")
    provided = {"white": white or 0, "black": black or 0, "draw": draw or 0}
    total = sum(provided.values())
    if total > games:
        raise ValueError(f"Result counts ({total}) exceed games ({games}).")
    if total < games:
        # Fill the remainder using the hinted rates.
        remainder = games - total
        extra = distribute_counts(remainder, rate_hint, rng)
        provided["white"] += extra[0]
        provided["black"] += extra[1]
        provided["draw"] += extra[2]
    return provided


def build_batch_payload(args: BatchArgs, rng: random.Random, index: int) -> Dict[str, Any]:
    test_id = args.test_id
    if args.test_id and args.count > 1:
        test_id = f"{args.test_id}-{index+1:02d}"
    payload_id = test_id or str(uuid.uuid4())

    rate_hint = (
        args.white_rate if args.white_rate is not None else 0.4,
        args.black_rate if args.black_rate is not None else 0.35,
        args.draw_rate if args.draw_rate is not None else 0.25,
    )
    results = build_results_from_counts(
        args.games, args.white_wins, args.black_wins, args.draws, rng, normalize_rates(*rate_hint)
    )

    match_target = args.matches
    if match_target is None:
        if args.status == "completed":
            match_target = args.games
        elif args.completed is not None:
            match_target = args.completed
        else:
            match_target = 0
    match_target = max(0, min(args.games, match_target))
    matches: List[str] = [] if args.no_matches else [str(uuid.uuid4()) for _ in range(match_target)]

    completed = args.completed
    if completed is None:
        completed = match_target if matches else (args.games if args.status == "completed" else 0)
    completed = max(0, min(args.games, completed))

    return {
        "test_id": payload_id,
        "kind": "batch",
        "white_engine": args.white_engine,
        "black_engine": args.black_engine,
        "games": args.games,
        "swap_colors": args.swap_colors,
        "max_moves": args.max_moves,
        "status": args.status,
        "matches": matches,
        "results": results,
        "completed": completed,
        "created_at": args.created_at or iso_now(),
        "time_limit_white": args.time_limit_white,
        "time_limit_black": args.time_limit_black,
        "time_limits": None,
        "games_per_limit": None,
        "rows": None,
        "image_base64": None,
        "start_fen": args.start_fen,
    }


def validate_row(row: Dict[str, Any]) -> Dict[str, Any]:
    required = {"time_limit", "results", "games", "avg_moves"}
    missing = required - set(row.keys())
    if missing:
        raise ValueError(f"Row missing required keys: {', '.join(sorted(missing))}")
    results = row.get("results") or {}
    games = int(row["games"])
    white = int(results.get("white", 0))
    black = int(results.get("black", 0))
    draw = int(results.get("draw", 0))
    total = max(1, games)
    return {
        "time_limit": float(row["time_limit"]),
        "results": {"white": white, "black": black, "draw": draw},
        "games": games,
        "avg_moves": float(row["avg_moves"]),
        "white_win_rate": white / total,
        "black_win_rate": black / total,
        "draw_rate": draw / total,
    }


def load_rows_from_file(path: Path) -> List[Dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("rows file must contain a JSON array")
    return [validate_row(r) for r in data]


def generate_rows(args: TSBArgs, rng: random.Random) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for idx, tl in enumerate(args.time_limits):
        w = args.white_base + args.white_ramp * idx + rng.uniform(-args.noise, args.noise)
        b = args.black_base + args.black_ramp * idx + rng.uniform(-args.noise, args.noise)
        d = args.draw_base + args.draw_ramp * idx + rng.uniform(-args.noise, args.noise)
        w, b, d = normalize_rates(w, b, d)
        counts = distribute_counts(args.games_per_limit, (w, b, d), rng)
        total_games = max(1, args.games_per_limit)
        avg_moves = max(
            1.0,
            args.avg_base + args.avg_ramp * idx + rng.uniform(-args.avg_jitter, args.avg_jitter),
        )
        rows.append(
            {
                "time_limit": float(tl),
                "results": {"white": counts[0], "black": counts[1], "draw": counts[2]},
                "games": args.games_per_limit,
                "avg_moves": avg_moves,
                "white_win_rate": counts[0] / total_games,
                "black_win_rate": counts[1] / total_games,
                "draw_rate": counts[2] / total_games,
            }
        )
    return rows


def collect_time_scaled_results(rows: Iterable[Dict[str, Any]]) -> Dict[str, int]:
    totals = {"white": 0, "black": 0, "draw": 0}
    for row in rows:
        res = row.get("results") or {}
        totals["white"] += int(res.get("white", 0))
        totals["black"] += int(res.get("black", 0))
        totals["draw"] += int(res.get("draw", 0))
    return totals


def pick_image(args: TSBArgs) -> Optional[str]:
    if args.image_from:
        return encode_image(args.image_from)
    if args.placeholder_image:
        return PLACEHOLDER_PNG_BASE64
    return None


def build_tsb_payload(args: TSBArgs, rng: random.Random, index: int) -> Dict[str, Any]:
    test_id = args.test_id
    if args.test_id and args.count > 1:
        test_id = f"{args.test_id}-{index+1:02d}"
    payload_id = test_id or str(uuid.uuid4())

    if args.rows_from:
        rows = load_rows_from_file(args.rows_from)
    else:
        rows = generate_rows(args, rng)

    total_games = len(rows) * args.games_per_limit
    totals = collect_time_scaled_results(rows)
    completed = args.completed
    if completed is None:
        completed = total_games if args.status == "completed" else totals["white"] + totals["black"] + totals["draw"]
    completed = max(0, min(total_games, completed))

    return {
        "test_id": payload_id,
        "kind": "time_scaled",
        "white_engine": args.white_engine,
        "black_engine": args.black_engine,
        "games": total_games,
        "swap_colors": args.swap_colors,
        "max_moves": args.max_moves,
        "status": args.status,
        "matches": [],
        "results": totals,
        "completed": completed,
        "created_at": args.created_at or iso_now(),
        "time_limit_white": None,
        "time_limit_black": None,
        "time_limits": [float(tl) for tl in args.time_limits],
        "games_per_limit": args.games_per_limit,
        "rows": rows,
        "image_base64": pick_image(args),
        "start_fen": args.start_fen,
    }


def write_payload(payload: Dict[str, Any], tests_dir: Path, dry_run: bool) -> None:
    tests_dir.mkdir(parents=True, exist_ok=True)
    out_path = tests_dir / f"{payload['test_id']}.json"
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    if dry_run:
        print(text)
        return
    out_path.write_text(text, encoding="utf-8")
    print(f"[ok] wrote {out_path}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate synthetic batch or time-scaled test result JSON files.")
    parser.add_argument("--tests-dir", type=Path, default=Path("tests"), help="Destination folder for generated JSON files.")
    parser.add_argument("--seed", type=int, help="Optional RNG seed for reproducibility.")
    parser.add_argument("--dry-run", action="store_true", help="Print the generated JSON instead of writing to disk.")

    subparsers = parser.add_subparsers(dest="command", required=True)

    batch = subparsers.add_parser("batch", help="Generate a batch test result.")
    batch.add_argument("--white-engine", default="AILevel.LEVEL2")
    batch.add_argument("--black-engine", default="AILevel.LEVEL2")
    batch.add_argument("--games", type=int, default=10)
    batch.add_argument("--swap-colors", action="store_true")
    batch.add_argument("--max-moves", type=int, default=200)
    batch.add_argument("--status", choices=["completed", "running", "queued"], default="completed")
    batch.add_argument("--time-limit-white", type=float)
    batch.add_argument("--time-limit-black", type=float)
    batch.add_argument("--white-wins", type=int)
    batch.add_argument("--black-wins", type=int)
    batch.add_argument("--draws", type=int)
    batch.add_argument("--white-rate", type=float, help="Fallback win rate if counts are not provided.")
    batch.add_argument("--black-rate", type=float, help="Fallback loss rate if counts are not provided.")
    batch.add_argument("--draw-rate", type=float, help="Fallback draw rate if counts are not provided.")
    batch.add_argument("--completed", type=int, help="Override completed count; defaults to matches or games.")
    batch.add_argument("--matches", type=int, help="Number of match ids to emit (ignored when --no-matches).")
    batch.add_argument("--no-matches", action="store_true", help="Do not emit match ids; leave matches empty.")
    batch.add_argument("--start-fen")
    batch.add_argument("--id", dest="test_id")
    batch.add_argument("--created-at")
    batch.add_argument("--count", type=int, default=1, help="Generate N copies (adds numeric suffix when id is provided).")

    tsb = subparsers.add_parser("tsb", help="Generate a time-scaled benchmark result.")
    tsb.add_argument("--white-engine", default="AILevel.LEVEL3")
    tsb.add_argument("--black-engine", default="AILevel.LEVEL1")
    tsb.add_argument("--swap-colors", action="store_true")
    tsb.add_argument("--max-moves", type=int, default=300)
    tsb.add_argument("--status", choices=["completed", "running", "queued"], default="completed")
    tsb.add_argument("--time-limits", nargs="+", type=float, default=[0.5, 1.0, 1.5, 2.0], help="List of per-move budgets (seconds).")
    tsb.add_argument("--games-per-limit", type=int, default=6)
    tsb.add_argument("--white-base", type=float, default=0.45, help="Baseline white win rate used for synthesis.")
    tsb.add_argument("--black-base", type=float, default=0.35, help="Baseline black win rate used for synthesis.")
    tsb.add_argument("--draw-base", type=float, default=0.20, help="Baseline draw rate used for synthesis.")
    tsb.add_argument("--white-ramp", type=float, default=0.02, help="Per-step change applied to white rate as time grows.")
    tsb.add_argument("--black-ramp", type=float, default=0.0, help="Per-step change applied to black rate as time grows.")
    tsb.add_argument("--draw-ramp", type=float, default=-0.01, help="Per-step change applied to draw rate as time grows.")
    tsb.add_argument("--noise", type=float, default=0.02, help="Uniform noise (+/-) applied to each rate.")
    tsb.add_argument("--avg-base", type=float, default=120.0, help="Average moves at the first time limit.")
    tsb.add_argument("--avg-ramp", type=float, default=12.0, help="Per-step change applied to avg_moves.")
    tsb.add_argument("--avg-jitter", type=float, default=8.0, help="Random jitter (+/-) applied to avg_moves.")
    tsb.add_argument("--rows-from", type=Path, help="Load rows from an existing JSON file instead of auto-generating.")
    tsb.add_argument("--image-from", type=Path, help="PNG to base64-embed into image_base64.")
    tsb.add_argument("--placeholder-image", action="store_true", help="Embed a tiny placeholder PNG into image_base64.")
    tsb.add_argument("--completed", type=int, help="Override completed count; defaults to total games or rows sum.")
    tsb.add_argument("--start-fen")
    tsb.add_argument("--id", dest="test_id")
    tsb.add_argument("--created-at")
    tsb.add_argument("--count", type=int, default=1, help="Generate N copies (adds numeric suffix when id is provided).")

    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rng = random.Random(args.seed)

    try:
        if args.command == "batch":
            parsed = BatchArgs(
                white_engine=args.white_engine,
                black_engine=args.black_engine,
                games=args.games,
                swap_colors=args.swap_colors,
                max_moves=args.max_moves,
                status=args.status,
                time_limit_white=args.time_limit_white,
                time_limit_black=args.time_limit_black,
                white_wins=args.white_wins,
                black_wins=args.black_wins,
                draws=args.draws,
                white_rate=parse_optional_rate(args.white_rate),
                black_rate=parse_optional_rate(args.black_rate),
                draw_rate=parse_optional_rate(args.draw_rate),
                completed=args.completed,
                no_matches=args.no_matches,
                matches=args.matches,
                start_fen=args.start_fen,
                test_id=args.test_id,
                created_at=args.created_at,
                count=args.count,
            )
            for idx in range(parsed.count):
                payload = build_batch_payload(parsed, rng, idx)
                write_payload(payload, args.tests_dir, args.dry_run)
        elif args.command == "tsb":
            parsed = TSBArgs(
                white_engine=args.white_engine,
                black_engine=args.black_engine,
                swap_colors=args.swap_colors,
                max_moves=args.max_moves,
                status=args.status,
                time_limits=args.time_limits,
                games_per_limit=args.games_per_limit,
                white_base=args.white_base,
                black_base=args.black_base,
                draw_base=args.draw_base,
                white_ramp=args.white_ramp,
                black_ramp=args.black_ramp,
                draw_ramp=args.draw_ramp,
                noise=args.noise,
                avg_base=args.avg_base,
                avg_ramp=args.avg_ramp,
                avg_jitter=args.avg_jitter,
                rows_from=args.rows_from,
                image_from=args.image_from,
                placeholder_image=args.placeholder_image,
                completed=args.completed,
                start_fen=args.start_fen,
                test_id=args.test_id,
                created_at=args.created_at,
                count=args.count,
            )
            for idx in range(parsed.count):
                payload = build_tsb_payload(parsed, rng, idx)
                write_payload(payload, args.tests_dir, args.dry_run)
        else:
            raise ValueError(f"Unsupported command: {args.command}")
    except Exception as exc:  # noqa: BLE001
        print(f"[error] {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
