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
  color,
  setColor,
  onNewGame,
  onResign,
  onAiMove,
  disableAiMove,
}: {
  mode: GameMode;
  setMode: (m: GameMode) => void;
  aiLevel: AILevel;
  setAiLevel: (l: AILevel) => void;
  color: PlayerColor;
  setColor: (c: PlayerColor) => void;
  onNewGame: () => void;
  onResign: () => void;
  onAiMove: () => void;
  disableAiMove: boolean;
}) {
  const [availableLevels, setAvailableLevels] = useState<AILevel[]>([]);

  useEffect(() => {
    getAiLevels()
      .then((data) => setAvailableLevels(data.levels))
      .catch((err) => {
        console.error("Failed to fetch AI levels:", err);
        // Fallback to default levels if API fails
        setAvailableLevels(["level1", "level2", "level3", "ultimate"]);
      });
  }, []);

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <select value={mode} onChange={(e) => setMode(e.target.value as GameMode)} className="bg-white/10 px-3 py-2 rounded-lg text-sm">
          {modes.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <select
          value={aiLevel}
          onChange={(e) => setAiLevel(e.target.value as AILevel)}
          className="bg-white/10 px-3 py-2 rounded-lg text-sm"
          disabled={mode === "h2h"}
        >
          {availableLevels.map((level) => (
            <option key={level} value={level}>
              {getLevelLabel(level)}
            </option>
          ))}
        </select>
        <select value={color} onChange={(e) => setColor(e.target.value as PlayerColor)} className="bg-white/10 px-3 py-2 rounded-lg text-sm">
          {colors.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
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
