import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="card p-8 lg:p-10 flex flex-col lg:flex-row gap-6 items-center">
        <div className="flex-1 space-y-4">
          <div className="text-sm uppercase tracking-[0.3em] text-slate-400">AI Workshop</div>
          <h1 className="text-3xl font-bold text-slate-50">Play, Compare, and Replay Chess Engines</h1>
          <p className="text-slate-300 max-w-2xl">
            Knight Shift AI delivers Human vs Human, Human vs Machine, and Machine vs Machine modes with multiple engine difficulty levels.
            Launch a game, run AI vs AI comparisons, or jump into a replay.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link to="/play" className="bg-accent text-midnight font-semibold px-4 py-2 rounded-lg hover:brightness-110 transition">
              Play vs AI
            </Link>
            <Link to="/m2m" className="bg-white/10 text-slate-100 px-4 py-2 rounded-lg hover:bg-white/20 transition">
              AI vs AI & Tests
            </Link>
          </div>
        </div>
        <div className="flex-1">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-hint/20 via-midnight to-accent/10 p-6 shadow-glow">
            <h3 className="text-lg font-semibold mb-3 text-slate-100">Features</h3>
            <ul className="space-y-2 text-slate-300">
              <li>• H2H, H2M, M2M with 4 engine levels</li>
              <li>• Move history, status, check highlights</li>
              <li>• Batch AI comparisons and replay viewer</li>
              <li>• FastAPI backend + React/Tailwind frontend</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="pill mb-2">Play</div>
          <h3 className="text-lg font-semibold text-slate-100 mb-2">Game Board</h3>
          <p className="text-slate-400 text-sm">Start new games, pick your color and AI level, see status and move list.</p>
        </div>
        <div className="card p-5">
          <div className="pill mb-2">M2M</div>
          <h3 className="text-lg font-semibold text-slate-100 mb-2">AI vs AI</h3>
          <p className="text-slate-400 text-sm">Run quick engine matchups and review results in the match list.</p>
        </div>
        <div className="card p-5">
          <div className="pill mb-2">Replay</div>
          <h3 className="text-lg font-semibold text-slate-100 mb-2">Game Replay</h3>
          <p className="text-slate-400 text-sm">Step through completed M2M games move by move to analyze play.</p>
        </div>
      </section>
    </div>
  );
}
