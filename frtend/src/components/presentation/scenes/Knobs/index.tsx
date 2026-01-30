import React, { useState, useEffect, useMemo } from "react";
import { Html } from "@react-three/drei";
import { AnimatePresence, motion } from "framer-motion";
import { KnobsPayload, KnobKey } from "../../../../data/presentation";
import KnobSVG from "./KnobSVG";

type Props = {
  payload: KnobsPayload;
  sceneT: number;
  liteMode?: boolean;
  isActive?: boolean;
  warmup?: boolean;
};

// Phases based on sceneT beats
// 0.0: Intro
// 0.15: Horizon
// 0.25: Efficiency
// 0.35: Eval
// 0.45: Randomness
// 0.55: Levels
// 0.75: Fixed A
// 0.82: Fixed B
// 0.9: Bridge

const PHASE_THRESHOLDS = {
  INTRO: 0.15,
  HORIZON: 0.25,
  EFFICIENCY: 0.35,
  EVAL: 0.45,
  RANDOMNESS: 0.55,
  LEVELS: 0.75,
  FIXED_A: 0.82,
  FIXED_B: 0.9,
};

export default function KnobsScene({ payload, sceneT, isActive = false, warmup = false }: Props) {
  // Allow rendering even if isActive might be false due to slot visibility glitches; only suppress during warmup.
  if (warmup) return null;
  // --- State ---
  const [manualLevelId, setManualLevelId] = useState<string | null>(null);

  // --- Phase Logic ---
  const phase = useMemo(() => {
    if (sceneT < PHASE_THRESHOLDS.INTRO) return "intro";
    if (sceneT < PHASE_THRESHOLDS.HORIZON) return "reveal_horizon";
    if (sceneT < PHASE_THRESHOLDS.EFFICIENCY) return "reveal_efficiency";
    if (sceneT < PHASE_THRESHOLDS.EVAL) return "reveal_eval";
    if (sceneT < PHASE_THRESHOLDS.RANDOMNESS) return "reveal_randomness";
    if (sceneT < PHASE_THRESHOLDS.LEVELS) return "levels";
    if (sceneT < PHASE_THRESHOLDS.FIXED_A) return "fixed_a";
    if (sceneT < PHASE_THRESHOLDS.FIXED_B) return "fixed_b";
    return "bridge";
  }, [sceneT]);

  // --- Level Selection (Keyboard) ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (phase !== "levels") return;
      if (["1", "2", "3", "4"].includes(e.key)) {
        const map = { "1": "L1", "2": "L2", "3": "L3", "4": "ULT" };
        setManualLevelId(map[e.key as keyof typeof map]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase]);

  // --- Derived Values ---
  const currentLevelId = manualLevelId || "L1"; // Default to L1 in levels phase
  const currentLevel = payload.levels.find((l) => l.id === currentLevelId) || payload.levels[0];

  // Determine Knob Values & Active State
  const knobState = useMemo(() => {
    const keys: KnobKey[] = ["horizon", "efficiency", "evalRichness", "randomness"];
    const defs = payload.knobDefs;

    if (phase === "intro") {
      // Show L1 values (or 0?), all dim
      return {
        values: payload.levels[0].values,
        active: [],
        highlightRing: [],
      };
    }

    if (phase.startsWith("reveal_")) {
      const activeKey = phase.replace("reveal_", "") as KnobKey;
      // Show L1 values? Or L3? Let's show "Average" or just L2 values for intro?
      // User said: "Initial value can be current level or intermediate".
      // Let's use L2 as a balanced start.
      const baseValues = payload.levels.find(l => l.id === "L2")!.values;
      return {
        values: baseValues,
        active: [activeKey], // Only active one is bright
        highlightRing: [activeKey],
      };
    }

    if (phase === "levels") {
      return {
        values: currentLevel.values,
        active: keys, // All visible
        highlightRing: [], // No specific highlight, or maybe all?
      };
    }

    if (phase === "fixed_a" || phase === "fixed_b") {
      const isB = phase === "fixed_b";
      const demo = payload.fixedBudgetDemo!;
      const data = isB ? demo.b : demo.a;
      return {
        values: data.values,
        active: keys,
        highlightRing: ["efficiency", "evalRichness"], // Highlight changed knobs
      };
    }

    if (phase === "bridge") {
      // Bridge: "Only highight Horizon + Efficiency"
      return {
        values: payload.levels.find(l => l.id === "ULT")!.values, // Show ULT values for bridge?
        active: keys,
        highlightRing: ["horizon", "efficiency"],
      };
    }

    return { values: payload.levels[0].values, active: [], highlightRing: [] };
  }, [phase, payload, currentLevel]);

  // --- Render ---
  return (
    <Html
      transform
      wrapperClass="presentation-html-board"
      position={[0, 0, 0]}
      scale={0.36}
      distanceFactor={12}
    >
      <div
        className="w-full h-full flex items-center justify-center p-6 md:p-10"
        style={{
          width: "700px",
          maxWidth: "78vw",
          maxHeight: "75vh",
          overflow: "hidden",
          transformOrigin: "center",
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10 w-full max-w-[900px] items-center">
          
          {/* Left: Knobs Grid */}
          <div className="grid grid-cols-2 gap-8 md:gap-12 justify-items-center">
            {payload.knobDefs.map((def) => {
              const isActive = knobState.active.includes(def.key) || knobState.active.length === 4; 
              const isHighlighted = knobState.highlightRing.includes(def.key);
              const isDim = knobState.active.length > 0 && !knobState.active.includes(def.key);
            
              return (
                <div 
                  key={def.key} 
                  className={`transition-opacity duration-500 ${isDim ? "opacity-30 blur-[1px]" : "opacity-100"}`}
                >
                  <KnobSVG
                    label={def.label}
                    value={knobState.values[def.key]}
                    active={!isDim || isHighlighted}
                    caption={phase === "levels" ? (
                        knobState.values[def.key] > 50 ? def.captionHigh : def.captionLow
                    ) : undefined}
                  />
                </div>
              );
            })}
          </div>

        {/* Right: Glass Card */}
        <div className="flex flex-col gap-6">
          <div className="space-y-2">
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="text-xs font-bold text-accent uppercase tracking-[0.2em]"
             >
               {payload.headline}
             </motion.div>
             <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
               {payload.subline}
             </h1>
          </div>

          <div className="relative min-h-[240px]">
            <AnimatePresence mode="wait">
              {phase === "intro" && (
                <Card key="intro">
                  <div className="text-xl md:text-2xl font-light text-slate-200 leading-relaxed">
                    "{payload.claim}"
                  </div>
                </Card>
              )}

              {phase.startsWith("reveal_") && (
                <Card key="reveal">
                  <div className="space-y-4">
                    {payload.knobDefs.map(def => {
                       const isCurrent = phase === `reveal_${def.key}`;
                       return (
                         <div key={def.key} className={`flex items-center gap-3 transition-colors duration-300 ${isCurrent ? "text-white" : "text-slate-600"}`}>
                           <div className={`w-2 h-2 rounded-full ${isCurrent ? "bg-accent shadow-[0_0_10px_#4ee1a0]" : "bg-slate-700"}`} />
                           <span className={isCurrent ? "text-lg font-bold" : "text-base"}>{def.label}</span>
                           {isCurrent && <span className="text-sm text-slate-400 ml-2 border-l border-slate-600 pl-3">{def.oneLiner}</span>}
                         </div>
                       )
                    })}
                  </div>
                </Card>
              )}

              {phase === "levels" && (
                <Card key="levels">
                   <div className="flex items-baseline gap-4 mb-2">
                     <span className="text-3xl font-black text-white">{currentLevel.id}</span>
                     <span className="text-xl text-accent font-semibold">{currentLevel.persona}</span>
                   </div>
                   <div className="text-lg text-slate-300 mb-6">
                     {currentLevel.note}
                   </div>
                   <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 font-mono">
                      <div>HOR: {currentLevel.values.horizon}</div>
                      <div>EFF: {currentLevel.values.efficiency}</div>
                      <div>EVL: {currentLevel.values.evalRichness}</div>
                      <div>RND: {currentLevel.values.randomness}</div>
                   </div>
                   <div className="mt-4 text-xs text-slate-600">
                     Press 1 / 2 / 3 / 4 to switch levels
                   </div>
                </Card>
              )}

              {(phase === "fixed_a" || phase === "fixed_b") && (
                <Card key="fixed">
                  <div className="text-xs font-bold text-yellow-400 uppercase tracking-widest mb-2">
                    {payload.fixedBudgetDemo?.label}
                  </div>
                  
                  <div className="flex items-center gap-4 mb-4">
                     <div className={`px-3 py-1 rounded text-sm font-bold transition-colors ${phase === "fixed_a" ? "bg-white text-black" : "bg-white/10 text-slate-500"}`}>A: Inefficient</div>
                     <div className={`px-3 py-1 rounded text-sm font-bold transition-colors ${phase === "fixed_b" ? "bg-white text-black" : "bg-white/10 text-slate-500"}`}>B: Smart</div>
                  </div>

                  <div className="text-xl text-slate-200 font-medium mb-2">
                     {phase === "fixed_a" ? payload.fixedBudgetDemo?.a.caption : payload.fixedBudgetDemo?.b.caption}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-white/10 text-sm text-slate-400 italic">
                    "Even with the same budget, smarter allocation improves decisions."
                  </div>
                </Card>
              )}

              {phase === "bridge" && (
                <Card key="bridge">
                   <div className="text-lg text-slate-300">
                     {payload.bridgeLine}
                   </div>
                   <div className="mt-4 flex items-center gap-2 text-accent">
                     <span>Next Scene: X-Ray</span>
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                   </div>
                </Card>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
    </Html>
  );
}

const Card = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.3 }}
    className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 md:p-8 shadow-2xl"
  >
    {children}
  </motion.div>
);
