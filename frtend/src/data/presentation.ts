export const MAIN_THESIS = "Difficulty is a computation budget.";

export type ThesisMode = "hero" | "echo" | "punch";
export type ThesisEffect = "glow" | "split" | "stamp" | "write";

export type ThesisCue = {
  mode: ThesisMode;
  headline?: string;
  subline?: string;
  emphasize?: string[];
  effect?: ThesisEffect;
  durationMs?: number;
  chapterTag?: string;
};

export type SceneBeat = { t: number; label?: string; snap?: boolean };

export enum SceneId {
  Ambient = "scene0",
  Freeze = "scene1",
  Dial = "scene2",
  Knobs = "scene3",
  Ladder = "scene4",
  XRay = "scene5",
  Pipeline = "scene6",
  Landscape = "scene7",
  Audience = "scene8",
  Future = "scene9",
  Handoff = "scene10",
}

export type SceneMeta = {
  title: string;
  badge: string;
  kicker?: string;
  durationMs: number;
  takeaway: string;
  voiceoverHint: string;
  liteSafe?: boolean;
  thesisCue?: ThesisCue;
  beats?: SceneBeat[];
};

export type AmbientPayload = {
  gridNoiseParams: { scale: number; amplitude: number };
  particleCount: number;
  lightSweep: { speed: number; width: number };
  cameraSway: { amplitude: number; speed: number };
};

export type MoveHighlight = { from: string; to: string; color?: string; label?: string };
export type FreezeScript = {
  fen: string;
  l1Move: string;
  ultMove: string;
  highlights: MoveHighlight[];
  note: string;
};
export type FreezePayload = { scripts: FreezeScript[] };

export type BudgetProfile = {
  id: "L1" | "L2" | "L3" | "ULT";
  depth: number;
  nodes: number;
  timeMs: number;
  persona: string;
  dialAngle: number;
};
export type BudgetPayload = { levels: BudgetProfile[]; dialLabel: string };

export type KnobProfile = {
  level: BudgetProfile["id"];
  horizon: number;
  efficiency: number;
  evalRichness: number;
  randomness: number;
};
export type KnobPayload = { knobs: KnobProfile[] };

export type LadderCard = {
  level: BudgetProfile["id"];
  fen: string;
  move: string;
  tag: string;
  blurb: string;
};
export type LadderPayload = { cards: LadderCard[] };

export type XRayFrame = {
  fen: string;
  pv: string[];
  prunedRatio: number;
  heatSquares: string[];
};
export type XRayPayload = { frames: XRayFrame[] };

export type PipelineNode = { id: string; label: string; blurb: string };
export type PipelinePayload = { nodes: PipelineNode[]; summaryCard: { matches: number; winrate: number; notes: string } };

export type LandscapePayload = {
  roundRobin: number[][];
  costStrengthPoints: { level: BudgetProfile["id"]; cost: number; strength: number }[];
  heightmap: number[];
};

export type AudienceBranch = {
  id: string;
  label: string;
  moves: string[];
  verdict: string;
  tag: string;
  perLevelEvals: { level: BudgetProfile["id"]; eval: string }[];
};
export type AudiencePayload = { fen: string; branches: AudienceBranch[] };

export type FuturePayload = {
  eloCurveFixed: { x: number; y: number }[];
  eloCurveDynamic: { x: number; y: number }[];
  styleCard: { sliders: { label: string; value: number }[]; notes: string[] };
};

export type HandoffPayload = { ctaText: string; route: string };

export type SceneBase<T extends SceneId, P> = {
  id: T;
  meta: SceneMeta;
  payload: P;
};

export type PresentationScene =
  | SceneBase<SceneId.Ambient, AmbientPayload>
  | SceneBase<SceneId.Freeze, FreezePayload>
  | SceneBase<SceneId.Dial, BudgetPayload>
  | SceneBase<SceneId.Knobs, KnobPayload>
  | SceneBase<SceneId.Ladder, LadderPayload>
  | SceneBase<SceneId.XRay, XRayPayload>
  | SceneBase<SceneId.Pipeline, PipelinePayload>
  | SceneBase<SceneId.Landscape, LandscapePayload>
  | SceneBase<SceneId.Audience, AudiencePayload>
  | SceneBase<SceneId.Future, FuturePayload>
  | SceneBase<SceneId.Handoff, HandoffPayload>;

export const presentationScenes: PresentationScene[] = [
  {
    id: SceneId.Ambient,
    meta: {
      title: "Pre-show Ambient",
      badge: "Scene 0",
      kicker: "Set the stage before you speak",
      durationMs: 5200,
      takeaway: "Low-key procedural grid + particles; you are inside a product, not a slide.",
      voiceoverHint: "Let the room settle; no narration needed.",
      liteSafe: true,
      thesisCue: {
        mode: "hero",
        headline: MAIN_THESIS,
        subline: "Budget ladder as a product",
        effect: "glow",
      },
      beats: [
        { t: 0, label: "Idle" },
        { t: 0.4, label: "Light sweep" },
        { t: 0.8, label: "Particles" },
      ],
    },
    payload: {
      gridNoiseParams: { scale: 0.8, amplitude: 0.35 },
      particleCount: 540,
      lightSweep: { speed: 0.18, width: 0.45 },
      cameraSway: { amplitude: 0.35, speed: 0.08 },
    },
  },
  {
    id: SceneId.Freeze,
    meta: {
      title: "Time Freeze",
      badge: "Scene 1",
      kicker: "Same position, two futures",
      durationMs: 11000,
      takeaway: "Difficulty = budget. Freeze shows how budget changes the line.",
      voiceoverHint: "Freeze. L1 plays for immediacy; Ultimate invests budget for stability.",
      thesisCue: {
        mode: "punch",
        headline: "Same position, two futures",
        subline: MAIN_THESIS,
        emphasize: ["futures"],
        effect: "split",
        durationMs: 2400,
        chapterTag: "Hook",
      },
      beats: [
        { t: 0.0, label: "Position" },
        { t: 0.2, label: "Freeze" },
        { t: 0.35, label: "Arrows", snap: true },
        { t: 0.6, label: "Note" },
        { t: 0.9, label: "End" },
      ],
    },
    payload: {
      scripts: [
        {
          fen: "r1bqk2r/pppp1ppp/2n2n2/8/2BPP3/5N2/PP1N1PPP/R2QK2R b KQkq - 0 8",
          l1Move: "...Nxe4",
          ultMove: "...d6",
          highlights: [
            { from: "c6", to: "d4", color: "#76e5b1", label: "L1 jump" },
            { from: "c6", to: "e5", color: "#8fb3ff", label: "ULT stabilise" },
          ],
          note: "Italian tension: jump in vs. reinforce the center.",
        },
        {
          fen: "rnbq1rk1/p3bpp1/1p3n1p/2pp4/3P3B/2NBPN2/PP3PPP/R2QK2R w KQ - 0 10",
          l1Move: "O-O",
          ultMove: "dxc5",
          highlights: [
            { from: "d4", to: "c5", color: "#76e5b1" },
            { from: "f1", to: "e2", color: "#8fb3ff" },
          ],
          note: "QGD pressure: castle vs. cash in space.",
        },
        {
          fen: "rn1qkb1r/1p3ppp/p2pbn2/4p3/4P3/1NN1BP2/PPP3PP/R2QKB1R b KQkq - 0 8",
          l1Move: "...Be7",
          ultMove: "...h5",
          highlights: [
            { from: "f8", to: "e7", color: "#76e5b1" },
            { from: "h7", to: "h5", color: "#ff9b9b" },
          ],
          note: "Najdorf: normal develop vs. ambitious kingside space.",
        },
        {
          fen: "r1bqkb1r/pp1n1ppp/2n1p3/2ppP3/3P4/2PB4/PP1NNPPP/R1BQK2R b KQkq - 2 7",
          l1Move: "...Qb6",
          ultMove: "...f6",
          highlights: [
            { from: "d7", to: "f6", color: "#8fb3ff" },
            { from: "d5", to: "e4", color: "#76e5b1" },
          ],
          note: "French Tarrasch: pressure pawn vs. challenge the chain directly.",
        },
        {
          fen: "rn1qkbnr/pp3ppp/4p3/2ppPb2/3P4/4BN2/PPP1BPPP/RN1QK2R b KQkq - 1 6",
          l1Move: "...Nc6",
          ultMove: "...cxd4",
          highlights: [
            { from: "c5", to: "d4", color: "#76e5b1" },
            { from: "b8", to: "c6", color: "#8fb3ff" },
          ],
          note: "Caro Advance: reinforce vs. simplify.",
        },
        {
          fen: "r1bqk2r/ppp1bppp/1nn5/4p3/8/2N2NP1/PP1PPPBP/R1BQ1RK1 w kq - 4 8",
          l1Move: "d3",
          ultMove: "a3",
          highlights: [
            { from: "d2", to: "d3", color: "#76e5b1" },
            { from: "a2", to: "a3", color: "#8fb3ff" },
          ],
          note: "English: quick center vs. slowing the queenside bind.",
        },
        {
          fen: "r1bq1rk1/ppp2pbp/2np1np1/3Pp3/2P1P3/2N2N2/PP2BPPP/R1BQ1RK1 b - - 0 8",
          l1Move: "...Ne7",
          ultMove: "...Nd4",
          highlights: [
            { from: "c6", to: "d4", color: "#8fb3ff" },
            { from: "f6", to: "e4", color: "#76e5b1" },
          ],
          note: "King's Indian: reroute vs. strike.",
        },
        {
          fen: "rnbqk2r/pp2ppbp/6p1/2p5/3PP3/2P1BN2/P4PPP/R2QKB1R b KQkq - 1 8",
          l1Move: "...Nc6",
          ultMove: "...Qa5",
          highlights: [
            { from: "d8", to: "a5", color: "#8fb3ff" },
            { from: "b8", to: "c6", color: "#76e5b1" },
          ],
          note: "Grünfeld: develop vs. pin the center.",
        },
        {
          fen: "rn1qkb1r/pp3ppp/2p1pn2/5b2/P1BP4/2N1PN2/1P3PPP/R1BQK2R b KQkq - 0 7",
          l1Move: "...Nbd7",
          ultMove: "...Bb4",
          highlights: [
            { from: "c6", to: "b4", color: "#8fb3ff" },
            { from: "b8", to: "d7", color: "#76e5b1" },
          ],
          note: "Slav: safe develop vs. active pin.",
        },
        {
          fen: "r1b2rk1/ppppnppp/2n2q2/2b5/2BNP3/2P1B3/PP3PPP/RN1QK2R w KQ - 3 8",
          l1Move: "O-O",
          ultMove: "Nxc6",
          highlights: [
            { from: "d4", to: "c6", color: "#ffb347" },
            { from: "e1", to: "g1", color: "#76e5b1" },
          ],
          note: "Scotch middlegame: stabilise king vs. simplify tension.",
        },
      ],
    },
  },
  {
    id: SceneId.Dial,
    meta: {
      title: "Difficulty Dial",
      badge: "Scene 2",
      kicker: "You are driving budget, not flipping slides",
      durationMs: 7200,
      takeaway: "Dial = budget profile (depth, nodes, time). Turning it changes how hard the AI thinks.",
      voiceoverHint: "When I turn this dial, I'm reallocating compute.",
      thesisCue: {
        mode: "punch",
        headline: "Budget is a dial",
        subline: "Turn budget → change play",
        emphasize: ["Budget"],
        effect: "glow",
        durationMs: 2000,
        chapterTag: "Dial",
      },
      beats: [
        { t: 0.0, label: "Title" },
        { t: 0.25, label: "Dial sweep", snap: true },
        { t: 0.5, label: "Budgets" },
        { t: 0.8, label: "Takeaway" },
      ],
    },
    payload: {
      dialLabel: "Budget per move",
      levels: [
        { id: "L1", depth: 4, nodes: 22000, timeMs: 120, persona: "Impulsive — plays for immediate reward.", dialAngle: -18 },
        { id: "L2", depth: 6, nodes: 68000, timeMs: 260, persona: "Planner — short look-ahead, stable.", dialAngle: 32 },
        { id: "L3", depth: 8, nodes: 145000, timeMs: 520, persona: "Tactician — prunes smarter, steadier.", dialAngle: 84 },
        { id: "ULT", depth: 10, nodes: 310000, timeMs: 900, persona: "Ultimate — refined eval, controlled risk.", dialAngle: 128 },
      ],
    },
  },
  {
    id: SceneId.Knobs,
    meta: {
      title: "Four Knobs Console",
      badge: "Scene 3",
      durationMs: 7200,
      takeaway: "Budget ladders use more than depth: horizon, efficiency, evaluation richness, controlled randomness.",
      voiceoverHint: "Higher levels are smarter per unit budget.",
      thesisCue: {
        mode: "echo",
        chapterTag: "Knobs",
        headline: MAIN_THESIS,
        subline: "Four knobs drive the ladder",
      },
      beats: [
        { t: 0.0, label: "Knob 1" },
        { t: 0.33, label: "Knob 2" },
        { t: 0.66, label: "Knob 3" },
        { t: 0.9, label: "Knob 4" },
      ],
    },
    payload: {
      knobs: [
        { level: "L1", horizon: 38, efficiency: 32, evalRichness: 30, randomness: 62 },
        { level: "L2", horizon: 58, efficiency: 55, evalRichness: 52, randomness: 48 },
        { level: "L3", horizon: 76, efficiency: 74, evalRichness: 70, randomness: 34 },
        { level: "ULT", horizon: 90, efficiency: 88, evalRichness: 92, randomness: 22 },
      ],
    },
  },
  {
    id: SceneId.Ladder,
    meta: {
      title: "Levels as Characters",
      badge: "Scene 4",
      durationMs: 7600,
      takeaway: "Four personas on a budget ladder — each with a signature blunder or strength.",
      voiceoverHint: "One line per level; avoid algorithm jargon.",
      thesisCue: {
        mode: "echo",
        chapterTag: "Ladder",
        headline: MAIN_THESIS,
        subline: "Levels as characters",
      },
      beats: [
        { t: 0.0, label: "L1" },
        { t: 0.25, label: "L2" },
        { t: 0.5, label: "L3" },
        { t: 0.75, label: "ULT" },
      ],
    },
    payload: {
      cards: [
        {
          level: "L1",
          fen: "r1bqk2r/pppp1ppp/2n2n2/8/2BPP3/5N2/PP1N1PPP/R2QK2R b KQkq - 0 8",
          move: "...Nxe4",
          tag: "Impulsive",
          blurb: "Snaps a pawn, ignores latent tactics.",
        },
        {
          level: "L2",
          fen: "rnbq1rk1/p3bpp1/1p3n1p/2pp4/3P3B/2NBPN2/PP3PPP/R2QK2R w KQ - 0 10",
          move: "O-O",
          tag: "Planner",
          blurb: "Secures king, keeps structure intact.",
        },
        {
          level: "L3",
          fen: "rn1qkb1r/1p3ppp/p2pbn2/4p3/4P3/1NN1BP2/PPP3PP/R2QKB1R b KQkq - 0 8",
          move: "...h5",
          tag: "Tactician",
          blurb: "Grabs space only when eval supports it.",
        },
        {
          level: "ULT",
          fen: "r1b2rk1/ppppnppp/2n2q2/2b5/2BNP3/2P1B3/PP3PPP/RN1QK2R w KQ - 3 8",
          move: "Nxc6",
          tag: "Refined",
          blurb: "Simplifies at the right moment to keep edge.",
        },
      ],
    },
  },
  {
    id: SceneId.XRay,
    meta: {
      title: "Search X-Ray",
      badge: "Scene 5",
      durationMs: 8200,
      takeaway: "Visualise what the budget buys: better ordering, hotter squares, pruned cold branches.",
      voiceoverHint: "PV emerges while bad branches fade.",
      thesisCue: {
        mode: "echo",
        chapterTag: "X-Ray",
        headline: MAIN_THESIS,
        subline: "Budget → better ordering",
      },
      beats: [
        { t: 0.0, label: "Frame 1" },
        { t: 0.2, label: "Frame 2" },
        { t: 0.4, label: "Frame 3" },
        { t: 0.6, label: "Frame 4" },
        { t: 0.8, label: "Frame 5" },
      ],
    },
    payload: {
      frames: [
        {
          fen: "rnbq1rk1/p3bpp1/1p3n1p/2pp4/3P3B/2NBPN2/PP3PPP/R2QK2R w KQ - 0 10",
          pv: ["Bh7+", "Kxh7", "Ng5+"],
          prunedRatio: 0.22,
          heatSquares: ["h7", "g6", "e6", "d5"],
        },
        {
          fen: "rn1qkb1r/1p3ppp/p2pbn2/4p3/4P3/1NN1BP2/PPP3PP/R2QKB1R b KQkq - 0 8",
          pv: ["...h5", "Qd2", "...Be7"],
          prunedRatio: 0.35,
          heatSquares: ["h5", "d2", "e6", "f4", "g4"],
        },
        {
          fen: "r1b2rk1/ppppnppp/2n2q2/2b5/2BNP3/2P1B3/PP3PPP/RN1QK2R w KQ - 3 8",
          pv: ["Nxc6", "...Bxe3", "fxe3"],
          prunedRatio: 0.46,
          heatSquares: ["c6", "e3", "f2", "g2"],
        },
        {
          fen: "r1bq1rk1/ppp2pbp/2np1np1/3Pp3/2P1P3/2N2N2/PP2BPPP/R1BQ1RK1 b - - 0 8",
          pv: ["...Nd4", "Nxd4", "exd4"],
          prunedRatio: 0.51,
          heatSquares: ["d4", "e4", "f3", "c2"],
        },
        {
          fen: "rnbqk2r/pp2ppbp/6p1/2p5/3PP3/2P1BN2/P4PPP/R2QKB1R b KQkq - 1 8",
          pv: ["...Qa5", "Qd2", "...Nc6"],
          prunedRatio: 0.44,
          heatSquares: ["a5", "d2", "c6", "d4"],
        },
        {
          fen: "rn1qkb1r/pp3ppp/2p1pn2/5b2/P1BP4/2N1PN2/1P3PPP/R1BQK2R b KQkq - 0 7",
          pv: ["...Bb4", "O-O", "...Nbd7"],
          prunedRatio: 0.39,
          heatSquares: ["b4", "d4", "e4", "f3"],
        },
      ],
    },
  },
  {
    id: SceneId.M2M,
    meta: {
      title: "M2M Pipeline",
      badge: "Scene 6",
      durationMs: 6500,
      takeaway: "Automation makes the ladder measurable and reproducible.",
      voiceoverHint: "Scheduler → matches → logging → analytics → summary card.",
      liteSafe: true,
      thesisCue: {
        mode: "echo",
        chapterTag: "Pipeline",
        headline: MAIN_THESIS,
        subline: "Measurable & reproducible",
      },
      beats: [
        { t: 0.0, label: "Scheduler" },
        { t: 0.25, label: "A vs B" },
        { t: 0.5, label: "Logger" },
        { t: 0.7, label: "Analytics" },
        { t: 0.9, label: "Summary" },
      ],
    },
    payload: {
      nodes: [
        { id: "sched", label: "Scheduler", blurb: "Queues matches, rotates colors, enforces limits." },
        { id: "play", label: "A vs B", blurb: "Engines run with fixed seeds + budgets." },
        { id: "log", label: "Logger", blurb: "Stores FENs, move times, nodes, eval traces." },
        { id: "analytics", label: "Analytics", blurb: "Aggregates win rates, elo deltas, blunder rates." },
        { id: "results", label: "Results", blurb: "Printable summary cards for the deck/demo." },
      ],
      summaryCard: { matches: 128, winrate: 62, notes: "ULT vs L3, swap colors, 12-move cap, deterministic seeds." },
    },
  },
  {
    id: SceneId.Landscape,
    meta: {
      title: "Results Landscape",
      badge: "Scene 7",
      durationMs: 7000,
      takeaway: "Strength separates cleanly; you can see the cost of strength along the budget axis.",
      voiceoverHint: "Marker slides from L1 to ULT while the round robin glows.",
      thesisCue: {
        mode: "punch",
        headline: "Cost of strength",
        subline: "Diminishing returns along budget axis",
        emphasize: ["Cost", "strength"],
        effect: "write",
        durationMs: 2200,
        chapterTag: "Results",
      },
      beats: [
        { t: 0.0, label: "Matrix" },
        { t: 0.4, label: "Highlight" },
        { t: 0.7, label: "Tradeoff" },
        { t: 0.9, label: "Takeaway" },
      ],
    },
    payload: {
      roundRobin: [
        [0, 38, 22, 10],
        [62, 0, 28, 14],
        [78, 72, 0, 46],
        [90, 86, 54, 0],
      ],
      costStrengthPoints: [
        { level: "L1", cost: 1, strength: 1180 },
        { level: "L2", cost: 2, strength: 1420 },
        { level: "L3", cost: 3, strength: 1670 },
        { level: "ULT", cost: 5, strength: 1880 },
      ],
      heightmap: [0.1, 0.2, 0.4, 0.5, 0.32, 0.28, 0.6, 0.7, 0.38, 0.25, 0.46, 0.78, 0.64, 0.58, 0.82, 1],
    },
  },
  {
    id: SceneId.Audience,
    meta: {
      title: "Audience Challenge",
      badge: "Scene 8",
      durationMs: 7600,
      takeaway: "Let the room pick a move; you reveal cached verdicts and a proof line.",
      voiceoverHint: "Ask the room for A/B/C, then play the scripted fallout.",
      thesisCue: {
        mode: "echo",
        chapterTag: "Audience",
        headline: MAIN_THESIS,
        subline: "Difficulty you can feel",
      },
    },
    payload: {
      fen: "r1bqk2r/pppp1ppp/2n2n2/8/2BPP3/5N2/PP1N1PPP/R2QK2R b KQkq - 0 8",
      branches: [
        {
          id: "a",
          label: "...Nxe4",
          moves: ["...Nxe4", "Nxe4", "...d5"],
          verdict: "Grabs a pawn, invites tactics.",
          tag: "risky",
          perLevelEvals: [
            { level: "L1", eval: "+0.9" },
            { level: "L2", eval: "+0.5" },
            { level: "L3", eval: "+0.2" },
            { level: "ULT", eval: "+0.1" },
          ],
        },
        {
          id: "b",
          label: "...d6",
          moves: ["...d6", "O-O", "...Be7"],
          verdict: "Stable, keeps tension and controls e5.",
          tag: "solid",
          perLevelEvals: [
            { level: "L1", eval: "+0.4" },
            { level: "L2", eval: "+0.2" },
            { level: "L3", eval: "+0.1" },
            { level: "ULT", eval: "+0.05" },
          ],
        },
        {
          id: "c",
          label: "...a6",
          moves: ["...a6", "Bd3", "...d6"],
          verdict: "Kicks the bishop but slows development.",
          tag: "cautious",
          perLevelEvals: [
            { level: "L1", eval: "+0.3" },
            { level: "L2", eval: "+0.15" },
            { level: "L3", eval: "+0.1" },
            { level: "ULT", eval: "0.0" },
          ],
        },
      ],
    },
  },
  {
    id: SceneId.Future,
    meta: {
      title: "Future: Humanlike + ELO",
      badge: "Scene 9",
      durationMs: 7200,
      takeaway: "Dynamic ELO scaling + style sliders for humanlike mistakes.",
      voiceoverHint: "Show curve morph + style controls.",
      liteSafe: true,
      thesisCue: {
        mode: "punch",
        headline: "Dynamic, humanlike budget",
        subline: "ELO-based scaling + style sliders",
        emphasize: ["humanlike"],
        effect: "stamp",
        durationMs: 2000,
        chapterTag: "Future",
      },
      beats: [
        { t: 0.0, label: "Fixed curve" },
        { t: 0.5, label: "Dynamic curve" },
        { t: 0.8, label: "Style sliders" },
      ],
    },
    payload: {
      eloCurveFixed: [
        { x: 0, y: 1200 },
        { x: 1, y: 1400 },
        { x: 2, y: 1650 },
        { x: 3, y: 1880 },
      ],
      eloCurveDynamic: [
        { x: 0, y: 1200 },
        { x: 1, y: 1500 },
        { x: 2, y: 1780 },
        { x: 3, y: 2050 },
      ],
      styleCard: {
        sliders: [
          { label: "Material bias", value: 62 },
          { label: "Risk appetite", value: 34 },
          { label: "Blunder frequency", value: 18 },
          { label: "Time scrambles", value: 48 },
        ],
        notes: [
          "Weak play should look human: overvalue material, miss long tactics.",
          "Dynamic scaling ties budget to opponent rating / clock.",
          "Style slider keeps low levels fun instead of random.",
        ],
      },
    },
  },
  {
    id: SceneId.Handoff,
    meta: {
      title: "Seamless Handoff",
      badge: "Scene 10",
      durationMs: 5000,
      takeaway: "Morph into the live app; space triggers /play route.",
      voiceoverHint: "Say the line, then hand off.",
      liteSafe: true,
      thesisCue: {
        mode: "punch",
        headline: "Now run it live",
        subline: MAIN_THESIS,
        emphasize: ["live"],
        effect: "stamp",
        durationMs: 1800,
        chapterTag: "Handoff",
      },
      beats: [
        { t: 0.0, label: "Frame" },
        { t: 0.5, label: "Shrink" },
        { t: 0.8, label: "CTA" },
        { t: 1.0, label: "Jump" },
      ],
    },
    payload: {
      ctaText: "That's the system. Now let's run it live.",
      route: "/play",
    },
  },
];
