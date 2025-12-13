import { GameState } from "../types";

export function StatusBar({ state, isThinking, error }: { state: GameState | null; isThinking: boolean; error: string | null }) {
  return (
    <div className="card p-4 flex flex-col gap-2">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="pill">{state ? state.mode.toUpperCase() : "READY"}</span>
        {state?.ai_level && <span className="pill">AI {state.ai_level}</span>}
        {state?.player_color && <span className="pill">You: {state.player_color}</span>}
        {state?.in_check && <span className="pill bg-red-500/30 text-red-100">Check</span>}
        {isThinking && <span className="pill bg-amber-500/40 text-amber-50 animate-pulse">AI Thinking</span>}
      </div>
      <div className="text-slate-200 text-sm">
        {state
          ? state.status !== "in_progress"
            ? `Game finished: ${state.status} ${state.winner ? `- Winner ${state.winner}` : ""} (${state.result_reason ?? ""})`
            : `Turn: ${state.turn}`
          : "Create a game to start."}
      </div>
      {error && <div className="text-xs text-red-300">Error: {error}</div>}
    </div>
  );
}
