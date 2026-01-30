import { LandscapePayload, LadderPayload, PresentationScene, SceneId } from "../../data/presentation";
import { useState, useEffect, useRef } from "react";
import { TSBStrip } from "./scenes/Landscape/TSB/TSBStrip";
import { TSBHero } from "./scenes/Landscape/TSB/TSBHero";
import FutureLiteScene from "./scenes/FutureLite/FutureLiteScene";
import ClosingScene from "./scenes/ClosingScene";

type Props = {
  scene: PresentationScene;
  sceneT: number;
  liteMode: boolean;
  onHandoff?: () => void;
};

export default function UIStage({ scene, sceneT, liteMode, onHandoff }: Props) {
  const sceneProgress = Math.round(sceneT * 100);
  const panel = renderScenePanel(scene, sceneT, onHandoff);
  
  const isFullPage =
    (scene.id === SceneId.Knobs ||
      scene.id === SceneId.Landscape ||
      scene.id === SceneId.Ladder ||
      scene.id === SceneId.FutureLite ||
      scene.id === SceneId.Closing) &&
    panel !== null;

  return (
    <div className="presentation-overlay">
      {/* Top progress bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-white/10 z-50">
        <div 
          className="h-full bg-gradient-to-r from-hint to-accent transition-all duration-300 ease-linear" 
          style={{ width: `${sceneProgress}%` }} 
        />
      </div>

      <div className={isFullPage ? "absolute inset-0 z-10" : "overlay-content-center"}>
        {panel}
      </div>
    </div>
  );
}

function renderScenePanel(scene: PresentationScene, sceneT: number, onHandoff?: () => void) {
  switch (scene.id) {
    case SceneId.Freeze: 
      // User requested to hide the panel and move info to 3D overlay.
      return null;
    case SceneId.Dial:
      // Dial visuals are mainly 3D, panel is optional or shows detail.
      // We can hide panel or show specific beats.
      // Beat 1: Definition Card (rendered in 3D now per user request? "Right: Budget Card (glass)")
      // User requested "Left: Dial", "Right: Budget Card".
      // If we render Card in UIStage, it's easier to layout.
      // If we render in 3D (Html), it follows camera.
      // Let's stick to UIStage for clarity if it fits, OR return null if 3D handles it.
      // User spec: "Scene2 Dial: Hero + Definition + Profiles + Bridge + Next"
      // "Visual Design: Left Dial, Right Budget Card".
      // Our DialScene.tsx implements Html overlays. So we can return null here to avoid duplication.
      return null; 
    case SceneId.Knobs:
      // Knobs scene renders inside the Canvas (Html overlay), so no extra UI layer.
      return null;
    case SceneId.Ladder:
      return <LadderPanel payload={scene.payload} sceneT={sceneT} />;
    case SceneId.XRay:
      // XRay rendering handled by XRayScene component
      return null;
    case SceneId.Pipeline:
      return null;
    case SceneId.Landscape:
      return <LandscapePanel payload={scene.payload} sceneT={sceneT} />;
    case SceneId.FutureLite:
      return <FutureLiteScene payload={scene.payload} sceneT={sceneT} />;
    case SceneId.Closing:
      return <ClosingScene payload={scene.payload} sceneT={sceneT} onHandoff={onHandoff} />;
    default:
      return <div />;
  }
}

function LadderPanel({ payload, sceneT }: { payload: LadderPayload; sceneT: number }) {
  const beatIndex = Math.floor(sceneT * 6);
  // Clamp beatIndex
  const safeBeat = Math.min(Math.max(beatIndex, 0), 5);
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  // Advance banner motion by ~300ms (scene duration ~10s)
  const bannerLead = 0.03;
  const bannerT = clamp01(sceneT + bannerLead);
  const moveStart = 1 / 6; // Start moving at L1
  const moveEnd = 2 / 6;   // Land by L2
  const smooth01 = (t: number, a: number, b: number) => {
    const p = clamp01((t - a) / (b - a));
    return p * p * (3 - 2 * p);
  };
  const moveP = smooth01(bannerT, moveStart, moveEnd);
  // Ladder container shift (smoothed per beat range)
  const shiftToL2 = smooth01(bannerT, 2 / 6, 3 / 6); // beat 2->3
  const shiftToL3 = smooth01(bannerT, 3 / 6, 4 / 6); // beat 3->4
  const containerShift = -20 * shiftToL2 - 20 * shiftToL3; // 0 -> -20 -> -40; continue toward -60 after L3
  const shiftAfterL3 = smooth01(bannerT, 4 / 6, 5 / 6);
  const finalContainerShift = containerShift - 20 * shiftAfterL3; // up to -60 later

  // Target left alignment: match L2 rung x plus container shift; blend from centered (50%) toward target
  const dx = payload.layout.spineEnd.x - payload.layout.spineStart.x;
  const dy = payload.layout.spineEnd.y - payload.layout.spineStart.y; // eslint-disable-line @typescript-eslint/no-unused-vars
  const rung2X = payload.layout.spineStart.x + dx * payload.layout.tValues[1];
  const targetLeftPercent = rung2X * 100 + finalContainerShift;
  const bannerLeftPercent = 50 + (targetLeftPercent - 50) * moveP;

  const bannerY = 12 * moveP;  // slight downward shift
  const baseScale = 2.0;
  const bannerScale = baseScale * (1 - 0.1 * moveP); // shrink 10% only during L1->L2 move

  // Determine active level for Detail Card
  // Beat 1 -> L1 (index 0), Beat 2 -> L2 (index 1), Beat 3 -> L3 (index 2), Beat 4 -> ULT (index 3)
  let activeRungIndex = -1;
  if (safeBeat >= 1 && safeBeat <= 4) {
    activeRungIndex = safeBeat - 1;
  } 

  const activeRung = activeRungIndex >= 0 ? payload.rungs[activeRungIndex] : null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Hero banner: starts centered (big + glow), drifts to bottom-left by L2 with softer glow, keeps gentle float */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="ladder-float pointer-events-auto"
          style={{
            position: "absolute",
            left: `${bannerLeftPercent}%`,
            top: "50%",
            transform: `translate(-50%, calc(-50% + ${bannerY}vh)) scale(${bannerScale})`,
            transition: "transform 0.25s ease-out, filter 0.9s ease-in-out, opacity 0.6s ease-in-out",
            opacity: 1,
            filter: `
              drop-shadow(0 0 ${32 - 14 * moveP}px rgba(124,231,190,${0.58 - 0.38 * moveP}))
              drop-shadow(0 0 ${28 - 10 * moveP}px rgba(143,168,255,${0.5 - 0.35 * moveP}))
            `,
          }}
        >
          <div className="ladder-float-y text-center text-white font-black leading-tight tracking-tight drop-shadow-[0_6px_24px_rgba(0,0,0,0.45)]">
            <div className="text-sm md:text-lg uppercase tracking-[0.28em] text-accent/85">
              {payload.headline}
            </div>
            <div className="text-3xl md:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-200 to-accent">
              {payload.subline}
            </div>
          </div>
        </div>
      </div>
      
      {/* Thesis & Bridge (Beat 5) - Integrated with title area */}
      <div className={`absolute bottom-32 left-16 transition-opacity duration-700 ${safeBeat >= 5 ? 'opacity-100' : 'opacity-0'}`}>
         <div className="text-xl font-medium text-accent">{payload.thesisLine}</div>
         <div className="text-sm text-slate-400 mt-1">{payload.bridgeLine}</div>
      </div>

      {/* C2 Detail Card (Bottom Right) */}
      <div className={`absolute bottom-16 right-16 w-[340px] transition-all duration-500 transform ${activeRung ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {activeRung && (
          <div className="panel glass p-4 space-y-3 pointer-events-auto border-t-4 border-accent">
             <div className="flex justify-between items-baseline border-b border-white/10 pb-2 mb-2">
               <span className="text-lg font-bold text-white">{activeRung.id} Detail</span>
               <div className="text-xs text-right">
                 <div className="text-white">Rating {activeRung.stats.rating}</div>
                 <div className="text-hint">Win {activeRung.stats.humanWinRate}%</div>
               </div>
             </div>
             
             <div className="space-y-2">
               <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Config</div>
               <div className="space-y-1">
                 {activeRung.detail.config.map((line, i) => (
                   <div key={i} className="text-xs text-slate-200">{line}</div>
                 ))}
               </div>
             </div>

             <div className="space-y-1 pt-2">
               <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Why it feels like this</div>
               <div className="space-y-1">
                 {activeRung.detail.why.map((line, i) => (
                   <div key={i} className="text-xs text-slate-300 italic">"{line}"</div>
                 ))}
               </div>
             </div>
          </div>
        )}
      </div>

      {/* A3/C3 Mapping Card (Top Right, Beat 3+) */}
      <div className={`absolute top-24 right-16 w-[260px] transition-opacity duration-1000 ${safeBeat >= 3 ? 'opacity-100' : 'opacity-0'}`}>
         <div className="panel glass p-3 pointer-events-auto bg-black/40 backdrop-blur-sm border-white/5">
            <div className="text-[10px] font-semibold text-accent uppercase mb-2 tracking-wider">Knobs → Behavior</div>
            <div className="space-y-1.5">
               {payload.mappingLines.map((line, i) => (
                 <div key={i} className="text-[10px] text-slate-300 leading-tight">{line}</div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
}


function LandscapePanel({ payload, sceneT }: { payload: LandscapePayload; sceneT: number }) {
  // State
  const [tsbVisible, setTsbVisible] = useState(false);
  const [tsbIndex, setTsbIndex] = useState(payload.tsb?.defaultIndex ?? 1);
  const [autoPlay, setAutoPlay] = useState(false); // Controls carousel

  // Derive beat index (0..5)
  const beatIndex = Math.min(Math.max(Math.floor(sceneT * 6), 0), 5);
  const lastBeatRef = useRef(-1);

  // Preload images
  useEffect(() => {
    payload.tsb?.figures.forEach(f => {
      const img = new Image();
      img.src = f.src;
    });
  }, [payload.tsb]);

  // Sync Beat 4 visibility & Start Auto-play
  useEffect(() => {
     const lastBeat = lastBeatRef.current;
     // Auto-show when crossing into beat 4+ territory
     if (beatIndex >= 4 && lastBeat < 4 && payload.tsb) {
         setTsbVisible(true);
         setAutoPlay(true); // Start carousel
     }
     // Hide when going back
     if (beatIndex < 4) {
         setTsbVisible(false);
         setAutoPlay(false);
     }
     lastBeatRef.current = beatIndex;
  }, [beatIndex, payload.tsb]);

  // Auto-play Logic (Carousel)
  useEffect(() => {
    if (!autoPlay || !payload.tsb) return;
    const interval = setInterval(() => {
        setTsbIndex(prev => (prev + 1) % payload.tsb!.figures.length);
    }, 4000); // 4 seconds per slide
    return () => clearInterval(interval);
  }, [autoPlay, payload.tsb]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // User manual override stops auto-play?
      // Optional: stop auto-play on interaction
      
      // Strip controls
      if (e.key === 't' || e.key === 'T') {
          setTsbVisible(v => {
            const next = !v;
            if (!next) setAutoPlay(false);
            return next;
          });
          return;
      }
      
      if (tsbVisible) {
        if (e.key === '[' || e.key === ']' || e.key === 'a' || e.key === 'd' || e.key === 'A' || e.key === 'D') {
            setAutoPlay(false); // User took control
            const dir = (e.key === '[' || e.key === 'a' || e.key === 'A') ? -1 : 1;
            setTsbIndex(prev => {
                const len = payload.tsb.figures.length;
                return (prev + dir + len) % len;
            });
            return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tsbVisible, payload.tsb]);

  return (
    <div className="absolute inset-0 flex flex-col pointer-events-none">
      {/* Top Poster Area - Strictly confined above strip */}
      <div className="absolute top-0 left-0 right-0 bottom-[20%] pointer-events-auto flex items-center justify-center p-6 overflow-hidden">
        <div className="panel glass max-w-4xl w-full max-h-full overflow-y-auto custom-scrollbar">
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
      </div>

      {/* TSB Strip */}
      {payload.tsb && (
        <TSBStrip 
          figures={payload.tsb.figures}
          selectedIndex={tsbIndex}
          onSelect={(idx) => {
              setTsbIndex(idx);
              setAutoPlay(false); // Stop auto-play on click
          }}
          visible={tsbVisible}
          dimmed={beatIndex >= 5} 
          hint={payload.tsb.hint}
        />
      )}

      {/* Hero (Center Carousel) */}
      {payload.tsb && (
        <TSBHero 
          figure={payload.tsb.figures[tsbIndex]}
          visible={tsbVisible}
        />
      )}
    </div>
  );
}
