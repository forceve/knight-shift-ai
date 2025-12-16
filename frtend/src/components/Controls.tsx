import { useEffect, useState } from "react";
import { getAiLevels } from "../api";
import { AILevel, GameMode, PlayerColor } from "../types";

const modes: { value: GameMode; label: string }[] = [
  { value: "h2h", label: "Human vs Human" },
  { value: "h2m", label: "Human vs AI" },
  { value: "m2m", label: "AI vs AI" },
];

// Partial mapping for known levels - unknown levels will display as-is
const levelLabels: Partial<Record<string, string>> = {
  level1: "Level 1 (Easy)",
  level2: "Level 2 (Classic)",
  level3: "Level 3 (Hard)",
  level4: "Level 4 (Human-like)",
  ultimate: "Ultimate",
  mcts: "MCTS",
  mcts_cnn: "MCTS + CNN",
};

function getLevelLabel(level: string): string {
  return levelLabels[level] || level;
}

const colors: { value: PlayerColor; label: string }[] = [
  { value: "white", label: "White" },
  { value: "black", label: "Black" },
];

export function Controls({
  mode,
  setMode,
  aiLevel,
  setAiLevel,
  whiteEngine,
  setWhiteEngine,
  blackEngine,
  setBlackEngine,
  color,
  setColor,
  onNewGame,
  onResign,
  onAiMove,
  disableAiMove,
  aiTimeLimit,
  setAiTimeLimit,
}: {
  mode: GameMode;
  setMode: (m: GameMode) => void;
  aiLevel: AILevel;
  setAiLevel: (l: AILevel) => void;
  whiteEngine?: AILevel;
  setWhiteEngine?: (l: AILevel) => void;
  blackEngine?: AILevel;
  setBlackEngine?: (l: AILevel) => void;
  color: PlayerColor;
  setColor: (c: PlayerColor) => void;
  onNewGame: () => void;
  onResign: () => void;
  onAiMove: () => void;
  disableAiMove: boolean;
  aiTimeLimit: number;
  setAiTimeLimit: (t: number) => void;
}) {
  const [availableLevels, setAvailableLevels] = useState<AILevel[]>([]);

  useEffect(() => {
    getAiLevels()
      .then((data) => setAvailableLevels(data.levels))
      .catch((err) => {
        console.error("Failed to fetch AI levels:", err);
        // Fallback to default levels if API fails
        setAvailableLevels(["level1", "level2", "level3", "level4", "ultimate", "mcts", "mcts_cnn"]);
      });
  }, []);

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <select value={mode} onChange={(e) => setMode(e.target.value as GameMode)} className="bg-white/10 hover:bg-white/15 px-3 py-2 rounded-lg text-sm text-slate-100 border border-white/10 focus:border-white/20 focus:outline-none transition">
          {modes.map((m) => (
            <option key={m.value} value={m.value} className="bg-slate-800 text-slate-100">
              {m.label}
            </option>
          ))}
        </select>
        {mode === "m2m" ? (
          <>
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-400 px-2">White:</span>
              <select
                value={whiteEngine || aiLevel}
                onChange={(e) => setWhiteEngine?.(e.target.value as AILevel)}
                className="bg-white/10 hover:bg-white/15 px-3 py-2 rounded-lg text-sm text-slate-100 border border-white/10 focus:border-white/20 focus:outline-none transition"
              >
                {availableLevels.map((level) => (
                  <option key={level} value={level} className="bg-slate-800 text-slate-100">
                    {getLevelLabel(level)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-400 px-2">Black:</span>
              <select
                value={blackEngine || aiLevel}
                onChange={(e) => setBlackEngine?.(e.target.value as AILevel)}
                className="bg-white/10 hover:bg-white/15 px-3 py-2 rounded-lg text-sm text-slate-100 border border-white/10 focus:border-white/20 focus:outline-none transition"
              >
                {availableLevels.map((level) => (
                  <option key={level} value={level} className="bg-slate-800 text-slate-100">
                    {getLevelLabel(level)}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <select
            value={aiLevel}
            onChange={(e) => setAiLevel(e.target.value as AILevel)}
            className="bg-white/10 hover:bg-white/15 px-3 py-2 rounded-lg text-sm text-slate-100 border border-white/10 focus:border-white/20 focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={mode === "h2h"}
          >
            {availableLevels.map((level) => (
              <option key={level} value={level} className="bg-slate-800 text-slate-100">
                {getLevelLabel(level)}
              </option>
            ))}
          </select>
        )}
        {mode !== "m2m" && (
          <select value={color} onChange={(e) => setColor(e.target.value as PlayerColor)} className="bg-white/10 hover:bg-white/15 px-3 py-2 rounded-lg text-sm text-slate-100 border border-white/10 focus:border-white/20 focus:outline-none transition">
            {colors.map((c) => (
              <option key={c.value} value={c.value} className="bg-slate-800 text-slate-100">
                {c.label}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-200">
        <label className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg">
          <span>AI time (s)</span>
          <input
            type="number"
            min={0.1}
            max={30}
            step={0.1}
            value={aiTimeLimit}
            onChange={(e) => setAiTimeLimit(Math.max(0.1, Math.min(30, Number(e.target.value))))}
            className="bg-transparent border border-white/10 rounded px-2 py-1 w-24 text-sm"
          />
        </label>
        <span className="text-xs text-slate-500">Per-move limit for AI engines.</span>
      </div>
      <div className="flex gap-2">
        <button className="flex-1 bg-accent hover:brightness-110 text-midnight font-semibold rounded-lg py-2 transition" onClick={onNewGame}>
          New Game
        </button>
        <button className="flex-1 bg-white/10 hover:bg-white/20 text-slate-100 rounded-lg py-2" onClick={onResign}>
          Resign
        </button>
        <button className="flex-1 bg-hint/40 hover:bg-hint/60 text-slate-50 rounded-lg py-2 disabled:opacity-40" onClick={onAiMove} disabled={disableAiMove}>
          AI Move
        </button>
      </div>
    </div>
  );
}
