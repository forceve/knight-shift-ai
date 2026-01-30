import { Html } from "@react-three/drei";
import { HarnessPayload } from "../../../data/presentation";
import { motion, AnimatePresence } from "framer-motion";
import scoreImg from "../../../image/score.png";

type Props = { payload: HarnessPayload; sceneT: number; liteMode: boolean; isActive: boolean; warmup: boolean };

export default function PipelineScene({ payload, sceneT, isActive, warmup }: Props) {
  // Avoid leaking overlay into other scenes when cached
  if (!isActive || warmup) return null;
  // Map sceneT (0..1) to beats 0..5
  const beatIndex = Math.min(Math.floor(sceneT * 6), 5);

  return (
    <group>
      <ambientLight intensity={0.5} />
      {/* 2D Overlay */}
      <Html fullscreen style={{ pointerEvents: 'none', zIndex: 10 }}>
        <div className="absolute inset-0 flex flex-col p-8 md:p-12 pointer-events-auto select-none overflow-hidden">
          
          {/* A1 Header */}
          <header className="flex justify-between items-start mb-4 z-20">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-1">
                {payload.headline}
              </h1>
              <div className="text-xl md:text-2xl text-slate-400 font-light tracking-wide flex items-center gap-3">
                {payload.subline}
              </div>
            </div>
            <div className="text-right hidden md:block">
              <div className="text-lg text-accent font-medium bg-accent/10 px-4 py-2 rounded-full border border-accent/20">
                {payload.thesisLine}
              </div>
            </div>
          </header>

          {/* A2 Main Diagram */}
          <div className="flex-1 relative flex items-center justify-center">
             {/* Background Score Image for Beat 1 (M2M Standard) */}
             <div 
               className={`absolute right-[10%] top-[55%] -translate-y-1/2 w-1/3 h-2/3 transition-all duration-700 pointer-events-none mix-blend-screen opacity-0 ${beatIndex === 1 ? "!opacity-40" : ""}`}
               style={{ zIndex: 0 }}
             >
                <img src={scoreImg} alt="Score Matrix" className="w-full h-full object-contain object-right" />
             </div>

             {/* Human Results Table for Beat 2 (Human Study) */}
             <div 
               className={`absolute right-[25%] top-[80%] -translate-y-1/2 w-[400px] transition-all duration-700 pointer-events-none ${beatIndex === 2 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}
               style={{ zIndex: 5 }}
             >
               <GlassCard title="Human Player Assessment Results" active={true}>
                 <table className="w-full text-[10px] md:text-xs text-slate-300 text-right border-separate border-spacing-y-1">
                   <thead>
                     <tr className="text-slate-500 text-[9px] uppercase tracking-wider">
                       <th className="text-left pb-1 font-medium">Level</th>
                       <th className="pb-1 font-medium">Avg Diff</th>
                       <th className="pb-1 font-medium">Win%</th>
                       <th className="pb-1 font-medium">Len</th>
                     </tr>
                   </thead>
                   <tbody>
                     {[
                       { l: "Level 1", d: "1.8", w: "65", m: "45.2" },
                       { l: "Level 2", d: "2.4", w: "45", m: "42.8" },
                       { l: "Level 3", d: "3.1", w: "35", m: "43.7" },
                       { l: "Ultimate", d: "3.6", w: "33", m: "45.8" },
                     ].map((row, i) => (
                       <tr key={row.l} className={`bg-white/5 hover:bg-white/10 transition-colors ${i === 3 ? 'border-l-2 border-accent' : ''}`}>
                         <td className="text-left py-1.5 px-2 rounded-l font-semibold text-slate-200">{row.l}</td>
                         <td className="py-1.5 px-2">{row.d}</td>
                         <td className={`py-1.5 px-2 ${Number(row.w) > 50 ? 'text-accent' : 'text-slate-400'}`}>{row.w}%</td>
                         <td className="py-1.5 px-2 rounded-r">{row.m}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </GlassCard>
             </div>

             {/* A3 Rules Card - Moved to Top Right to balance Lanes */}
             <div className={`absolute right-0 top-10 transition-all duration-700 ${beatIndex >= 0 ? 'opacity-100' : 'opacity-0'}`} style={{ zIndex: 10 }}>
              <GlassCard title="Unified Rules" active={false}>
                <ul className="space-y-1.5 text-xs md:text-sm text-slate-300">
                  {payload.rulesCard.map((line, i) => (
                    <li key={i} className="flex items-start">
                      <span className="mr-2 text-accent/50">✓</span> {line}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </div>

             <HarnessDiagram payload={payload} beatIndex={beatIndex} />
          </div>

          {/* Cards Area (Footer) */}
          <div className="relative h-32 z-20 w-full">
            
            {/* A4 Throughput Card (Bottom Left) */}
            <div className={`absolute bottom-0 left-0 transition-all duration-700 transform ${beatIndex >= 4 ? 'opacity-100 translate-y-0' : 'opacity-60 translate-y-2'}`}>
              <GlassCard title="Throughput & Dispatch" active={beatIndex === 4}>
                <ul className="space-y-1.5 text-xs md:text-sm text-slate-300">
                  {payload.throughputCard.map((line, i) => (
                    <li key={i} className="flex items-start">
                      <span className="mr-2 text-accent/50">▸</span> {line}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </div>

            {/* Bridge Text (Bottom Center) */}
            <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 text-center transition-opacity duration-700 ${beatIndex >= 5 ? 'opacity-100' : 'opacity-0'}`}>
               <div className="text-slate-400 italic text-sm md:text-base tracking-wide border-b border-accent/30 pb-1 whitespace-nowrap">
                 {payload.bridgeLine}
               </div>
            </div>

          </div>
        </div>
      </Html>
    </group>
  );
}

function GlassCard({ title, children, active }: { title: string, children: React.ReactNode, active: boolean }) {
  // Auto-width if no fixed width is needed, but default is w-72 for consistency
  return (
    <div className={`bg-black/60 backdrop-blur-md border rounded-xl p-4 transition-all duration-500 ${active ? 'border-accent shadow-[0_0_20px_rgba(34,211,238,0.2)] bg-black/80 scale-105' : 'border-white/10'} ${title.includes("Results") ? 'w-auto' : 'w-72'}`}>
      <div className={`text-[10px] uppercase tracking-widest font-bold mb-3 ${active ? 'text-accent' : 'text-slate-500'}`}>
        {title}
      </div>
      {children}
    </div>
  );
}

function HarnessDiagram({ payload, beatIndex }: { payload: HarnessPayload, beatIndex: number }) {
  // Layout constants
  const trunkY = 130; // SVG coordinate - aligned with nodes at top-100px (approx center of node height)
  const lanes = payload.lanes;

  // Active states
  const activeLaneIdx = beatIndex >= 1 && beatIndex <= 3 ? beatIndex - 1 : -1; // 0, 1, 2
  const throughputActive = beatIndex === 4;
  const outputActive = beatIndex === 5;
  
  // Pipeline Nodes (simplified for visual flow)
  const trunkNodes = payload.trunkNodes;
  
  return (
    <div className="relative w-full max-w-6xl h-[500px]">
       {/* SVG Layer for Connections */}
       <svg className="absolute inset-0 w-full h-full overflow-visible" style={{ zIndex: 0 }}>
          <defs>
            <linearGradient id="trunkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#334155" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#334155" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#334155" stopOpacity="0.2" />
            </linearGradient>
            <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
              <polygon points="0 0, 6 2, 0 4" fill="#475569" />
            </marker>
          </defs>

          {/* Trunk Line */}
          <path d={`M 280 ${trunkY} L 950 ${trunkY}`} stroke="url(#trunkGradient)" strokeWidth="4" strokeLinecap="round" />
          
          {/* Flowing Particles (The "Slow Dots") */}
          <TrunkFlow active={beatIndex > 0} y={trunkY} startX={280} endX={950} />

          {/* Lane Connections to Config/Trunk */}
          {lanes.map((lane, i) => {
             const laneY = 100 + i * 150; // 100, 250, 400
             const isLaneActive = activeLaneIdx === i;
             const strokeColor = isLaneActive ? "#22d3ee" : "#475569";
             const opacity = isLaneActive ? 1 : 0.3;
             
             // Curve from lane right to trunk start
             // Adjust: Lanes are on left. Trunk starts at 280.
             // Lane boxes end around 250.
             return (
               <g key={lane.id} style={{ opacity, transition: 'opacity 0.5s' }}>
                 <path 
                   d={`M 240 ${laneY} C 260 ${laneY}, 260 ${trunkY}, 280 ${trunkY}`} 
                   fill="none" 
                   stroke={strokeColor} 
                   strokeWidth={isLaneActive ? 2 : 1}
                   markerEnd="url(#arrowhead)"
                 />
               </g>
             );
          })}
       </svg>

       {/* DOM Layer for Nodes & Cards */}
       
       {/* Lanes (Left Column) */}
       <div className="absolute left-0 top-0 bottom-0 w-[240px] flex flex-col justify-between py-12">
          {lanes.map((lane, i) => {
             const isActive = activeLaneIdx === i;
             return (
               <div key={lane.id} className={`relative p-4 rounded-lg border backdrop-blur-sm transition-all duration-500 ${isActive ? 'bg-slate-800/80 border-accent shadow-lg scale-105 z-10' : 'bg-slate-900/40 border-white/5 opacity-50 grayscale'}`}>
                  <div className={`text-xs font-bold uppercase mb-2 ${isActive ? 'text-accent' : 'text-slate-500'}`}>
                    {lane.title}
                  </div>
                  <ul className="space-y-1">
                    {lane.bullets.map((b, idx) => (
                      <li key={idx} className="text-[10px] md:text-xs text-slate-300 leading-tight">
                        {b}
                      </li>
                    ))}
                  </ul>
                  {/* Tags */}
                  {lane.tags && lane.tags.length > 0 && (
                     <div className="mt-2 flex flex-wrap gap-1">
                       {lane.tags.map(tag => (
                          <span key={tag} className={`text-[9px] px-1.5 py-0.5 rounded border ${isActive ? 'border-accent/30 text-accent bg-accent/5' : 'border-white/5 text-slate-600'}`}>
                            {tag}
                          </span>
                       ))}
                     </div>
                  )}
                  {/* Human Study Remote Node Special */}
                  {lane.id === 'h2m_human' && isActive && (
                     <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] text-emerald-300">Remote · SakuraFRP</span>
                     </div>
                  )}
               </div>
             )
          })}
       </div>

       {/* Main Trunk Nodes (Horizontal) - Aligned with top edge of M2M Standard lane */}
       <div className="absolute left-[280px] right-0 top-[100px] h-[60px] flex items-center justify-between pr-12">
          {trunkNodes.map((node, i) => {
             // Highlight Logic
             let isNodeActive = false;
             if (node === "Figures" && outputActive) isNodeActive = true;
             if ((node === "Workers (≤20)" || node === "Queue (Batch)") && throughputActive) isNodeActive = true;
             if (node === "Aggregator" && activeLaneIdx === 0) isNodeActive = true; // Highlight for M2M Standard
             if (node === "Workers (≤20)" && activeLaneIdx === 2) isNodeActive = true; // Time scaled
             
             // Base Style
             const isFigures = node === "Figures";
             
             return (
               <div key={node} className={`relative px-3 py-2 rounded-md border text-center transition-all duration-500 flex flex-col items-center gap-1 bg-black/50 backdrop-blur-sm ${isNodeActive ? 'border-accent text-white shadow-[0_0_15px_rgba(34,211,238,0.4)] scale-110 z-10' : 'border-white/10 text-slate-500'}`}>
                  <div className="text-[10px] uppercase font-semibold tracking-wider whitespace-nowrap">
                    {node}
                  </div>
                  {/* Status Indicator for specific nodes */}
                  {node.includes("Queue") && throughputActive && (
                     <div className="text-[9px] text-accent animate-pulse">Running</div>
                  )}
                  
                  {/* Output Emitter for Figures */}
                  {isFigures && (
                    <div className="absolute top-full mt-4 flex gap-4 pointer-events-none">
                      <AnimatePresence>
                        {outputActive && payload.outputs.map((out, idx) => (
                           <motion.div
                             key={out.id}
                             layoutId={`output-card-${out.id}`}
                             initial={{ opacity: 0, y: -20, scale: 0.5 }}
                             animate={{ opacity: 1, y: 0, scale: 1 }}
                             exit={{ opacity: 0, scale: 0.5, y: 20 }} // Should ideally fly to next scene
                             transition={{ delay: idx * 0.1, duration: 0.4 }}
                             className="w-24 h-28 bg-white text-slate-900 rounded-lg p-2 shadow-xl flex flex-col justify-between items-center text-center border border-slate-300"
                           >
                              <div className="w-full h-1/2 bg-slate-100 rounded mb-1 overflow-hidden relative flex items-center justify-center">
                                  {out.id === 'score' ? (
                                     <img src={scoreImg} alt="Score" className="w-full h-full object-cover opacity-80" />
                                  ) : (
                                    <>
                                      <div className="absolute bottom-0 left-1 w-1 h-[60%] bg-slate-400" />
                                      <div className="absolute bottom-0 left-3 w-1 h-[80%] bg-slate-400" />
                                      <div className="absolute bottom-0 left-5 w-1 h-[40%] bg-slate-400" />
                                    </>
                                  )}
                              </div>
                              <div className="text-[9px] font-bold leading-tight">{out.label}</div>
                           </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
               </div>
             )
          })}
       </div>

    </div>
  );
}

// Animated Flow Component
function TrunkFlow({ active, y, startX, endX }: { active: boolean, y: number, startX: number, endX: number }) {
  if (!active) return null;
  
  // Create a few dots moving
  return (
    <>
      {[0, 1, 2].map(i => (
        <motion.circle 
          key={i}
          r={3}
          fill="#22d3ee"
          filter="url(#glow)"
          initial={{ cx: startX, cy: y, opacity: 0 }}
          animate={{ cx: endX, opacity: [0, 1, 1, 0] }}
          transition={{ 
            duration: 3, 
            repeat: Infinity, 
            delay: i * 1,
            ease: "linear" 
          }}
        />
      ))}
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
    </>
  )
}
