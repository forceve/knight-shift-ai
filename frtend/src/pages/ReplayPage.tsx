import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Chess } from "chess.js";
import { getMatch } from "../api";
import { MatchDetail } from "../types";
import { Chessboard } from "react-chessboard";

export default function ReplayPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ply, setPly] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(800); // ms per move

  useEffect(() => {
    const load = async () => {
      if (!matchId) return;
      try {
        const data = await getMatch(matchId);
        setDetail(data);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      }
    };
    load();
  }, [matchId]);

  const fen = useMemo(() => {
    const chess = new Chess();
    if (!detail) return chess.fen();
    for (let i = 0; i < Math.min(ply, detail.move_history.length); i++) {
      chess.move(detail.move_history[i], { sloppy: true });
    }
    return chess.fen();
  }, [detail, ply]);

  const go = (target: number) => {
    if (!detail) return;
    const bounded = Math.min(Math.max(target, 0), detail.move_history.length);
    setPly(bounded);
  };

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      if (!detail) return;
      setPly((p) => {
        if (p >= detail.move_history.length) {
          setPlaying(false);
          return p;
        }
        return p + 1;
      });
    }, speed);
    return () => clearInterval(id);
  }, [playing, speed, detail]);

  if (error) {
    return (
      <div className="card p-6 space-y-3">
        <div className="text-red-300 text-sm">Failed to load match: {error}</div>
        <Link to="/m2m" className="text-hint text-sm underline">
          Back to M2M list
        </Link>
      </div>
    );
  }

  if (!detail) {
    return <div className="text-slate-300">Loading replay...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="pill mb-2">Replay Page</div>
          <h2 className="text-2xl font-semibold text-slate-50">Match Replay</h2>
          <p className="text-slate-400 text-sm">Step through the selected AI vs AI game.</p>
        </div>
        <Link to="/m2m" className="text-sm text-hint underline">
          Back to M2M list
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 card p-4 flex flex-col items-center gap-4">
          <Chessboard
            id="replay-board"
            position={fen}
            boardOrientation="white"
            customBoardStyle={{ borderRadius: "16px", boxShadow: "0 10px 50px rgba(0,0,0,0.3)" }}
          />
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-white/10 rounded hover:bg-white/20 text-sm" onClick={() => go(0)}>
              ⏮ Start
            </button>
            <button className="px-3 py-1 bg-white/10 rounded hover:bg-white/20 text-sm" onClick={() => go(ply - 1)}>
              ◀ Prev
            </button>
            <div className="px-3 py-1 bg-white/5 rounded text-sm text-slate-300">
              Move {ply} / {detail.move_history.length}
            </div>
            <button className="px-3 py-1 bg-white/10 rounded hover:bg-white/20 text-sm" onClick={() => go(ply + 1)}>
              Next ▶
            </button>
            <button className="px-3 py-1 bg-white/10 rounded hover:bg-white/20 text-sm" onClick={() => go(detail.move_history.length)}>
              ⏭ End
            </button>
            <button
              className="px-3 py-1 bg-accent/30 text-accent rounded hover:bg-accent/40 text-sm"
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? "Pause" : "Auto Play"}
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <span>Speed:</span>
            <input
              type="range"
              min={200}
              max={1500}
              step={100}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            />
            <span>{(speed / 1000).toFixed(1)}s</span>
          </div>
        </div>
        <div className="card p-4 space-y-3">
          <div className="text-sm font-semibold text-slate-100">Match Info</div>
          <div className="text-slate-300 text-sm">
            <div>{detail.white_engine} vs {detail.black_engine}</div>
            <div>Status: {detail.status}</div>
            <div>
              Result: {detail.winner ? `${detail.winner} wins` : "draw"} {detail.result_reason ? `(${detail.result_reason})` : ""}
            </div>
            <div>Moves: {detail.moves}</div>
            <div className="text-slate-500 mt-2 text-xs">{new Date(detail.created_at).toLocaleString()}</div>
          </div>
          <div className="text-sm font-semibold text-slate-100 mt-4">Moves</div>
          <div className="space-y-1 text-sm max-h-64 overflow-y-auto bg-white/5 rounded p-2">
            {detail.move_history.map((m, idx) => (
              <button
                key={idx}
                onClick={() => go(idx + 1)}
                className={`w-full text-left px-2 py-1 rounded ${idx + 1 === ply ? "bg-accent/30 text-accent" : "hover:bg-white/10"}`}
              >
                {idx + 1}. {m}
              </button>
            ))}
            {detail.move_history.length === 0 && <div className="text-xs text-slate-500">No moves.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
