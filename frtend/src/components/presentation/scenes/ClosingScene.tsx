import { ClosingPayload } from "../../../data/presentation";

type Props = { payload: ClosingPayload; sceneT: number; onHandoff?: () => void };

export default function ClosingScene({ payload, sceneT, onHandoff }: Props) {
  const beatIndex = Math.min(1, Math.floor(sceneT * 2 + 0.0001));
  const emphasizeCTA = beatIndex >= 1;
  const heroProgress = Math.min(1, sceneT * 1.4);

  return (
    <div className="relative w-full h-full flex items-center justify-center px-8 py-10">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0b1224] via-[#0f172a] to-[#0b1224] pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_25%_25%,rgba(124,231,190,0.16),transparent_40%)]" />
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_75%_30%,rgba(143,168,255,0.18),transparent_38%)]" />
        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(120deg,rgba(255,255,255,0.08)_0%,transparent_18%,transparent_82%,rgba(255,255,255,0.06)_100%)]" />
      </div>

      <div className="relative max-w-5xl w-full space-y-8">
        <style>
          {`@keyframes pulse-soft { 0% { opacity: 0.92; } 50% { opacity: 1; } 100% { opacity: 0.92; } }`}
        </style>
        <div className="flex items-center justify-between">
          <div className="text-[12px] uppercase tracking-[0.28em] text-hint">{payload.headline}</div>
          {payload.footnote && <div className="text-xs text-slate-400">{payload.footnote}</div>}
        </div>

        <div
          className="text-4xl md:text-5xl font-black tracking-tight text-white drop-shadow-lg leading-tight transition-transform duration-500"
          style={{ opacity: heroProgress, transform: `translateY(${(1 - heroProgress) * 6}px)` }}
        >
          {payload.hero}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {payload.recap.map((line, idx) => (
            <div
              key={line}
              className={`rounded-2xl border px-4 py-3 bg-white/5 backdrop-blur-sm transition-all duration-300 ${
                emphasizeCTA ? "border-accent/70 shadow-[0_12px_30px_rgba(0,0,0,0.25)]" : "border-white/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-sm text-white font-semibold">
                  {idx + 1}
                </div>
                <div className="text-sm text-slate-100 leading-snug">{line}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <button
            onClick={() => onHandoff?.()}
            style={emphasizeCTA ? { animation: "pulse-soft 2600ms ease-in-out infinite" } : undefined}
            className={`px-6 py-3 rounded-2xl border text-base font-semibold text-white transition-all duration-300 shadow-lg
              bg-gradient-to-r from-accent/80 to-hint/70 border-accent/60 hover:from-accent hover:to-hint hover:shadow-[0_14px_40px_rgba(124,231,190,0.25)]
              ${emphasizeCTA ? "scale-[1.04] opacity-100" : "opacity-95"}`}
          >
            {payload.cta}
          </button>
          {payload.footnote && <div className="text-xs text-slate-400">Thanks / {payload.footnote}</div>}
        </div>
      </div>
    </div>
  );
}
