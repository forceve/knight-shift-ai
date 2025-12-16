import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAiLevels, getTest, listMatches, listTests, runBatch, runMatch, runTimeBenchmark } from "../api";
import { AILevel, BatchTestSummary, MatchSummary } from "../types";

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

export default function M2MPage() {
  const PAGE_SIZE = 100;
  const [white, setWhite] = useState<AILevel>("level2");
  const [black, setBlack] = useState<AILevel>("level3");
  const [matchTimeLimit, setMatchTimeLimit] = useState<number>(1.2);
  const [batchWhite, setBatchWhite] = useState<AILevel>("level3");
  const [batchBlack, setBatchBlack] = useState<AILevel>("ultimate");
  const [games, setGames] = useState(6);
  const [swapColors, setSwapColors] = useState(true);
  const [maxMoves, setMaxMoves] = useState(200);
  const [batchTimeLimit, setBatchTimeLimit] = useState<number>(1.0);
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [matchPage, setMatchPage] = useState(1);
  const [matchTotal, setMatchTotal] = useState(0);
  const [tests, setTests] = useState<BatchTestSummary[]>([]);
  const [testPage, setTestPage] = useState(1);
  const [testTotal, setTestTotal] = useState(0);
  const [selectedTest, setSelectedTest] = useState<BatchTestSummary | null>(null);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testModalLoading, setTestModalLoading] = useState(false);
  const [availableLevels, setAvailableLevels] = useState<AILevel[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [benchmarkWhite, setBenchmarkWhite] = useState<AILevel>("mcts");
  const [benchmarkBlack, setBenchmarkBlack] = useState<AILevel>("mcts_cnn");
  const [timeLimitsInput, setTimeLimitsInput] = useState("0.3,0.6,1.0,1.5");
  const [gamesPerLimit, setGamesPerLimit] = useState(2);
  const [benchmarkMaxMoves, setBenchmarkMaxMoves] = useState(160);
  const [benchmarkSwap, setBenchmarkSwap] = useState(true);
  const [benchmarkTestId, setBenchmarkTestId] = useState<string | null>(null);
  const [benchmarkError, setBenchmarkError] = useState<string | null>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);

  const matchMap = useMemo(() => {
    const map: Record<string, MatchSummary> = {};
    matches.forEach((m) => {
      map[m.match_id] = m;
    });
    return map;
  }, [matches]);

  const benchmarkResult = useMemo(() => {
    if (!benchmarkTestId) return null;
    return tests.find((t) => t.test_id === benchmarkTestId) || null;
  }, [tests, benchmarkTestId]);

  const matchTotalPages = Math.max(1, Math.ceil(matchTotal / PAGE_SIZE));
  const testTotalPages = Math.max(1, Math.ceil(testTotal / PAGE_SIZE));

  const fetchMatches = async (page = matchPage) => {
    try {
      const data = await listMatches(page, PAGE_SIZE);
      setMatches(data.items);
      setMatchTotal(data.total);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTests = async (page = testPage) => {
    try {
      const data = await listTests(page, PAGE_SIZE);
      setTests(data.items);
      setTestTotal(data.total);
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
        setAvailableLevels(["level1", "level2", "level3", "level4", "ultimate", "mcts", "mcts_cnn"]);
      });
    fetchMatches(matchPage);
    fetchTests(testPage);
    const id = setInterval(() => {
      fetchMatches(matchPage);
      fetchTests(testPage);
    }, 4000);
    return () => clearInterval(id);
  }, [matchPage, testPage]);

  const startMatch = async () => {
    setLoading(true);
    try {
      const res = await runMatch({ white_engine: white, black_engine: black, max_moves: maxMoves, time_limit_white: matchTimeLimit, time_limit_black: matchTimeLimit });
      setMatchPage(1);
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
      const res = await runBatch({ white_engine: batchWhite, black_engine: batchBlack, games, swap_colors: swapColors, max_moves: maxMoves, time_limit_white: batchTimeLimit, time_limit_black: batchTimeLimit });
      setTestPage(1);
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

  const startBenchmark = async () => {
    const limits = timeLimitsInput
      .split(",")
      .map((v) => Number(v.trim()))
      .filter((v) => !Number.isNaN(v) && v > 0);
    if (limits.length === 0) {
      setBenchmarkError("Please provide at least one valid time limit (e.g. 0.3,0.6,1.0)");
      return;
    }
    setBenchmarkLoading(true);
    try {
      const res = await runTimeBenchmark({
        white_engine: benchmarkWhite,
        black_engine: benchmarkBlack,
        time_limits: limits,
        games_per_limit: gamesPerLimit,
        swap_colors: benchmarkSwap,
        max_moves: benchmarkMaxMoves,
      });
      setBenchmarkTestId(res.test_id);
      setTestPage(1);
      setBenchmarkError(null);
    } catch (err: any) {
      setBenchmarkError(err.message);
    } finally {
      setBenchmarkLoading(false);
    }
  };

  const openTestDetail = async (testId: string) => {
    setTestModalLoading(true);
    try {
      const data = await getTest(testId);
      setSelectedTest(data);
      setTestModalOpen(true);
    } catch (err) {
      console.error(err);
      setSelectedTest(null);
    } finally {
      setTestModalLoading(false);
    }
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
          <label className="flex items-center gap-2 text-sm text-slate-200 bg-white/5 rounded-lg px-3 py-2">
            <span>Per-move time (s)</span>
            <input
              type="number"
              min={0.1}
              max={30}
              step={0.1}
              value={matchTimeLimit}
              onChange={(e) => setMatchTimeLimit(Math.max(0.1, Math.min(30, Number(e.target.value))))}
              className="bg-transparent border border-white/10 rounded px-2 py-1 w-24 text-sm"
            />
            <span className="text-xs text-slate-500">Same limit for both engines.</span>
          </label>
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
          <label className="flex items-center gap-2 text-sm text-slate-200 bg-white/5 rounded-lg px-3 py-2">
            <span>Per-move time (s)</span>
            <input
              type="number"
              min={0.1}
              max={30}
              step={0.1}
              value={batchTimeLimit}
              onChange={(e) => setBatchTimeLimit(Math.max(0.1, Math.min(30, Number(e.target.value))))}
              className="bg-transparent border border-white/10 rounded px-2 py-1 w-24 text-sm"
            />
          </label>
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

      <div className="card p-4 space-y-3 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-100">Time-scaled Benchmark</div>
          <span className="text-xs text-slate-500">Runs background sweeps across time budgets and stores results.</span>
        </div>
        <div className="grid md:grid-cols-2 gap-2">
          <select value={benchmarkWhite} onChange={(e) => setBenchmarkWhite(e.target.value as AILevel)} className="bg-white/10 px-3 py-2 rounded-lg text-sm">
            {availableLevels.map((level) => (
              <option key={level} value={level}>
                White: {getLevelLabel(level)}
              </option>
            ))}
          </select>
          <select value={benchmarkBlack} onChange={(e) => setBenchmarkBlack(e.target.value as AILevel)} className="bg-white/10 px-3 py-2 rounded-lg text-sm">
            {availableLevels.map((level) => (
              <option key={level} value={level}>
                Black: {getLevelLabel(level)}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-200 bg-white/5 rounded-lg px-3 py-2">
            <span>Time limits (s)</span>
            <input
              type="text"
              value={timeLimitsInput}
              onChange={(e) => setTimeLimitsInput(e.target.value)}
              className="bg-transparent border border-white/10 rounded px-2 py-1 flex-1 text-sm"
              placeholder="0.3,0.6,1.0"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-200 bg-white/5 rounded-lg px-3 py-2">
            <span>Games per limit</span>
            <input
              type="number"
              min={1}
              max={20}
              value={gamesPerLimit}
              onChange={(e) => setGamesPerLimit(Math.max(1, Math.min(20, Number(e.target.value))))}
              className="bg-transparent border border-white/10 rounded px-2 py-1 w-28 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-200 bg-white/5 rounded-lg px-3 py-2">
            <span>Max moves</span>
            <input
              type="number"
              min={50}
              max={400}
              value={benchmarkMaxMoves}
              onChange={(e) => setBenchmarkMaxMoves(Math.max(50, Math.min(400, Number(e.target.value))))}
              className="bg-transparent border border-white/10 rounded px-2 py-1 w-28 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" checked={benchmarkSwap} onChange={(e) => setBenchmarkSwap(e.target.checked)} className="accent-accent" />
            Swap colors each alternate game
          </label>
        </div>
        <button
          className="bg-hint/70 text-midnight font-semibold rounded-lg py-2 hover:brightness-105 disabled:opacity-50"
          onClick={startBenchmark}
          disabled={benchmarkLoading}
        >
          {benchmarkLoading ? "Running benchmark..." : "Run time-scaled benchmark"}
        </button>
        {benchmarkError && <div className="text-xs text-red-300">{benchmarkError}</div>}
        <div className="text-xs text-slate-500">Runs in background; progress and saved files appear in the Test Packages list.</div>
        {benchmarkResult && benchmarkResult.rows && benchmarkResult.image_base64 && (
          <div className="space-y-3">
            <img src={`data:image/png;base64,${benchmarkResult.image_base64}`} alt="Time benchmark chart" className="rounded-lg border border-white/10" />
            <div className="text-xs text-slate-300">
              {benchmarkResult.rows.map((row) => (
                <div key={row.time_limit} className="flex flex-wrap gap-3">
                  <span className="pill bg-white/10">t={row.time_limit}s</span>
                  <span>White wins: {row.results.white}</span>
                  <span>Black wins: {row.results.black}</span>
                  <span>Draws: {row.results.draw}</span>
                  <span>Avg moves: {row.avg_moves.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
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
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {matches.map((m) => (
                <div key={m.match_id} className="bg-white/5 rounded p-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-100">
                      {m.white_engine} vs {m.black_engine}
                    </div>
                    <div className="text-slate-400 text-sm">
                      {m.status} {m.winner ? `| Winner ${m.winner}` : ""} | Moves {m.moves} {m.time_limit_white ? `| t=${m.time_limit_white}s` : ""}
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
          <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
            <div>
              Page {matchPage} / {matchTotalPages} (total {matchTotal})
            </div>
            <div className="flex gap-2">
              <button
                className="bg-white/10 px-2 py-1 rounded disabled:opacity-40"
                disabled={matchPage <= 1}
                onClick={() => setMatchPage(Math.max(1, matchPage - 1))}
              >
                Prev
              </button>
              <button
                className="bg-white/10 px-2 py-1 rounded disabled:opacity-40"
                disabled={matchPage >= matchTotalPages}
                onClick={() => setMatchPage(Math.min(matchTotalPages, matchPage + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-slate-100">Test Packages (Batch & Time-scaled)</div>
            <button className="text-xs text-hint hover:text-slate-100" onClick={fetchTests}>
              Refresh
            </button>
          </div>
          {tests.length === 0 ? (
            <div className="text-sm text-slate-400">No test packages yet.</div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {tests.map((t) => {
                const totalGames = t.total_games || t.games;
                const pct = totalGames > 0 ? Math.min(100, (t.completed / totalGames) * 100) : 0;
                const label = t.kind === "time_scaled" ? "Time-scaled Benchmark" : "Batch Test";
                return (
                  <button
                    key={t.test_id}
                    className="bg-white/5 rounded p-3 space-y-2 w-full text-left hover:bg-white/10 transition"
                    onClick={() => openTestDetail(t.test_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-100 flex items-center gap-2">
                        <span className="pill bg-white/10">{label}</span>
                        <span>
                          {t.white_engine} vs {t.black_engine}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">{new Date(t.created_at).toLocaleTimeString()}</div>
                    </div>
                    <div className="text-sm text-slate-300 flex items-center gap-2">
                      <span
                        className={`pill ${
                          t.status === "running"
                            ? "bg-amber-500/40 text-amber-50 animate-pulse"
                            : t.status === "queued"
                            ? "bg-blue-500/40 text-blue-50"
                            : t.status === "completed"
                            ? "bg-green-500/40 text-green-50"
                            : "bg-white/10"
                        }`}
                      >
                        {t.status === "running"
                          ? "Running"
                          : t.status === "queued"
                          ? "Queued"
                          : t.status === "completed"
                          ? "Completed"
                          : t.status}
                      </span>
                      <span>
                        {t.completed}/{totalGames} games
                      </span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                      <div className="bg-accent h-2" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-xs text-slate-400">
                      Results - White: {t.results.white} | Black: {t.results.black} | Draw: {t.results.draw}
                    </div>
                    <div className="text-xs text-slate-500">
                      Swap colors: {t.swap_colors ? "On" : "Off"} | Max moves: {t.max_moves} {t.time_limit_white ? `| t=${t.time_limit_white}s` : ""}
                    </div>
                    {t.kind === "time_scaled" && (
                      <div className="text-xs text-slate-400">
                        Time limits: {t.time_limits?.join(", ")} | Games/limit: {t.games_per_limit}
                      </div>
                    )}
                    {t.kind === "time_scaled" && t.rows && (
                      <div className="text-xs text-slate-400 flex flex-wrap gap-2">
                        {t.rows.map((row) => (
                          <span key={row.time_limit} className="pill bg-white/10">
                            t={row.time_limit}s W:{row.results.white} B:{row.results.black} D:{row.results.draw}
                          </span>
                        ))}
                      </div>
                    )}
                    {t.kind === "time_scaled" && t.image_base64 && (
                      <img src={`data:image/png;base64,${t.image_base64}`} alt="Time-scaled benchmark chart" className="rounded border border-white/10" />
                    )}
                    {t.kind === "batch" && (
                      <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                        {t.matches.length === 0 ? (
                          <span className="text-slate-500">No finished games yet.</span>
                        ) : (
                          t.matches.map((mid) => {
                            const match = matchMap[mid];
                            const labelText = match ? `${match.winner ? `${match.winner} wins` : match.status} | ${match.moves} moves` : "View match";
                            return (
                              <Link key={mid} to={`/replay/${mid}`} className="bg-white/10 px-2 py-1 rounded hover:bg-white/20">
                                {labelText}
                              </Link>
                            );
                          })
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
            <div>
              Page {testPage} / {testTotalPages} (total {testTotal})
            </div>
            <div className="flex gap-2">
              <button
                className="bg-white/10 px-2 py-1 rounded disabled:opacity-40"
                disabled={testPage <= 1}
                onClick={() => setTestPage(Math.max(1, testPage - 1))}
              >
                Prev
              </button>
              <button
                className="bg-white/10 px-2 py-1 rounded disabled:opacity-40"
                disabled={testPage >= testTotalPages}
                onClick={() => setTestPage(Math.min(testTotalPages, testPage + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {testModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 flex items-center justify-center px-4">
          <div className="card max-w-3xl w-full p-6 space-y-3 relative">
            <button className="absolute top-3 right-3 text-slate-400 hover:text-white" onClick={() => setTestModalOpen(false)}>
              ✕
            </button>
            {testModalLoading && <div className="text-sm text-slate-300">Loading...</div>}
            {!testModalLoading && selectedTest && (
              <>
                <div className="flex items-center gap-2">
                  <span className="pill bg-white/10">{selectedTest.kind === "time_scaled" ? "Time-scaled Benchmark" : "Batch Test"}</span>
                  <div className="font-semibold text-slate-100">
                    {selectedTest.white_engine} vs {selectedTest.black_engine}
                  </div>
                </div>
                <div className="text-sm text-slate-300 flex items-center gap-2 flex-wrap">
                  <span>Status:</span>
                  <span
                    className={`pill ${
                      selectedTest.status === "running"
                        ? "bg-amber-500/40 text-amber-50 animate-pulse"
                        : selectedTest.status === "queued"
                        ? "bg-blue-500/40 text-blue-50"
                        : selectedTest.status === "completed"
                        ? "bg-green-500/40 text-green-50"
                        : "bg-white/10"
                    }`}
                  >
                    {selectedTest.status === "running"
                      ? "Running"
                      : selectedTest.status === "queued"
                      ? "Queued"
                      : selectedTest.status === "completed"
                      ? "Completed"
                      : selectedTest.status}
                  </span>
                  <span>| Progress: {selectedTest.completed}/{selectedTest.total_games}</span>
                  <span>| Max moves: {selectedTest.max_moves}</span>
                </div>
                <div className="text-xs text-slate-400">
                  Results - W:{selectedTest.results.white} B:{selectedTest.results.black} D:{selectedTest.results.draw} | Swap colors:{" "}
                  {selectedTest.swap_colors ? "On" : "Off"} {selectedTest.time_limit_white ? `| t=${selectedTest.time_limit_white}s` : ""}
                </div>
                {selectedTest.kind === "time_scaled" && (
                  <div className="space-y-2">
                    <div className="text-xs text-slate-400">Time limits: {selectedTest.time_limits?.join(", ")} | Games/limit: {selectedTest.games_per_limit}</div>
                    {selectedTest.rows && (
                      <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                        {selectedTest.rows.map((row) => (
                          <span key={row.time_limit} className="pill bg-white/10">
                            t={row.time_limit}s W:{row.results.white} B:{row.results.black} D:{row.results.draw}
                          </span>
                        ))}
                      </div>
                    )}
                    {selectedTest.image_base64 && (
                      <img src={`data:image/png;base64,${selectedTest.image_base64}`} alt="Time-scaled benchmark chart" className="rounded border border-white/10" />
                    )}
                  </div>
                )}
                {selectedTest.kind === "batch" && (
                  <div className="text-xs text-slate-300 flex flex-wrap gap-2">
                    {selectedTest.matches.length === 0 ? (
                      <span className="text-slate-500">No finished games yet.</span>
                    ) : (
                      selectedTest.matches.map((mid) => (
                        <Link key={mid} to={`/replay/${mid}`} className="bg-white/10 px-2 py-1 rounded hover:bg-white/20">
                          {mid}
                        </Link>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
