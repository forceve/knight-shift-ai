#!/usr/bin/env python3
"""
Generate analysis charts from test result JSON files in `tests/`.

Features:
- Builds heatmaps for batch self-play results (white win rate and draw rate) similar to the paper's win-rate tables.
- Generates time-scaled benchmark plots (win/draw rates + avg moves vs. per-move time) used by the frontend TSB view.
- Optionally embeds the generated time-scaled charts back into the source JSON as base64 strings for the frontend.

Usage:
  python tools/generate_test_charts.py --tests-dir tests --out-dir tools/charts
  python tools/generate_test_charts.py --update-json  # also writes image_base64 into time_scaled JSONs
"""
from __future__ import annotations

import argparse
import base64
import io
import json
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

import matplotlib.pyplot as plt
import pandas as pd

plt.switch_backend("Agg")

ENGINE_LABELS = {
    "ailevel.level1": "L1",
    "ailevel.level2": "L2",
    "ailevel.level3": "L3",
    "ailevel.level4": "L4",
    "ailevel.ultimate": "Ultimate",
    "ailevel.mcts": "MCTS",
    "ailevel.mcts_cnn": "MCTS+CNN",
    "level1": "L1",
    "level2": "L2",
    "level3": "L3",
    "level4": "L4",
    "ultimate": "Ultimate",
    "mcts": "MCTS",
    "mcts_cnn": "MCTS+CNN",
}

ENGINE_ORDER = {
    "L1": 1,
    "L2": 2,
    "L3": 3,
    "L4": 4,
    "Ultimate": 10,
    "MCTS": 20,
    "MCTS+CNN": 21,
}


def friendly_label(name: str) -> str:
    key = (name or "").replace("AILevel.", "").lower()
    return ENGINE_LABELS.get(key, name or "unknown")


def slugify(label: str) -> str:
    safe: List[str] = []
    for ch in label.lower():
        if ch.isalnum():
            safe.append(ch)
        elif ch in (" ", "-", "+"):
            safe.append("_")
    slug = ''.join(safe).strip('_')
    return slug or "unknown"


def order_key(name: str) -> int:
    return ENGINE_ORDER.get(name, 100 + hash(name) % 100)


def load_tests(tests_dir: Path) -> List[Tuple[Path, Dict[str, Any]]]:
    entries: List[Tuple[Path, Dict[str, Any]]] = []
    for path in sorted(tests_dir.glob("*.json")):
        try:
            with path.open("r", encoding="utf-8") as f:
                data = json.load(f)
            entries.append((path, data))
        except Exception as exc:  # noqa: BLE001
            print(f"[warn] Skip {path.name}: {exc}")
    print(f"[info] Loaded {len(entries)} test files from {tests_dir}")
    return entries


def plot_heatmap(matrix: pd.DataFrame, title: str, cbar_label: str, out_path: Path) -> None:
    if matrix.empty:
        print(f"[info] Skip heatmap {title}: empty matrix")
        return

    fig, ax = plt.subplots(figsize=(1.8 + 0.8 * matrix.shape[1], 1.8 + 0.8 * matrix.shape[0]))
    im = ax.imshow(matrix, vmin=0, vmax=100, cmap="YlGnBu")
    ax.set_xticks(range(len(matrix.columns)))
    ax.set_yticks(range(len(matrix.index)))
    ax.set_xticklabels(matrix.columns, rotation=45, ha="right")
    ax.set_yticklabels(matrix.index)
    ax.set_title(title, fontsize=12, pad=12)

    for i, row in enumerate(matrix.index):
        for j, col in enumerate(matrix.columns):
            val = matrix.iloc[i, j]
            if pd.isna(val):
                continue
            text_color = "white" if val >= 65 else "black"
            ax.text(j, i, f"{val:.0f}", ha="center", va="center", color=text_color, fontsize=8)

    fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04, label=cbar_label)
    fig.tight_layout()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_path, dpi=200)
    plt.close(fig)
    print(f"[ok] Saved {out_path}")


def generate_pairing_charts(entries: Iterable[Tuple[Path, Dict[str, Any]]], out_dir: Path) -> None:
    rows: List[Dict[str, Any]] = []
    for _, data in entries:
        if data.get("status") != "completed":
            continue
        results = data.get("results") or {}
        total = sum(results.values()) or data.get("games") or 0
        if total <= 0:
            continue
        rows.append(
            {
                "white_label": friendly_label(data.get("white_engine", "")),
                "black_label": friendly_label(data.get("black_engine", "")),
                "white_wins": results.get("white", 0),
                "black_wins": results.get("black", 0),
                "draws": results.get("draw", 0),
                "games": total,
                "kind": data.get("kind"),
                "test_id": data.get("test_id"),
            }
        )

    if not rows:
        print("[info] No completed batch-like tests to summarize.")
        return

    df = pd.DataFrame(rows)
    grouped = (
        df.groupby(["white_label", "black_label"], as_index=False)[["white_wins", "black_wins", "draws", "games"]]
        .sum()
    )
    grouped["white_win_pct"] = grouped["white_wins"] / grouped["games"] * 100
    grouped["draw_pct"] = grouped["draws"] / grouped["games"] * 100
    grouped["avg_score_pct"] = (grouped["white_wins"] + 0.5 * grouped["draws"]) / grouped["games"] * 100
    grouped["games"] = grouped["games"].astype(int)

    out_dir.mkdir(parents=True, exist_ok=True)
    summary_path = out_dir / "pairing_summary.csv"
    grouped.to_csv(summary_path, index=False)
    print(f"[ok] Wrote pairing summary {summary_path}")

    order = sorted(set(grouped["white_label"]).union(grouped["black_label"]), key=order_key)
    win_matrix = grouped.pivot(index="white_label", columns="black_label", values="white_win_pct").reindex(
        index=order, columns=order
    )
    draw_matrix = grouped.pivot(index="white_label", columns="black_label", values="draw_pct").reindex(
        index=order, columns=order
    )
    score_matrix = grouped.pivot(index="white_label", columns="black_label", values="avg_score_pct").reindex(
        index=order, columns=order
    )

    plot_heatmap(win_matrix, "White win rate (%) by pairing", "Win rate (%)", out_dir / "pairing_win_rate.png")
    plot_heatmap(draw_matrix, "Draw rate (%) by pairing", "Draw rate (%)", out_dir / "pairing_draw_rate.png")
    plot_heatmap(
        score_matrix,
        "Average score by pairing (win=1, draw=0.5, loss=0)",
        "Avg score (%)",
        out_dir / "pairing_avg_score.png",
    )


def encode_image(path: Path) -> str:
    with path.open("rb") as f:
        return base64.b64encode(f.read()).decode("ascii")


def generate_time_scaled_charts(
    entries: Iterable[Tuple[Path, Dict[str, Any]]], out_dir: Path, update_json: bool, force_update: bool
) -> List[Dict[str, Any]]:
    generated: List[Dict[str, Any]] = []
    ts_dir = out_dir / "time_scaled"
    ts_dir.mkdir(parents=True, exist_ok=True)

    for path, data in entries:
        if data.get("status") != "completed" or data.get("kind") != "time_scaled":
            continue
        rows = data.get("rows") or []
        if not rows:
            continue
        df = pd.DataFrame(rows).sort_values("time_limit")
        if df.empty:
            continue
        required_cols = {"time_limit", "white_win_rate", "black_win_rate", "draw_rate", "avg_moves"}
        if not required_cols.issubset(df.columns):
            missing = required_cols - set(df.columns)
            print(f"[warn] Skip {data.get('test_id')} (missing columns: {', '.join(sorted(missing))})")
            continue

        fig, axes = plt.subplots(
            2, 1, figsize=(8, 6), sharex=True, gridspec_kw={"height_ratios": [2, 1], "hspace": 0.08}
        )

        white = friendly_label(data.get("white_engine", "white"))
        black = friendly_label(data.get("black_engine", "black"))

        axes[0].plot(
            df["time_limit"],
            df["white_win_rate"] * 100,
            marker="o",
            label=f"{white} win %",
            color="#10b981",
        )
        axes[0].plot(
            df["time_limit"],
            df["black_win_rate"] * 100,
            marker="o",
            label=f"{black} win %",
            color="#ef4444",
        )
        axes[0].plot(df["time_limit"], df["draw_rate"] * 100, marker="o", label="Draw %", color="#94a3b8")
        axes[0].set_ylabel("Rate (%)")
        axes[0].set_ylim(0, 100)
        axes[0].grid(alpha=0.3, linestyle="--")
        axes[0].legend(loc="best", fontsize=9)

        axes[1].plot(df["time_limit"], df["avg_moves"], marker="s", color="#8b5cf6", label="Avg moves")
        axes[1].set_xlabel("Per-move time limit (s)")
        axes[1].set_ylabel("Avg moves")
        axes[1].grid(alpha=0.3, linestyle="--")

        fig.suptitle(f"Time-scaled benchmark: {white} vs {black}", fontsize=12)
        fig.tight_layout(rect=[0, 0, 1, 0.96])

        slug = f"{slugify(white)}_vs_{slugify(black)}"
        out_path = ts_dir / f"time_scaled_{slug}_{data.get('test_id')}.png"
        fig.savefig(out_path, dpi=200)
        plt.close(fig)

        updated = False
        if update_json and (force_update or not data.get("image_base64")):
            data["image_base64"] = encode_image(out_path)
            with path.open("w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            updated = True

        generated.append(
            {
                "test_id": data.get("test_id"),
                "white_engine": white,
                "black_engine": black,
                "output_path": str(out_path),
                "updated_json": updated,
            }
        )
        print(f"[ok] Time-scaled chart for {data.get('test_id')} -> {out_path} (update_json={updated})")

    if generated:
        index_path = ts_dir / "time_scaled_index.json"
        with index_path.open("w", encoding="utf-8") as f:
            json.dump(generated, f, ensure_ascii=False, indent=2)
        print(f"[ok] Wrote index {index_path}")

    return generated


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate charts from test results.")
    parser.add_argument("--tests-dir", default="tests", type=Path, help="Directory containing test JSON files.")
    parser.add_argument("--out-dir", default=Path("tools/charts"), type=Path, help="Output directory for charts.")
    parser.add_argument(
        "--update-json",
        action="store_true",
        help="Write generated time_scaled charts back into the source JSON (image_base64).",
    )
    parser.add_argument(
        "--force-update",
        action="store_true",
        help="Update JSON even if image_base64 already exists (only relevant with --update-json).",
    )
    args = parser.parse_args()

    tests_dir: Path = args.tests_dir
    out_dir: Path = args.out_dir

    entries = load_tests(tests_dir)
    if not entries:
        print("[warn] No test files found; nothing to do.")
        return

    generate_pairing_charts(entries, out_dir)
    generate_time_scaled_charts(entries, out_dir, update_json=args.update_json, force_update=args.force_update)


if __name__ == "__main__":
    main()
