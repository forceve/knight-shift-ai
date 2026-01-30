import imgL2vsL1 from '../image/l2vsl1.png';
import imgL3vsL1 from '../image/l3vsl1.png';
import imgL3vsL2 from '../image/l3vsl2.png';
import imgUltvsL1 from '../image/ultvsl1.png';
import imgUltvsL3 from '../image/ultvsl3.png';

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
  FutureLite = "scene8",
  Closing = "scene9",
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

// --- Updated Scene 1 Types ---
export type FreezeScriptStep = {
  fen: string;
  lastMove?: string;
  checkmate?: "white" | "black";
  arrows?: string[];
};

export type FreezePayload = {
  initialFen: string;
  opponentMove: { from: string; to: string; san: string };
  leftLine: { steps: FreezeScriptStep[]; tag: string; verdict: string };
  rightLine: { steps: FreezeScriptStep[]; tag: string; verdict: string };
  // Legacy compatibility (optional)
  scripts?: any[];
};

// --- Updated Scene 2 Types ---
export type DialPayload = {
  profiles: {
    level: "L1" | "L2" | "L3" | "ULT";
    depthLabel: string;
    avgTimeMs: number | null;
    avgNodes: number | null;
    persona: string;
  }[];
  definitionLines: string[];
  bridgeLine: string;
  nextLine: string;
  // Legacy compatibility
  levels?: any[];
  dialLabel?: string;
};

export type KnobKey = "horizon" | "efficiency" | "evalRichness" | "randomness";

export type KnobDef = {
  key: KnobKey;
  label: string;
  oneLiner: string;
  captionLow: string;
  captionHigh: string;
};

export type KnobLevelProfile = {
  id: "L1" | "L2" | "L3" | "ULT";
  persona: string;
  note: string;
  values: Record<KnobKey, number>; // 0..100
};

export type KnobsPayload = {
  headline: string;    // "THE KNOBS"
  subline: string;     // "How the budget is spent"
  claim: string;
  knobDefs: KnobDef[];
  levels: KnobLevelProfile[];
  fixedBudgetDemo?: {
    label: string; // "Budget fixed: 2000ms/move"
    a: { name: string; values: Record<KnobKey, number>; caption: string };
    b: { name: string; values: Record<KnobKey, number>; caption: string };
  };
  bridgeLine: string;  // to X-Ray
};

export type LadderRung = {
  id: "L1"|"L2"|"L3"|"ULT";
  cardTitle: string;
  feels: string;
  signature: string;
  chips: [string, string];
  stats: { rating: number; humanWinRate: number };
  detail: {
    config: string[]; // lines
    why: string[];    // 2 lines
    human: string;    // one line
  };
};

export type LadderPayload = {
  headline: string;
  subline: string;
  thesisLine: string;
  bridgeLine: string;
  mappingLines: string[];
  rungs: LadderRung[];
  layout: {
    spineStart: {x:number;y:number};
    spineEnd: {x:number;y:number};
    tValues: number[];
    cardOffsetN: number;
    cardOffsetT: number;
  };
};

export type XRayLevel = "L1" | "L2" | "L3" | "ULT";

export type XRayPayload = {
  headline: string;
  subline: string;
  baseFen: string;
  levels: Record<XRayLevel, {
    pvUci: string[];
    metrics: {
      depthLabel: string;
      timeMs: number;
      nodes: number;
      cutoffs: number;
      prunedRatio: number;
      quiescence: boolean;
    };
    treeSpec: {
      seed: number;
      branching: number[];
      pvIndices: number[];
      prunedRatio: number;
      showQExtension: boolean;
    };
  }>;
  compareLines: string[];
  bridgeLine: string;
};

export type HarnessLane = {
  id: "m2m_standard" | "h2m_human" | "m2m_timescaled";
  title: string;
  bullets: string[];     // 写死关键数字
  tags?: string[];       // 可选
};

export type HarnessPayload = {
  headline: string;
  subline: string;
  thesisLine: string;

  trunkNodes: string[];  // ["Config","Queue (Batch)","Workers (≤20)",...,"Figures"]

  lanes: HarnessLane[];

  rulesCard: string[];        // 三条写死
  throughputCard: string[];   // 三条写死

  outputs: { id: "score"|"tradeoff"|"gamestats"; label: string }[]; // 三张缩略卡
  bridgeLine: string;
};

export type TSBFigure = {
  id: string;
  label: string;     // "L3 vs L2"
  src: string;       // "/fig/tsb_l3_l2.svg"
  takeaway: string;  // short one-liner
};

export type LandscapePayload = {
  roundRobin: number[][];
  costStrengthPoints: { level: "L1" | "L2" | "L3" | "ULT"; cost: number; strength: number }[];
  heightmap: number[];
  tsb: {
    title: string;          // "Time-Scaled Benchmark (TSB)"
    figures: TSBFigure[];   // EXACTLY 5
    defaultIndex: number;   // e.g. 1 (L3 vs L2)
    hint: string;           // "T toggle · [ ] switch · Enter zoom"
    showFromBeat: number;   // 4
  };
};

export type FutureLitePayload = {
  headline: string;   // "FUTURE WORK"
  subline: string;    // "All items are stated in the paper."

  cards: Array<{
    id: "opt" | "dda" | "gen";
    title: string;
    bullets: string[];
  }>;

  impact: {
    title: string; // "Impact"
    rows: Array<{
      id: "opt" | "dda" | "gen";
      goal: string;
      change: string;
      why: string;
    }>;
    badge: string; // "Explore learned evaluation functions (Conclusion)"
  };

  punch: string;
  bridge: string; // "Next: live demo"
};

export type ClosingPayload = {
  headline: string;  // "THANK YOU"
  hero: string;      // "DIFFICULTY = COMPUTATION BUDGET"
  recap: string[];   // 3 bullets
  cta: string;       // "Press Space to open live demo → /play"
  footnote?: string; // "Q&A"
};

export type SceneBase<T extends SceneId, P> = {
  id: T;
  meta: SceneMeta;
  payload: P;
};

export type PresentationScene =
  | SceneBase<SceneId.Ambient, AmbientPayload>
  | SceneBase<SceneId.Freeze, FreezePayload>
  | SceneBase<SceneId.Dial, DialPayload>
  | SceneBase<SceneId.Knobs, KnobsPayload>
  | SceneBase<SceneId.Ladder, LadderPayload>
  | SceneBase<SceneId.XRay, XRayPayload>
  | SceneBase<SceneId.Pipeline, HarnessPayload>
  | SceneBase<SceneId.Landscape, LandscapePayload>
  | SceneBase<SceneId.FutureLite, FutureLitePayload>
  | SceneBase<SceneId.Closing, ClosingPayload>;

// --- Helper for Beats ---
export const FREEZE_BEATS: SceneBeat[] = [
  { t: 0.0, label: "Intro" },
  { t: 0.2, label: "Opponent Move" },
  { t: 0.4, label: "Split" },
  { t: 0.6, label: "Parallel 1" },
  { t: 0.8, label: "Parallel 2" },
  { t: 1.0, label: "Merge" },
];

export const DIAL_BEATS: SceneBeat[] = [
  { t: 0.0, label: "Hero" },
  { t: 0.25, label: "Definition" },
  { t: 0.5, label: "Dial Sweep" },
  { t: 0.75, label: "Bridge" },
  { t: 1.0, label: "Next" },
];

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
        subline: "Knightshift: a multilevel AI chess system",
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
      durationMs: 12000,
      takeaway: "Difficulty = budget. Freeze shows how budget changes the line.",
      voiceoverHint: "Freeze. L1 plays for immediacy; Ultimate invests budget for stability.",
      thesisCue: {
        mode: "punch",
        headline: "Same position, two futures",
        subline: MAIN_THESIS,
        emphasize: ["futures"],
        effect: "split",
        chapterTag: "Hook",
      },
      beats: FREEZE_BEATS,
    },
    payload: {
      // 6.Nxe5, Black to move. The position provided by user:
      // r2qkbnr/ppp2ppp/2np4/4N2b/2B1P3/2N4P/PPPP1PP1/R1BQK2R b KQkq - 0 6
      initialFen: "r2qkbnr/ppp2ppp/2np4/4N2b/2B1P3/2N4P/PPPP1PP1/R1BQK2R b KQkq - 0 6",
      // White played Nxe5 (f3->e5) to reach this.
      opponentMove: { from: "f3", to: "e5", san: "Nxe5" },
      leftLine: {
        tag: "Greedy / L1",
        verdict: "?? Blunder",
        steps: [
          // 6...Bxd1??
          {
            fen: "r2qkbnr/ppp2ppp/2np4/4N3/2B1P3/2N4P/PPPP1PP1/R1BbK2R w KQkq - 0 7",
            lastMove: "h5d1",
            arrows: ["c4->f7"], 
          },
          // 7.Bxf7+
          {
            fen: "r2qkbnr/ppp2Bpp/2np4/4N3/4P3/2N4P/PPPP1PP1/R1BbK2R b KQkq - 0 7",
            lastMove: "c4f7",
            arrows: ["e8->e7"],
          },
          // 7...Ke7
          {
            fen: "r2q1bnr/ppp1kBpp/2np4/4N3/4P3/2N4P/PPPP1PP1/R1BbK2R w KQ - 1 8",
            lastMove: "e8e7",
            arrows: ["c3->d5"],
          },
          // 8.Nd5#
          {
            fen: "r2q1bnr/ppp1kBpp/2np4/3NN3/4P3/7P/PPPP1PP1/R1BbK2R b KQ - 2 8",
            lastMove: "c3d5",
            checkmate: "white",
            arrows: [],
          },
        ],
      },
      rightLine: {
        tag: "Tactician / L3",
        verdict: "!! Counter",
        steps: [
          // 6...Nxe5! (Start: 2np4/4N2b -> End: 3p4/4n2b)
          {
            fen: "r2qkbnr/ppp2ppp/3p4/4n2b/2B1P3/2N4P/PPPP1PP1/R1BQK2R w KQkq - 0 7",
            lastMove: "c6e5",
            arrows: ["c4->f7"],
          },
          // 7.Bxf7+
          {
            fen: "r2qkbnr/ppp2Bpp/3p4/4n2b/4P3/2N4P/PPPP1PP1/R1BQK2R b KQkq - 0 7",
            lastMove: "c4f7",
            arrows: ["e8->f7"],
          },
          // 7...Kxf7
          {
            fen: "r2q1bnr/ppp2kpp/3p4/4n2b/4P3/2N4P/PPPP1PP1/R1BQK2R w KQ - 0 8",
            lastMove: "e8f7",
            arrows: ["d1->f3"],
          },
          // 8.Qf3+
          {
            fen: "r2q1bnr/ppp2kpp/3p4/4n2b/4P3/2N2Q1P/PPPP1PP1/R1B1K2R b KQ - 1 8",
            lastMove: "d1f3",
            arrows: ["h5->f3"],
          },
          // 8...Bxf3
          {
            fen: "r2q1bnr/ppp2kpp/3p4/4n3/4P3/2N2b1P/PPPP1PP1/R1B1K2R w KQ - 0 9",
            lastMove: "h5f3",
            arrows: [],
          },
        ],
      },
      scripts: [],
    },
  },
  {
    id: SceneId.Dial,
    meta: {
      title: "Difficulty Dial",
      badge: "Scene 2",
      kicker: "You are driving budget, not flipping slides",
      durationMs: 14400,
      takeaway: "Dial = budget profile. Higher budget = deeper search = stronger play.",
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
      beats: DIAL_BEATS,
    },
    payload: {
      definitionLines: [
        "Budget (cost) = time/move + nodes/move",
        "Strength = score under the same budget"
      ],
      profiles: [
        { level: "L1", depthLabel: "Depth 1", avgTimeMs: 60, avgNodes: 32, persona: "Impulsive" },
        { level: "L2", depthLabel: "Depth 2", avgTimeMs: 175, avgNodes: 1150, persona: "Planner" },
        { level: "L3", depthLabel: "Depth 3", avgTimeMs: 700, avgNodes: 14000, persona: "Tactician" },
        { level: "ULT", depthLabel: "Adaptive", avgTimeMs: 3000, avgNodes: 185000, persona: "Ultimate" },
      ],
      bridgeLine: "Same board, different choice because budget changes visibility.",
      nextLine: "Next: not only how much budget, but how to spend it.",
      dialLabel: "Budget per move",
      levels: [] 
    }
  },
  {
    id: SceneId.Knobs,
    meta: {
      title: "The Knobs",
      badge: "Scene 3",
      durationMs: 7200,
      takeaway: "Difficulty is not just budget size, but allocation strategy.",
      voiceoverHint: "Introduce the four dimensions, then show how they scale.",
      thesisCue: {
        mode: "echo",
        chapterTag: "Knobs",
        headline: "THE KNOBS",
        subline: "How the budget is spent",
      },
      beats: [
        { t: 0.0, label: "Intro" },
        { t: 0.15, label: "Horizon" },
        { t: 0.25, label: "Efficiency" },
        { t: 0.35, label: "Eval Richness" },
        { t: 0.45, label: "Randomness" },
        { t: 0.55, label: "Levels" },
        { t: 0.75, label: "Fixed Budget A" },
        { t: 0.82, label: "Fixed Budget B" },
        { t: 0.9, label: "Bridge" },
      ],
    },
    payload: {
      headline: "THE KNOBS",
      subline: "How the budget is spent",
      claim: "Difficulty = Budget × Allocation",
      knobDefs: [
        {
          key: "horizon",
          label: "Horizon",
          oneLiner: "How far ahead we look (ply depth).",
          captionLow: "Moves-in-hand only",
          captionHigh: "Deep, multi-branch vision",
        },
        {
          key: "efficiency",
          label: "Efficiency",
          oneLiner: "Ordering + pruning quality per node.",
          captionLow: "Burns time on junk",
          captionHigh: "Orders, prunes, saves time",
        },
        {
          key: "evalRichness",
          label: "Eval Richness",
          oneLiner: "Nuance of evaluation (features, patterns).",
          captionLow: "Material-only heuristics",
          captionHigh: "Structure, initiative, king safety",
        },
        {
          key: "randomness",
          label: "Randomness",
          oneLiner: "Noise injection to simulate error.",
          captionLow: "Chaotic / blunders",
          captionHigh: "Precise / stable",
        },
      ],
      levels: [
        {
          id: "L1",
          persona: "Impulsive / Bullet",
          note: "Looks 1-2 ply, grabs loose material, high blunder rate.",
          values: { horizon: 25, efficiency: 28, evalRichness: 22, randomness: 78 },
        },
        {
          id: "L2",
          persona: "Club Grinder",
          note: "Solid shape, modest depth, still wastes time on side branches.",
          values: { horizon: 55, efficiency: 60, evalRichness: 58, randomness: 42 },
        },
        {
          id: "L3",
          persona: "Tournament Tactician",
          note: "Sees forcing lines, good move ordering, fewer random drops.",
          values: { horizon: 75, efficiency: 82, evalRichness: 80, randomness: 28 },
        },
        {
          id: "ULT",
          persona: "Ultimate / Production",
          note: "Max depth + rich eval, disciplined randomness for stability.",
          values: { horizon: 92, efficiency: 95, evalRichness: 96, randomness: 12 },
        },
      ],
      fixedBudgetDemo: {
        label: "Budget fixed: 2000ms/move",
        a: {
          name: "Inefficient Alloc.",
          values: { horizon: 32, efficiency: 42, evalRichness: 40, randomness: 60 },
          caption: "Wastes time on junk branches; misses quiet moves.",
        },
        b: {
          name: "Smart Alloc.",
          values: { horizon: 32, efficiency: 88, evalRichness: 86, randomness: 60 },
          caption: "Same time, better ordering + richer eval → stronger move.",
        },
      },
      bridgeLine: "Next: See this efficiency in action with X-Ray.",
    },
  },
  {
    id: SceneId.Ladder,
    meta: {
      title: "Difficulty Ladder",
      badge: "Scene 4",
      durationMs: 10000,
      takeaway: "Four personas on a budget ladder — each with a signature blunder or strength.",
      voiceoverHint: "One line per level; avoid algorithm jargon.",
      thesisCue: {
        mode: "echo",
        chapterTag: "Ladder",
        headline: "DIFFICULTY LADDER",
        subline: "What each level feels like",
      },
      beats: [
        { t: 0.0, label: "Intro" },
        { t: 0.16, label: "L1" },
        { t: 0.33, label: "L2" },
        { t: 0.50, label: "L3" },
        { t: 0.66, label: "ULT" },
        { t: 0.83, label: "Summary" },
      ],
    },
    payload: {
      headline: "DIFFICULTY LADDER",
      subline: "What each level feels like",
      thesisLine: "Same engine, different behavior profiles.",
      bridgeLine: "Next: X-Ray — how pruning and PV stability change across levels.",
      mappingLines: [
        "Horizon ↑ → fewer tactical misses",
        "Efficiency ↑ → more cutoffs, deeper within same budget",
        "Eval richness ↑ → better positional judgement",
        "Randomness ↑ → more variety, lower strength",
      ],
      layout: {
        spineStart: { x: 0.10, y: 0.22 },
        spineEnd: { x: 0.90, y: 0.08 },
        tValues: [0.05, 0.35, 0.65, 0.95],
        cardOffsetN: 0.12,
        cardOffsetT: 0.0,
      },
      rungs: [
        {
          id: "L1",
          cardTitle: "L1 — Greedy (1-ply)",
          feels: "Impulsive beginner",
          signature: "wins material, misses tactics",
          chips: ["positional-eval", "tactically blind"],
          stats: { rating: 1.8, humanWinRate: 65 },
          detail: {
            config: [
              "Search: Greedy (1-ply, no tree)",
              "Pruning: No | ID: No | Quiescence: No",
              "Eval: Full positional (PST + mobility + king safety)",
              "Move choice: Deterministic",
              "Time budget: ~instant"
            ],
            why: [
              "Strong positional taste but tactically blind (no lookahead).",
              "Vulnerable to forks/pins/mate threats (horizon effect)."
            ],
            human: "Rating 1.8 | Human win 65%"
          }
        },
        {
          id: "L2",
          cardTitle: "L2 — Basic Minimax (d=3)",
          feels: "Careful novice",
          signature: "fewer blunders, still shallow",
          chips: ["αβ pruning", "random top-3"],
          stats: { rating: 2.4, humanWinRate: 45 },
          detail: {
            config: [
              "Search: Minimax (d=3)",
              "Pruning: Alpha-beta | ID: No | Quiescence: No",
              "Eval: Material-only",
              "Move choice: Random tie-break among top 3",
              "Time budget: low (fast)"
            ],
            why: [
              "Strength jump mainly comes from 3-ply lookahead, not eval richness.",
              "Random tie-break keeps it beatable and less repetitive."
            ],
            human: "Rating 2.4 | Human win 45%"
          }
        },
        {
          id: "L3",
          cardTitle: "L3 — Advanced Minimax (ID≤6)",
          feels: "Club player",
          signature: "sees threats & tactics",
          chips: ["quiescence", "rich eval"],
          stats: { rating: 3.1, humanWinRate: 35 },
          detail: {
            config: [
              "Search: Alpha-beta + iterative deepening (up to d=6)",
              "Pruning: Yes + move ordering | Quiescence: Yes",
              "Eval: Rich positional (PST + mobility + pawn structure + king safety)",
              "Move choice: Deterministic",
              "Time budget: 0.6s/move"
            ],
            why: [
              "Quiescence reduces horizon effect in tactical sequences.",
              "Richer eval helps avoid simple traps that plague lower levels."
            ],
            human: "Rating 3.1 | Human win 35%"
          }
        },
        {
          id: "ULT",
          cardTitle: "ULT — PeSTO (ID≤8)",
          feels: "Stable player",
          signature: "consistent PV, converts",
          chips: ["PeSTO tapered", "low noise"],
          stats: { rating: 3.6, humanWinRate: 33 },
          detail: {
            config: [
              "Search: Alpha-beta + iterative deepening (up to d=8)",
              "Pruning: Yes + ordering | Quiescence: Yes (enhanced)",
              "Eval: PeSTO tapered (phase-adaptive MG/EG interpolation)",
              "Move choice: Deterministic",
              "Time budget: 1.2s/move"
            ],
            why: [
              "Phase-adaptive evaluation captures positional nuance across game phases.",
              "More consistent PV and fewer 'weird' moves (lower noise)."
            ],
            human: "Rating 3.6 | Human win 33%"
          }
        }
      ],
    },
  },
  {
    id: SceneId.XRay,
    meta: {
      title: "Search X-Ray",
      badge: "Scene 5",
      durationMs: 16400,
      takeaway: "Visualise what the budget buys: better ordering, hotter squares, pruned cold branches.",
      voiceoverHint: "PV emerges while bad branches fade.",
      thesisCue: {
        mode: "echo",
        chapterTag: "X-Ray",
        headline: MAIN_THESIS,
        subline: "Budget → better ordering",
      },
      beats: [
        { t: 0.0, label: "Intro" },
        { t: 0.2, label: "PV" },
        { t: 0.4, label: "Pruning" },
        { t: 0.6, label: "Horizon" },
        { t: 0.8, label: "Quiescence" },
        { t: 1.0, label: "Compare" },
      ],
    },
    payload: {
      headline: "SEARCH X-RAY",
      subline: "What changes inside the search tree",
      baseFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      levels: {
        L1: {
          pvUci: ["e2e4"],
          metrics: { depthLabel: "1-ply (greedy)", timeMs: 5, nodes: 40, cutoffs: 0, prunedRatio: 0.0, quiescence: false },
          treeSpec: { seed: 1, branching: [6], pvIndices: [2], prunedRatio: 0.0, showQExtension: false }
        },
        L2: {
          pvUci: ["d2d4", "d7d5", "c2c4"],
          metrics: { depthLabel: "d=3 (αβ)", timeMs: 80, nodes: 15000, cutoffs: 6000, prunedRatio: 0.65, quiescence: false },
          treeSpec: { seed: 2, branching: [6, 3, 2], pvIndices: [2, 1, 0], prunedRatio: 0.65, showQExtension: false }
        },
        L3: {
          pvUci: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "g8f6"],
          metrics: { depthLabel: "ID≤6 + Q", timeMs: 600, nodes: 250000, cutoffs: 190000, prunedRatio: 0.78, quiescence: true },
          treeSpec: { seed: 3, branching: [6, 3, 2, 1], pvIndices: [2, 1, 0, 0], prunedRatio: 0.78, showQExtension: true }
        },
        ULT: {
          pvUci: ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "a7a6", "b5a4"],
          metrics: { depthLabel: "ID≤8 + Q + PeSTO", timeMs: 1200, nodes: 900000, cutoffs: 760000, prunedRatio: 0.83, quiescence: true },
          treeSpec: { seed: 4, branching: [6, 3, 2, 1], pvIndices: [2, 1, 0, 0], prunedRatio: 0.83, showQExtension: true }
        }
      },
      compareLines: [
        "L1: Greedy (1-ply) | no pruning | no ID | no Q | positional eval | deterministic",
        "L2: Minimax d=3 | αβ pruning | no ID | no Q | material-only | random tie-break (top-3)",
        "L3: Minimax | αβ + ordering | ID≤6 | Q on | rich positional eval | deterministic | 0.6s/move",
        "ULT: Minimax | αβ + ordering | ID≤8 | Q on | PeSTO tapered eval | deterministic | 1.2s/move"
      ],
      bridgeLine: "Next: Evidence — M2M results and diminishing returns."
    },
  },
  {
    id: SceneId.Pipeline,
    meta: {
      title: "Evaluation Harness",
      badge: "Scene 6",
      kicker: "Reproducible · Scalable · Comparable",
      durationMs: 12000,
      takeaway: "Scene6: You have a rigorous harness, not just random games.",
      voiceoverHint: "Walk through the three lanes and the throughput stats.",
      liteSafe: true,
      thesisCue: {
        mode: "echo",
        chapterTag: "Harness",
        headline: "EVALUATION HARNESS",
        subline: "Reproducible · Scalable · Comparable",
      },
      beats: [
        { t: 0.0, label: "Overview" },
        { t: 0.2, label: "M2M Standard" },
        { t: 0.4, label: "H2M Human" },
        { t: 0.6, label: "Time-Scaled" },
        { t: 0.8, label: "Throughput" },
        { t: 1.0, label: "Outputs" },
      ],
    },
    payload: {
      headline: "EVALUATION HARNESS",
      subline: "Reproducible · Scalable · Comparable",
      thesisLine: "Not just games — a reproducible harness.",
      trunkNodes: ["Config", "Queue (Batch)", "Workers (≤20)", "GameRunner", "Logger", "Aggregator", "Figures"],
      lanes: [
        {
          id: "m2m_standard",
          title: "M2M Standard",
          bullets: ["100 games per pairing", "50/50 colors", "default time limit per engine"],
          tags: ["Round-robin style"],
        },
        {
          id: "h2m_human",
          title: "H2M Human Study",
          bullets: ["10 participants", "5 games per level (colors alternated)", "5-point difficulty rating + feedback", "Participants → SakuraFRP → Same server"],
        },
        {
          id: "m2m_timescaled",
          title: "M2M Time-Scaled",
          bullets: ["0.1s/move + 0.2s steps (0.1, 0.3, 0.5, …)", "50 games per pairing per time setting"],
          tags: ["Cost–strength curve"],
        },
      ],
      rulesCard: ["Max 500 plies", "Scoring: 1 / 0.5 / 0", "Colors reversed"],
      throughputCard: ["≤20 concurrent workers", "One batch active at a time", "Batch: queued → running → done"],
      outputs: [
        { id: "score", label: "Score% (colors reversed)" },
        { id: "tradeoff", label: "Cost–strength trade-off" },
        { id: "gamestats", label: "Game stats (plies, nodes/move)" },
      ],
      bridgeLine: "Next: Evidence — M2M results and diminishing returns.",
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
        { t: 0.2, label: "Highlight" },
        { t: 0.4, label: "Tradeoff" },
        { t: 0.6, label: "Takeaway" },
        { t: 0.8, label: "TSB" },
        { t: 0.95, label: "Human Check" }, // Beat 5
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
      tsb: {
        title: "Time-Scaled Benchmark (TSB)",
        defaultIndex: 1,
        hint: "T toggle · [ ] switch · Enter zoom",
        showFromBeat: 4,
        figures: [
          {
            id: "l2_l1",
            label: "L2 vs L1",
            src: imgL2vsL1,
            takeaway: "Big early gain, saturates"
          },
          {
            id: "l3_l2",
            label: "L3 vs L2",
            src: imgL3vsL2,
            takeaway: "More cost, smaller gain"
          },
          {
            id: "ult_l3",
            label: "ULT vs L3",
            src: imgUltvsL3,
            takeaway: "Stable but marginal"
          },
          {
            id: "ult_l1",
            label: "ULT vs L1",
            src: imgUltvsL1,
            takeaway: "Ultimate dominance"
          },
          {
            id: "l3_l1",
            label: "L3 vs L1",
            src: imgL3vsL1,
            takeaway: "Gap holds across budgets"
          }
        ]
      }
    },
  },
  {
    id: SceneId.FutureLite,
    meta: {
      title: "Future Work",
      badge: "Scene 8",
      durationMs: 8200,
      takeaway: "Paper-backed roadmap: faster search, adaptive difficulty, broader games.",
      voiceoverHint: "Hit optimization, dynamic difficulty, then generalization; badge learned eval on the last beat.",
      liteSafe: true,
      thesisCue: {
        mode: "echo",
        chapterTag: "Future",
        headline: "FUTURE WORK",
        subline: "All items are stated in the paper.",
      },
      beats: [
        { t: 0.0, label: "Overview" },
        { t: 0.33, label: "Optimization" },
        { t: 0.66, label: "Dynamic difficulty" },
        { t: 1.0, label: "Generalization" },
      ],
    },
    payload: {
      headline: "FUTURE WORK",
      subline: "All items are stated in the paper.",
      cards: [
        {
          id: "opt",
          title: "Performance optimization",
          bullets: [
            "Transposition table: larger size + smarter replacement schemes",
            "Parallel search: better multi-core utilization",
            "Port critical parts to C++/Rust for deeper search under the same time limit",
          ],
        },
        {
          id: "dda",
          title: "Dynamic difficulty adjustment",
          bullets: [
            "Based on recent outcomes",
            "Adjust search depth",
            "Adjust evaluation aggressiveness",
          ],
        },
        {
          id: "gen",
          title: "Generalization to other games",
          bullets: [
            "Extend to other board games: checkers, Go, shogi",
            "Reuse the modular architecture",
            "Swap evaluation functions and move generators",
          ],
        },
      ],
      impact: {
        title: "Impact",
        rows: [
          {
            id: "opt",
            goal: "Stronger play under the same budget",
            change: "TT + parallelism + faster core",
            why: "Deeper / more stable search within time constraints",
          },
          {
            id: "dda",
            goal: "Smoother and personalized difficulty",
            change: "Tune depth + eval aggressiveness",
            why: "Avoid abrupt jumps; better user experience",
          },
          {
            id: "gen",
            goal: "Prove the framework generalizes",
            change: "Replace eval + move rules",
            why: "Validate the scalability beyond chess",
          },
        ],
        badge: "Explore learned evaluation functions (Conclusion)",
      },
      punch: "Future work: faster search, adaptive difficulty, broader games.",
      bridge: "Next: live demo",
    },
  },
  {
    id: SceneId.Closing,
    meta: {
      title: "Closing & Handoff",
      badge: "Scene 9",
      durationMs: 5200,
      takeaway: "Restate the thesis, recap the evidence, and hand off to the live demo.",
      voiceoverHint: "Land the thesis, hit the three recap bullets, and invite Space to open /play.",
      liteSafe: true,
      thesisCue: {
        mode: "punch",
        headline: "DIFFICULTY = COMPUTATION BUDGET",
        subline: "Thank you",
        emphasize: ["DIFFICULTY", "BUDGET"],
        effect: "glow",
        chapterTag: "Closing",
      },
      beats: [
        { t: 0.0, label: "Hero" },
        { t: 1.0, label: "CTA" },
      ],
    },
    payload: {
      headline: "THANK YOU",
      hero: "DIFFICULTY = COMPUTATION BUDGET",
      recap: [
        "Built a multi-level chess AI ladder (L1–L3 + Ultimate)",
        "Designed a reproducible evaluation harness (M2M/H2M/TSB)",
        "Verified separation and diminishing returns in results",
      ],
      cta: "Press Space to open live demo → /play",
      footnote: "Q&A",
    },
  },
];
