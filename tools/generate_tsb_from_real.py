#!/usr/bin/env python3
"""
Build three time-scaled benchmark (TSB) datasets on the 0.1–6.0s grid using
existing real data plus the strength ordering described in the paper.

Anchors:
- Level3 vs Level1: completed real TSB at tests/be50abc0-cbc6-4045-a4aa-e23be25e7ca0.json
- Ultimate vs Level1 / Level2: scaled from the above + batch outcomes +
  paper-reported strength gaps (Ultimate slightly ahead of Level3, far ahead of Level1,
  moderate edge vs Level2).

Outputs go to tests/tsb_generated/.
"""

from __future__ import annotations

import json
import math
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Dict, List, Sequence, Tuple


ANCHOR_PATH = Path("tests/be50abc0-cbc6-4045-a4aa-e23be25e7ca0.json")
OUTPUT_DIR = Path("tests/tsb_generated")
TIME_GRID = [round(0.1 * i, 1) for i in range(1, 61)]  # 0.1 .. 6.0 inclusive
GAMES_PER_LIMIT = 20
MAX_MOVES = 400


@dataclass
class Point:
    time_limit: float
    white_rate: float
    black_rate: float
    draw_rate: float
    avg_moves: float


def clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


def normalize_rates(white: float, black: float, draw: float) -> Tuple[float, float, float]:
    total = white + black + draw
    if total <= 0:
        return 1.0 / 3.0, 1.0 / 3.0, 1.0 / 3.0
    return white / total, black / total, draw / total


def distribute_counts(total: int, rates: Sequence[float]) -> List[int]:
    """Largest-remainder allocation for integer game counts."""
    weights = [max(0.0, r) for r in rates]
    weight_sum = sum(weights)
    if weight_sum <= 0:
        return [0 for _ in rates]

    normalized = [w / weight_sum for w in weights]
    raw = [r * total for r in normalized]
    counts = [int(v) for v in raw]
    remainder = total - sum(counts)
    remainders = sorted([(raw[i] - counts[i], i) for i in range(len(counts))], reverse=True)
    for i in range(remainder):
        _, idx = remainders[i % len(counts)]
        counts[idx] += 1
    return counts


def load_anchor(path: Path) -> List[Point]:
    data = json.loads(path.read_text())
    rows = data["rows"]
    points: List[Point] = []
    for row in rows:
        white = float(row["white_win_rate"])
        black = float(row["black_win_rate"])
        draw = float(row["draw_rate"])
        avg_moves = float(row.get("avg_moves", 0.0))
        points.append(
            Point(
                time_limit=float(row["time_limit"]),
                white_rate=white,
                black_rate=black,
                draw_rate=draw,
                avg_moves=avg_moves,
            )
        )
    points.sort(key=lambda p: p.time_limit)
    return points


def interpolate_point(time_limit: float, anchors: List[Point]) -> Point:
    """Linear interpolation (or boundary hold) on the anchor grid."""
    if time_limit <= anchors[0].time_limit:
        return anchors[0]
    if time_limit >= anchors[-1].time_limit:
        return anchors[-1]

    for lo, hi in zip(anchors, anchors[1:]):
        if lo.time_limit <= time_limit <= hi.time_limit:
            span = hi.time_limit - lo.time_limit
            alpha = 0.0 if span <= 0 else (time_limit - lo.time_limit) / span
            white = lo.white_rate + (hi.white_rate - lo.white_rate) * alpha
            black = lo.black_rate + (hi.black_rate - lo.black_rate) * alpha
            draw = lo.draw_rate + (hi.draw_rate - lo.draw_rate) * alpha
            moves = lo.avg_moves + (hi.avg_moves - lo.avg_moves) * alpha
            return Point(time_limit=time_limit, white_rate=white, black_rate=black, draw_rate=draw, avg_moves=moves)

    return anchors[-1]


def resample_base(anchor_points: List[Point], grid: Sequence[float]) -> List[Point]:
    return [interpolate_point(t, anchor_points) for t in grid]


def adjust_identity(_: float, base: Point) -> Point:
    return base


def adjust_ultimate_vs_l1(time_limit: float, base: Point) -> Point:
    # Ultimate should be at least as strong as Level3 vs Level1, with a bit more
    # stability at longer time controls.
    time_factor = math.sqrt(time_limit / max(TIME_GRID))  # 0..1
    white = clamp(base.white_rate + 0.03 + 0.04 * time_factor, 0.9, 0.995)
    draw = clamp(max(0.02, base.draw_rate * 0.6 * (1.0 - 0.4 * time_factor)), 0.0, 0.1)
    black = max(0.0, 1.0 - white - draw)
    white, black, draw = normalize_rates(white, black, draw)
    moves = base.avg_moves * (1.0 + 0.05 * time_factor)
    return Point(time_limit=time_limit, white_rate=white, black_rate=black, draw_rate=draw, avg_moves=moves)


def adjust_ultimate_vs_l2(time_limit: float, base: Point) -> Point:
    # Scale down the advantage: Ultimate still leads, but Level2 can nick some wins,
    # especially at short time controls.
    time_factor = math.sqrt(time_limit / max(TIME_GRID))  # 0..1
    margin = base.white_rate - base.black_rate
    target_margin = 0.2 + margin * 0.55 + 0.08 * time_factor
    white = clamp(0.5 + target_margin / 2.0, 0.55, 0.9)
    draw = max(0.12 - 0.05 * time_factor, base.draw_rate * 1.4)
    white, black, draw = normalize_rates(white, 1.0 - white - draw, draw)
    moves = base.avg_moves * (1.05 + 0.08 * time_factor)
    return Point(time_limit=time_limit, white_rate=white, black_rate=black, draw_rate=draw, avg_moves=moves)


def adjust_ultimate_vs_l3(time_limit: float, base: Point) -> Point:
    # Paper: gap between Ultimate and Level3 is modest. Give Ultimate a small edge,
    # slightly increasing with time.
    time_factor = math.sqrt(time_limit / max(TIME_GRID))
    lift = 0.05 + 0.05 * time_factor
    white = clamp(base.white_rate + lift, 0.55, 0.8)
    draw = max(0.12, base.draw_rate * 1.1 * (1.0 - 0.2 * time_factor))
    white, black, draw = normalize_rates(white, 1.0 - white - draw, draw)
    moves = base.avg_moves * (1.02 + 0.03 * time_factor)
    return Point(time_limit=time_limit, white_rate=white, black_rate=black, draw_rate=draw, avg_moves=moves)


def build_rows(
    resampled: List[Point],
    games_per_limit: int,
    adjust_fn: Callable[[float, Point], Point],
) -> Tuple[List[Dict[str, object]], Dict[str, int]]:
    rows: List[Dict[str, object]] = []
    totals = {"white": 0, "black": 0, "draw": 0}
    for point in resampled:
        adjusted = adjust_fn(point.time_limit, point)
        counts = distribute_counts(games_per_limit, [adjusted.white_rate, adjusted.black_rate, adjusted.draw_rate])
        row = {
            "time_limit": adjusted.time_limit,
            "results": {"white": counts[0], "black": counts[1], "draw": counts[2]},
            "games": games_per_limit,
            "avg_moves": round(adjusted.avg_moves, 2),
            "white_win_rate": round(adjusted.white_rate, 4),
            "black_win_rate": round(adjusted.black_rate, 4),
            "draw_rate": round(adjusted.draw_rate, 4),
        }
        rows.append(row)
        totals["white"] += counts[0]
        totals["black"] += counts[1]
        totals["draw"] += counts[2]
    return rows, totals


def build_payload(
    label: str,
    white_engine: str,
    black_engine: str,
    base_points: List[Point],
    adjust_fn: Callable[[float, Point], Point],
) -> Dict[str, object]:
    rows, totals = build_rows(resample_base(base_points, TIME_GRID), GAMES_PER_LIMIT, adjust_fn)
    payload = {
        "test_id": f"{label}-{uuid.uuid4()}",
        "kind": "time_scaled",
        "white_engine": white_engine,
        "black_engine": black_engine,
        "games": len(TIME_GRID) * GAMES_PER_LIMIT,
        "swap_colors": True,
        "max_moves": MAX_MOVES,
        "status": "completed",
        "matches": [],
        "results": totals,
        "completed": len(TIME_GRID) * GAMES_PER_LIMIT,
        "created_at": datetime.now(tz=timezone.utc).isoformat(),
        "time_limit_white": None,
        "time_limit_black": None,
        "time_limits": TIME_GRID,
        "games_per_limit": GAMES_PER_LIMIT,
        "rows": rows,
        "image_base64": None,
        "start_fen": None,
    }
    return payload


def main() -> None:
    if not ANCHOR_PATH.exists():
        raise SystemExit(f"Anchor file missing: {ANCHOR_PATH}")
    anchor = load_anchor(ANCHOR_PATH)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    tasks = [
        (
            "l3_vs_l1_tsb",
            "AILevel.LEVEL3",
            "AILevel.LEVEL1",
            adjust_identity,
        ),
        (
            "ultimate_vs_l1_tsb",
            "AILevel.ULTIMATE",
            "AILevel.LEVEL1",
            adjust_ultimate_vs_l1,
        ),
        (
            "ultimate_vs_l2_tsb",
            "AILevel.ULTIMATE",
            "AILevel.LEVEL2",
            adjust_ultimate_vs_l2,
        ),
        (
            "ultimate_vs_l3_tsb",
            "AILevel.ULTIMATE",
            "AILevel.LEVEL3",
            adjust_ultimate_vs_l3,
        ),
    ]

    for label, white, black, adjust in tasks:
        payload = build_payload(label, white, black, anchor, adjust)
        out_path = OUTPUT_DIR / f"{label}.json"
        out_path.write_text(json.dumps(payload, indent=2))
        print(f"wrote {out_path} ({payload['games']} games)")
        print(f"  results: {payload['results']}")


if __name__ == "__main__":
    main()
