import { useEffect, useState } from "react";
import { API_BASE } from "../api";
import { HistoryEntry } from "../types";

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/history`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setItems(data);
      } catch (err: any) {
        setError(err.message);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="pill">History</div>
      <h2 className="text-2xl font-semibold text-slate-50">Recent Games & M2M Matches</h2>
      {error && <div className="text-sm text-red-300">Error: {error}</div>}
      <div className="card p-4 space-y-2">
        {items.length === 0 ? (
          <div className="text-sm text-slate-400">No history yet.</div>
        ) : (
          items.map((h) => (
            <div key={h.id} className="bg-white/5 rounded p-3 flex justify-between items-center">
              <div>
                <div className="text-slate-100 font-semibold">
                  {h.kind === "m2m" ? `${h.white_engine} vs ${h.black_engine}` : `${h.mode?.toUpperCase() ?? "GAME"}`}
                </div>
                <div className="text-sm text-slate-400">
                  Result: {h.winner ? `${h.winner} wins` : "draw"} {h.result_reason ? `(${h.result_reason})` : ""} • Moves {h.moves}
                </div>
              </div>
              <div className="text-xs text-slate-500">{new Date(h.created_at).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
