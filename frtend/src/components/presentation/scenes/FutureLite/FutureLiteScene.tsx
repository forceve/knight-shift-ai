import { FutureLitePayload } from "../../../../data/presentation";
import FutureCards from "./FutureCards";
import ImpactPanel from "./ImpactPanel";

type Props = { payload: FutureLitePayload; sceneT: number };

export default function FutureLiteScene({ payload, sceneT }: Props) {
  const beatIndex = Math.min(3, Math.floor(sceneT * 4 + 0.0001));
  const activeId: "opt" | "dda" | "gen" | null =
    beatIndex === 1 ? "opt" : beatIndex === 2 ? "dda" : beatIndex === 3 ? "gen" : null;
  const exitFade = sceneT >= 0.75 ? Math.max(0, 1 - (sceneT - 0.75) / 0.25) : 1;

  return (
    <div className="relative w-full h-full flex items-center justify-center px-8 py-10" style={{ opacity: exitFade }}>
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#0b1224] to-[#0f172a] opacity-90 pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,231,190,0.08),transparent_35%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(143,168,255,0.08),transparent_32%)]" />
      </div>
      <div className="relative max-w-6xl w-full space-y-6">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[12px] uppercase tracking-[0.3em] text-hint">{payload.headline}</div>
            <div className="text-lg text-slate-200">{payload.subline}</div>
          </div>
          <div className="text-[11px] text-slate-400">Beat {beatIndex} / 3</div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          <div className="lg:basis-[42%] space-y-3">
            <FutureCards cards={payload.cards} activeId={activeId} beatIndex={beatIndex} />
          </div>
          <div className="lg:basis-[58%]">
            <ImpactPanel impact={payload.impact} activeId={activeId} beatIndex={beatIndex} />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
          <div className="text-base text-white font-semibold">{payload.punch}</div>
          <div className={`text-xs text-hint transition-opacity duration-500 ${beatIndex >= 3 ? "opacity-100" : "opacity-70"}`}>
            {payload.bridge}
          </div>
        </div>
      </div>
    </div>
  );
}
