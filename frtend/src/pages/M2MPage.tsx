import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAiLevels, listMatches, listTests, runBatch, runMatch } from "../api";
import { AILevel, BatchTestSummary, MatchSummary } from "../types";

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

export default function M2MPage() {
  const [white, setWhite] = useState<AILevel>("level2");
  const [black, setBlack] = useState<AILevel>("level3");
  const [batchWhite, setBatchWhite] = useState<AILevel>("level3");
  const [batchBlack, setBatchBlack] = useState<AILevel>("ultimate");
  const [games, setGames] = useState(6);
  const [swapColors, setSwapColors] = useState(true);
  const [maxMoves, setMaxMoves] = useState(200);
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [tests, setTests] = useState<BatchTestSummary[]>([]);
  const [availableLevels, setAvailableLevels] = useState<AILevel[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  const matchMap = useMemo(() => {
    const map: Record<string, MatchSummary> = {};
    matches.forEach((m) => {
      map[m.match_id] = m;
    });
    return map;
  }, [matches]);

  const fetchMatches = async () => {
    try {
      const data = await listMatches();
      setMatches(data.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTests = async () => {
    try {
      const data = await listTests();
      setTests(data.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    getAiLevels()
      .then((data) => setAvailableLevels(data.levels))
      .catch((err) => {
        console.error("Failed to fetch AI levels:", err);
        // Fallback to default levels if API fails
        setAvailableLevels(["level1", "level2", "level3", "ultimate"]);
      });
    fetchMatches();
    fetchTests();
    const id = setInterval(() => {
      fetchMatches();
      fetchTests();
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const startMatch = async () => {
    setLoading(true);
    try {
      const res = await runMatch({ white_engine: white, black_engine: black, max_moves: 200 });
      setMatches((prev) => [res, ...prev]);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startBatch = async () => {
    setBatchLoading(true);
    try {
      const res = await runBatch({ white_engine: batchWhite, black_engine: batchBlack, games, swap_colors: swapColors, max_moves: maxMoves });
      setTests((prev) => [res, ...prev.filter((t) => t.test_id !== res.test_id)]);
      setBatchError(null);
    } catch (err: any) {
      setBatchError(err.message);
    } finally {
      setBatchLoading(false);
    }
  };

  const onGamesChange = (value: string) => {
    const next = Number(value);
    if (Number.isNaN(next)) return;
    setGames(Math.min(50, Math.max(1, next)));
  };

  const onMaxMovesChange = (value: string) => {
    const next = Number(value);
    if (Number.isNaN(next)) return;
    setMaxMoves(Math.min(500, Math.max(50, next)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="pill mb-2">M2M Page</div>
          <h2 className="text-2xl font-semibold text-slate-50">Machine vs Machine & Tests</h2>
          <p className="text-slate-400 text-sm">Launch AI vs AI matches, queue batch tests, and open replays.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-4 space-y-3 shadow-lg shadow-black/20">
          <div className="text-sm font-semibold text-slate-100">Start a Match</div>
          <div className="flex gap-2">
            <select value={white} onChange={(e) => setWhite(e.target.value as AILevel)} className="bg-white/10 px-3 py-2 rounded-lg text-sm flex-1">
              {availableLevels.map((level) => (
                <option key={level} value={level}>
                  White: {getLevelLabel(level)}
                </option>
              ))}
            </select>
            <select value={black} onChange={(e) => setBlack(e.target.value as AILevel)} className="bg-white/10 px-3 py-2 rounded-lg text-sm flex-1">
              {availableLevels.map((level) => (
                <option key={level} value={level}>
                  Black: {getLevelLabel(level)}
                </option>
              ))}
            </select>
          </div>
          <button
            className="bg-accent text-midnight font-semibold rounded-lg py-2 hover:brightness-110 disabled:opacity-50"
            onClick={startMatch}
            disabled={loading}
          >
            {loading ? "Running..." : "Start Match"}
          </button>
          {error && <div className="text-xs text-red-300">Error: {error}</div>}
          <div className="text-xs text-slate-500">Matches are executed immediately and stored in memory.</div>
        </div>

        <div className="card p-4 space-y-3 shadow-lg shadow-black/20">
          <div className="text-sm font-semibold text-slate-100">Batch Test</div>
          <div className="grid sm:grid-cols-2 gap-2">
            <select value={batchWhite} onChange={(e) => setBatchWhite(e.target.value as AILevel)} className="bg-white/10 px-3 py-2 rounded-lg text-sm">
              {availableLevels.map((level) => (
                <option key={level} value={level}>
                  White: {getLevelLabel(level)}
                </option>
              ))}
            </select>
            <select value={batchBlack} onChange={(e) => setBatchBlack(e.target.value as AILevel)} className="bg-white/10 px-3 py-2 rounded-lg text-sm">
              {availableLevels.map((level) => (
                <option key={level} value={level}>
                  Black: {getLevelLabel(level)}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-200 bg-white/5 rounded-lg px-3 py-2">
              <span>Games</span>
              <input
                type="number"
                min={1}
                max={50}
                value={games}
                onChange={(e) => onGamesChange(e.target.value)}
                className="bg-transparent border border-white/10 rounded px-2 py-1 w-20 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-200 bg-white/5 rounded-lg px-3 py-2">
              <span>Max moves</span>
              <input
                type="number"
                min={50}
                max={500}
                value={maxMoves}
                onChange={(e) => onMaxMovesChange(e.target.value)}
                className="bg-transparent border border-white/10 rounded px-2 py-1 w-24 text-sm"
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" checked={swapColors} onChange={(e) => setSwapColors(e.target.checked)} className="accent-accent" />
            Swap colors every other game
          </label>
          <button
            className="bg-white text-midnight font-semibold rounded-lg py-2 hover:brightness-105 disabled:opacity-50"
            onClick={startBatch}
            disabled={batchLoading}
          >
            {batchLoading ? "Running batch..." : "Start Batch Test"}
          </button>
          {batchError && <div className="text-xs text-red-300">Error: {batchError}</div>}
          <div className="text-xs text-slate-500">Runs games in background, tracks results, and links to replays.</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-slate-100">Match List</div>
            <button className="text-xs text-hint hover:text-slate-100" onClick={fetchMatches}>
              Refresh
            </button>
          </div>
          {matches.length === 0 ? (
            <div className="text-sm text-slate-400">No matches yet.</div>
          ) : (
            <div className="space-y-2">
              {matches.map((m) => (
                <div key={m.match_id} className="bg-white/5 rounded p-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-100">
                      {m.white_engine} vs {m.black_engine}
                    </div>
                    <div className="text-slate-400 text-sm">
                      {m.status} {m.winner ? `| Winner ${m.winner}` : ""} | Moves {m.moves}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-slate-500">{new Date(m.created_at).toLocaleTimeString()}</div>
                    <Link to={`/replay/${m.match_id}`} className="text-xs bg-white/10 px-3 py-1 rounded hover:bg-white/20">
                      Replay
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-slate-100">Batch Tests</div>
            <button className="text-xs text-hint hover:text-slate-100" onClick={fetchTests}>
              Refresh
            </button>
          </div>
          {tests.length === 0 ? (
            <div className="text-sm text-slate-400">No batch tests yet.</div>
          ) : (
            <div className="space-y-2">
              {tests.map((t) => {
                const pct = t.games > 0 ? Math.min(100, (t.completed / t.games) * 100) : 0;
                return (
                  <div key={t.test_id} className="bg-white/5 rounded p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-100">
                        {t.white_engine} vs {t.black_engine}
                      </div>
                      <div className="text-xs text-slate-500">{new Date(t.created_at).toLocaleTimeString()}</div>
                    </div>
                    <div className="text-sm text-slate-300">
                      {t.status} | {t.completed}/{t.games} games
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                      <div className="bg-accent h-2" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-xs text-slate-400">
                      Results - White: {t.results.white} | Black: {t.results.black} | Draw: {t.results.draw}
                    </div>
                    <div className="text-xs text-slate-500">
                      Swap colors: {t.swap_colors ? "On" : "Off"} | Max moves: {t.max_moves}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                      {t.matches.length === 0 ? (
                        <span className="text-slate-500">No finished games yet.</span>
                      ) : (
                        t.matches.map((mid) => {
                          const match = matchMap[mid];
                          const label = match ? `${match.winner ? `${match.winner} wins` : match.status} | ${match.moves} moves` : "View match";
                          return (
                            <Link key={mid} to={`/replay/${mid}`} className="bg-white/10 px-2 py-1 rounded hover:bg-white/20">
                              {label}
                            </Link>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
