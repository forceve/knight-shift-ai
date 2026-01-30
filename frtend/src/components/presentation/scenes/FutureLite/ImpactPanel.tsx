import { FutureLitePayload } from "../../../../data/presentation";

type Props = {
  impact: FutureLitePayload["impact"];
  activeId: "opt" | "dda" | "gen" | null;
  beatIndex: number;
};

export default function ImpactPanel({ impact, activeId, beatIndex }: Props) {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-white/0 to-accent/5 opacity-50 pointer-events-none" />
      <div className="relative flex items-start justify-between mb-3">
        <div>
          <div className="text-sm font-semibold text-white">{impact.title}</div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Goal / Change / Why it matters</div>
        </div>
        <div
          className={`text-[10px] px-2 py-1 rounded-full border transition-all duration-300 ${
            beatIndex === 3 ? "border-accent text-white bg-accent/10 shadow-[0_0_18px_rgba(124,231,190,0.35)]" : "border-white/15 text-slate-300 bg-white/5"
          }`}
        >
          {impact.badge}
        </div>
      </div>
      <div className="relative space-y-2">
        {impact.rows.map((row) => {
          const isActive = activeId === row.id;
          const dimmed = activeId !== null && !isActive;
          const muted = beatIndex === 0;
          return (
            <div
              key={row.id}
              className={`grid grid-cols-[150px,170px,1fr] gap-3 rounded-xl border px-3 py-2 transition-all duration-300
                ${isActive ? "border-accent bg-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.25)]" : "border-white/10 bg-white/5"}
                ${dimmed ? "opacity-70" : "opacity-100"}
                ${muted ? "opacity-80" : ""}`}
            >
              <ImpactCell label="Goal" value={row.goal} />
              <ImpactCell label="Change" value={row.change} />
              <ImpactCell label="Why it matters" value={row.why} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ImpactCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-[13px] leading-snug text-slate-100">{value}</div>
    </div>
  );
}
