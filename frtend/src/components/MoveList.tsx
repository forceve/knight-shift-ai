import { GameState } from "../types";

export function MoveList({ moves }: { moves: string[] }) {
  const rows = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({ idx: i / 2 + 1, white: moves[i], black: moves[i + 1] });
  }
  return (
    <div className="card p-4 h-full max-h-64 overflow-y-auto">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-100">Move List</h3>
        <span className="pill">SAN</span>
      </div>
      <div className="space-y-2 text-sm">
        {rows.map((row) => (
          <div key={row.idx} className="flex justify-between bg-white/5 rounded px-2 py-1">
            <span className="text-slate-400 w-6">#{row.idx}</span>
            <span className="w-24">{row.white}</span>
            <span className="w-24 text-right">{row.black || ""}</span>
          </div>
        ))}
        {moves.length === 0 && <div className="text-slate-500 text-xs">No moves yet.</div>}
      </div>
    </div>
  );
}
