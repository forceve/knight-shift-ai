import { useMemo } from "react";
import { Html } from "@react-three/drei";
import { LadderPayload } from "../../../data/presentation";

type Props = { payload: LadderPayload; sceneT: number; liteMode: boolean; isActive: boolean; warmup: boolean };

export default function LadderScene({ payload, sceneT, isActive, warmup }: Props) {
  const { layout, rungs } = payload;
  
  // Calculate beat logic (same as Panel)
  const beatIndex = Math.floor(sceneT * 6);
  const safeBeat = Math.min(Math.max(beatIndex, 0), 5);
  
  // Beat 0: Intro (spine draws in)
  // Beat 1: L1 (highlight to t[0])
  // Beat 2: L2 (highlight to t[1])
  // Beat 3: L3 (highlight to t[2])
  // Beat 4: ULT (highlight to t[3])
  // Beat 5: Summary (highlight full or keep at ULT)

  // Calculate geometry
  // CSS Coords: (0,0) top-left.
  // spineStart (0.1, 0.18) -> spineEnd (0.9, 0.06)
  // dx > 0, dy < 0 (going up)
  // Aspect ratio correction for 16:9 (Screen is wider, so visual angle is flatter than normalized angle)
  const aspect = 16 / 9;
  const dx = layout.spineEnd.x - layout.spineStart.x;
  const dy = layout.spineEnd.y - layout.spineStart.y;
  // We want visual angle: atan2(pixelDy, pixelDx) = atan2(dy * H, dx * W) = atan2(dy, dx * (W/H))
  const angleRad = Math.atan2(dy, dx * aspect);
  const angleDeg = angleRad * (180 / Math.PI);
  
  // Progress calculation
  let activeT = 0;
  if (safeBeat >= 1 && safeBeat <= 4) {
      activeT = layout.tValues[safeBeat - 1];
  } else if (safeBeat >= 5) {
      activeT = layout.tValues[3]; // Keep at ULT (max)
  }

  // Determine card visibility state
  // Beat 0: No cards
  // Beat 1..4: Current card focused (opacity 1, scale 1), others hidden or dim
  // Beat 5: All cards visible (summary)

  // Shift logic to make room for UI cards on the right
  let containerX = 0;
  if (safeBeat === 2) containerX = -20; // L2
  if (safeBeat === 3) containerX = -40; // L3
  if (safeBeat >= 4) containerX = -60; // ULT

  return (
    <group>
      <Html fullscreen style={{ pointerEvents: "none", zIndex: 0 }}>
        <div 
          className="w-full h-full relative font-sans text-slate-200 transition-transform duration-1000 ease-in-out"
          style={{ transform: `translateX(${containerX}%)` }}
        >
           {/* Spine SVG Layer */}
           <svg className="absolute inset-0 w-full h-full overflow-visible">
              <defs>
                <filter id="glow-spine">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {/* Base Spine (Dim) */}
              <line 
                x1={`${layout.spineStart.x * 100}%`} y1={`${layout.spineStart.y * 100}%`}
                x2={`${layout.spineEnd.x * 100}%`} y2={`${layout.spineEnd.y * 100}%`}
                stroke="white" strokeWidth="2" strokeOpacity="0.1"
                className={`transition-all duration-1000 ease-out ${isActive ? 'opacity-100' : 'opacity-0'}`}
              />
              
              {/* Active Spine (Progress) */}
              {activeT > 0 && (
                <line 
                  x1={`${layout.spineStart.x * 100}%`} y1={`${layout.spineStart.y * 100}%`}
                  x2={`${(layout.spineStart.x + dx * activeT) * 100}%`} 
                  y2={`${(layout.spineStart.y + dy * activeT) * 100}%`}
                  stroke="#7ce7be" strokeWidth="4" strokeLinecap="round"
                  filter="url(#glow-spine)"
                  className="transition-all duration-700 ease-out"
                />
              )}
           </svg>

           {/* Rungs & Cards */}
           {rungs.map((rung, idx) => {
             const t = layout.tValues[idx];
             const rx = layout.spineStart.x + dx * t;
             const ry = layout.spineStart.y + dy * t;
             
             // Rung Position (Screen %)
             const left = `${rx * 100}%`;
             const top = `${ry * 100}%`;
             
             // States
             const isReached = activeT >= t - 0.001; 
             const isFocused = (safeBeat === idx + 1);
             const isSummary = safeBeat >= 5;
             
             // Visibility Logic:
             // Focused: Bright, Lifted
             // Summary: All visible, standard opacity
             // Inactive (but reached): Dimmed (if Beat < 5)
             // Not reached: Hidden
             
             let cardOpacity = 0;
             let cardY = 0;
             let cardScale = 0.95;
             
             if (isFocused) {
               cardOpacity = 1;
               cardY = 20; // "Lifted" relative to base offset? Or closer? Prompt says "float up 4-8px".
               // Let's say base offset is 60px. Lifted is 50px.
               cardY = 40; 
               cardScale = 1.05;
             } else if (isSummary) {
               cardOpacity = 0.9;
               cardY = 50; 
               cardScale = 1.0;
             } else if (isReached && safeBeat > idx + 1) {
               // Passed levels
               cardOpacity = 0.3; // "Dim"
               cardY = 60;
               cardScale = 0.95;
             } else {
               // Future levels or intro
               cardOpacity = 0;
               cardY = 80;
             }

             return (
               <div key={rung.id} className="absolute" style={{ left, top }}>
                 {/* Rung Node */}
                 <div 
                   className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all duration-500 z-10
                     ${isFocused ? 'w-5 h-5 bg-accent border-white shadow-[0_0_20px_rgba(124,231,190,0.8)]' : 
                       isReached ? 'w-3 h-3 bg-slate-700 border-slate-500' : 'w-2 h-2 bg-slate-900 border-slate-800 opacity-30'}
                   `}
                 />
                 
                 {/* Floating Card Container */}
                 <div 
                   className="absolute origin-top-left transition-all duration-700 ease-out will-change-transform"
                   style={{ 
                     transform: `rotate(${angleDeg}deg) translate(-20px, ${cardY}px) scale(${cardScale})`, 
                     opacity: cardOpacity,
                     width: '240px',
                     pointerEvents: 'auto'
                   }}
                 >
                   <div className={`
                      backdrop-blur-md border rounded-xl p-3 shadow-2xl overflow-hidden
                      ${isFocused ? 'bg-slate-900/90 border-accent/60' : 'bg-slate-900/50 border-white/10'}
                   `}>
                      {/* Header */}
                      <div className="flex items-center justify-between mb-1.5 border-b border-white/5 pb-1">
                        <span className={`text-sm font-bold tracking-wider ${isFocused ? 'text-accent' : 'text-slate-300'}`}>
                          {rung.id}
                        </span>
                         {/* Mini Stats (Compact) */}
                         <div className="flex gap-2 text-[9px] text-slate-500 font-mono">
                          <span>R:{rung.stats.rating}</span>
                          <span>W:{rung.stats.humanWinRate}%</span>
                        </div>
                      </div>
                      
                      {/* Body */}
                      <div className="space-y-0.5 mb-2">
                         <div className="text-xs text-slate-100 font-medium truncate">{rung.feels}</div>
                         <div className="text-[10px] text-slate-400 italic truncate">{rung.signature}</div>
                      </div>
                      
                      {/* Chips */}
                      <div className="flex flex-wrap gap-1">
                          {rung.chips.map(chip => (
                            <span key={chip} className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-slate-400 whitespace-nowrap">
                              {chip}
                            </span>
                          ))}
                        </div>
                   </div>
                 </div>
               </div>
             );
           })}
        </div>
      </Html>
    </group>
  );
}
