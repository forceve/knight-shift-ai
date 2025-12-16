import { useMemo } from "react";
import {
  AudiencePayload,
  BudgetPayload,
  FuturePayload,
  KnobPayload,
  LandscapePayload,
  LadderPayload,
  PresentationScene,
  SceneId,
  PipelinePayload,
  XRayPayload,
} from "../../data/presentation";
import { formatMs } from "./utils";

type Props = {
  scene: PresentationScene;
  sceneT: number;
  liteMode: boolean;
  audienceSelection: string | null;
  onSelectBranch: (branchId: string) => void;
};

export default function UIStage({ scene, sceneT, liteMode, audienceSelection, onSelectBranch }: Props) {
  const sceneProgress = Math.round(sceneT * 100);
  const panel = renderScenePanel(scene, { audienceSelection, onSelectBranch });

  return (
    <div className="presentation-overlay">
      <div className="overlay-left">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-400">
          <span className="pill">{scene.meta.badge}</span>
          {scene.meta.kicker && <span>{scene.meta.kicker}</span>}
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold text-slate-50">{scene.meta.title}</h1>
        <p className="text-base text-slate-200 max-w-2xl">{scene.meta.takeaway}</p>
        <div className="text-[11px] text-slate-400">Voiceover: {scene.meta.voiceoverHint}</div>

        <div className="mt-4 space-y-2">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-hint to-accent" style={{ width: `${sceneProgress}%` }} />
          </div>
          <div className="text-[11px] text-slate-400">
            Scene progress {sceneProgress}% · duration {formatMs(scene.meta.durationMs)} · Lite {liteMode ? "on" : "off"}
          </div>
        </div>
      </div>

      <div className="overlay-right">{panel}</div>
    </div>
  );
}

type PanelProps = { audienceSelection: string | null; onSelectBranch: (branchId: string) => void };

function renderScenePanel(scene: PresentationScene, props: PanelProps) {
  switch (scene.id) {
    case SceneId.Freeze: {
      const script = scene.payload.scripts[0];
      return (
        <div className="panel glass">
          <div className="panel-title">Freeze scripts</div>
          <div className="space-y-2">
            <div className="text-sm text-slate-100">
              {script.note} <span className="text-hint">L1 {script.l1Move} · ULT {script.ultMove}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-200">
              {scene.payload.scripts.slice(0, 4).map((s) => (
                <div key={s.fen} className="rounded-lg border border-white/10 p-2 bg-white/5">
                  <div className="font-semibold text-slate-50 text-sm">{s.note}</div>
                  <div className="text-[11px] text-hint">L1 {s.l1Move} / ULT {s.ultMove}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    case SceneId.Dial:
      return <DialPanel payload={scene.payload} />;
    case SceneId.Knobs:
      return <KnobsPanel payload={scene.payload} />;
    case SceneId.Ladder:
      return <LadderPanel payload={scene.payload} />;
    case SceneId.XRay:
      return <XrayPanel payload={scene.payload} />;
    case SceneId.Pipeline:
      return <PipelinePanel payload={scene.payload} />;
    case SceneId.Landscape:
      return <LandscapePanel payload={scene.payload} />;
    case SceneId.Audience:
      return <AudiencePanel payload={scene.payload} selection={props.audienceSelection} onSelect={props.onSelectBranch} />;
    case SceneId.Future:
      return <FuturePanel payload={scene.payload} />;
    case SceneId.Handoff:
      return (
        <div className="panel glass text-center">
          <div className="panel-title">{scene.payload.ctaText}</div>
          <div className="text-sm text-slate-300">Space will trigger route: {scene.payload.route}</div>
        </div>
      );
    default:
      return <div />;
  }
}

function DialPanel({ payload }: { payload: BudgetPayload }) {
  return (
    <div className="panel glass">
      <div className="panel-title">Budget dial levels</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {payload.levels.map((lvl) => (
          <div key={lvl.id} className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-1">
            <div className="text-xs uppercase tracking-wide text-slate-400">{lvl.id}</div>
            <div className="text-sm text-slate-50">{lvl.persona}</div>
            <div className="text-[11px] text-slate-300">Depth {lvl.depth} · Nodes {lvl.nodes.toLocaleString()}</div>
            <div className="text-[11px] text-hint">Time {lvl.timeMs} ms</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KnobsPanel({ payload }: { payload: KnobPayload }) {
  return (
    <div className="panel glass">
      <div className="panel-title">Four knobs per level</div>
      <div className="space-y-3">
        {payload.knobs.map((k) => (
          <div key={k.level} className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
            <div className="text-xs text-slate-400 uppercase tracking-wide">{k.level}</div>
            <KnobBar label="Horizon" value={k.horizon} />
            <KnobBar label="Efficiency" value={k.efficiency} />
            <KnobBar label="Eval richness" value={k.evalRichness} />
            <KnobBar label="Randomness" value={k.randomness} />
          </div>
        ))}
      </div>
    </div>
  );
}

const KnobBar = ({ label, value }: { label: string; value: number }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-[11px] text-slate-300">
      <span>{label}</span>
      <span className="text-slate-100 font-semibold">{Math.round(value)}</span>
    </div>
    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div className="h-full bg-gradient-to-r from-hint to-accent" style={{ width: `${value}%` }} />
    </div>
  </div>
);

function LadderPanel({ payload }: { payload: LadderPayload }) {
  return (
    <div className="panel glass">
      <div className="panel-title">Character ladder</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {payload.cards.map((c) => (
          <div key={c.level} className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-1">
            <div className="text-xs uppercase tracking-wide text-slate-400">{c.level}</div>
            <div className="text-sm font-semibold text-slate-50">{c.tag}</div>
            <div className="text-[11px] text-slate-300">{c.blurb}</div>
            <div className="text-[11px] text-hint">Signature: {c.move}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function XrayPanel({ payload }: { payload: XRayPayload }) {
  return (
    <div className="panel glass">
      <div className="panel-title">Search X-Ray frames</div>
      <div className="space-y-2">
        {payload.frames.slice(0, 5).map((f, idx) => (
          <div key={f.fen} className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="pill">#{idx + 1}</span>
              <span>PV {f.pv.join(" → ")}</span>
              <span className="text-hint">Pruned {Math.round(f.prunedRatio * 100)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PipelinePanel({ payload }: { payload: PipelinePayload }) {
  return (
    <div className="panel glass">
      <div className="panel-title">Pipeline</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          {payload.nodes.map((node: any) => (
            <div key={node.id} className="rounded-lg border border-white/10 bg-white/5 p-2">
              <div className="text-xs uppercase tracking-wide text-slate-400">{node.label}</div>
              <div className="text-sm text-slate-50">{node.blurb}</div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-1">
          <div className="text-xs uppercase tracking-wide text-slate-400">Summary card</div>
          <div className="text-sm text-slate-50">Matches: {payload.summaryCard.matches}</div>
          <div className="text-sm text-slate-50">Win rate: {payload.summaryCard.winrate}%</div>
          <div className="text-xs text-slate-300">{payload.summaryCard.notes}</div>
        </div>
      </div>
    </div>
  );
}

function LandscapePanel({ payload }: { payload: LandscapePayload }) {
  return (
    <div className="panel glass">
      <div className="panel-title">Round robin & cost-strength</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <table className="text-xs text-slate-200 w-full border-separate border-spacing-[6px]">
          <thead>
            <tr>
              <th />
              {["L1", "L2", "L3", "ULT"].map((l) => (
                <th key={l} className="text-center">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payload.roundRobin.map((row: number[], i: number) => (
              <tr key={i}>
                <td className="font-semibold text-slate-100">{["L1", "L2", "L3", "ULT"][i]}</td>
                {row.map((cell: number, j: number) => (
                  <td key={j} className="text-center bg-white/5 rounded-md px-2 py-1">
                    {cell}%
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="space-y-2">
          {payload.costStrengthPoints.map((p: any) => (
            <div key={p.level} className="rounded-lg border border-white/10 bg-white/5 p-2 text-sm text-slate-50 flex justify-between">
              <span>{p.level}</span>
              <span className="text-slate-300 text-xs">
                Cost {p.cost} · Strength {p.strength}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AudiencePanel({
  payload,
  selection,
  onSelect,
}: {
  payload: AudiencePayload;
  selection: string | null;
  onSelect: (branchId: string) => void;
}) {
  const active = useMemo(() => payload.branches.find((b) => b.id === selection) ?? payload.branches[0], [payload.branches, selection]);
  return (
    <div className="panel glass">
      <div className="panel-title">Audience picks a move</div>
      <div className="flex flex-wrap gap-2">
        {payload.branches.map((b) => (
          <button
            key={b.id}
            onClick={() => onSelect(b.id)}
            className={`px-3 py-2 rounded-lg border text-sm transition ${
              active.id === b.id ? "border-accent bg-accent text-midnight font-semibold" : "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
        <div className="text-sm font-semibold text-slate-50">
          {active.label} <span className="text-xs text-hint uppercase ml-2">{active.tag}</span>
        </div>
        <div className="text-xs text-slate-300">{active.verdict}</div>
        <div className="text-xs text-slate-300">Script: {active.moves.join(" → ")}</div>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-200">
          {active.perLevelEvals.map((p) => (
            <div key={p.level} className="rounded-md border border-white/10 bg-white/5 p-2 flex items-center justify-between">
              <span>{p.level}</span>
              <span className="text-hint">{p.eval}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FuturePanel({ payload }: { payload: FuturePayload }) {
  return (
    <div className="panel glass">
      <div className="panel-title">Future roadmap</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
          <div className="text-sm font-semibold text-slate-50">Dynamic ELO</div>
          <div className="text-xs text-slate-300">
            Fixed: {payload.eloCurveFixed.map((p) => p.y).join(" → ")}
          </div>
          <div className="text-xs text-hint">
            Dynamic: {payload.eloCurveDynamic.map((p) => p.y).join(" → ")}
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
          <div className="text-sm font-semibold text-slate-50">Style sliders</div>
          {payload.styleCard.sliders.map((s) => (
            <div key={s.label} className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span>{s.label}</span>
                <span className="text-slate-100 font-semibold">{s.value}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-hint to-accent" style={{ width: `${s.value}%` }} />
              </div>
            </div>
          ))}
          {payload.styleCard.notes.map((n) => (
            <div key={n} className="text-[11px] text-slate-400">
              · {n}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
