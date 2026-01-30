import React, { useState, useEffect, useMemo } from 'react';
import { Html } from "@react-three/drei";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { XRayPayload, XRayLevel } from "../../../../data/presentation";
import { SearchTreePanel } from "./SearchTreePanel";
import { MetricsCard } from "./MetricsCard";
import { PVStrip } from "./PVStrip";
import { CompareTable } from "./CompareTable";
import { ScanlineCurtain } from "./ScanlineCurtain";
import * as THREE from "three";

type Props = {
  payload: XRayPayload;
  sceneT: number;
  isActive: boolean;
  warmup?: boolean;
  liteMode?: boolean;
};

const LEVELS: XRayLevel[] = ["L1", "L2", "L3", "ULT"];

export default function XRayScene({ payload, sceneT, isActive, warmup }: Props) {
  // Prevent bleed into other scenes when cached but inactive
  if (!isActive || warmup) return null;
  // Map sceneT (0..1) to discrete beat (0..5)
  // 0.0 = Beat 0
  // 0.2 = Beat 1
  // 0.4 = Beat 2
  // 0.6 = Beat 3
  // 0.8 = Beat 4
  // 1.0 = Beat 5
  const beat = Math.min(5, Math.floor((sceneT + 0.01) * 5));

  const [activeLevel, setActiveLevel] = useState<XRayLevel>("ULT"); // Default to ULT or L3? User didn't specify, but ULT shows most features. L3 is good too.

  // Keyboard listener for 1/2/3/4
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === '1') setActiveLevel("L1");
        if (e.key === '2') setActiveLevel("L2");
        if (e.key === '3') setActiveLevel("L3");
        if (e.key === '4') setActiveLevel("ULT");
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  const currentLevelData = payload.levels[activeLevel];
  
  // Prepare Tree Spec
  const treeSpec = currentLevelData.treeSpec;

  // Active Move Logic (Playback)
  // Beat 1 (0.2 -> 0.4 sceneT) drives the PV animation
  const activeMoveIndex = useMemo(() => {
    if (beat < 1) return -1;
    if (beat === 1) {
        // Map sceneT range [0.2, 0.4] to [0, totalMoves]
        const t = Math.max(0, Math.min(1, (sceneT - 0.2) / 0.15)); // slightly faster than full beat
        const totalMoves = currentLevelData.pvUci.length;
        return Math.floor(t * (totalMoves + 1)) - 1;
    }
    // After beat 1, show full PV state
    return currentLevelData.pvUci.length - 1;
  }, [beat, sceneT, currentLevelData]);

  const currentFen = useMemo(() => {
    if (activeMoveIndex < 0) return payload.baseFen;
    try {
        const chess = new Chess(payload.baseFen);
        for (let i = 0; i <= activeMoveIndex; i++) {
            const uci = currentLevelData.pvUci[i];
            if (uci) {
                chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
            }
        }
        return chess.fen();
    } catch (e) {
        console.error("Fen generation error", e);
        return payload.baseFen;
    }
  }, [activeMoveIndex, currentLevelData, payload.baseFen]);
  
  // Board Arrows
  const arrows: [string, string][] = useMemo(() => {
    // Show arrow for NEXT move
    const nextMoveIndex = activeMoveIndex + 1;
    if (nextMoveIndex < currentLevelData.pvUci.length && beat >= 1) {
         const move = currentLevelData.pvUci[nextMoveIndex];
         if (move && move.length >= 4) {
            return [[move.substring(0,2), move.substring(2,4)]];
         }
    }
    return [];
  }, [activeMoveIndex, beat, currentLevelData]);

  // Layout Constants
  // Left: Tree Panel (HTML)
  // Right Top: Board (HTML)
  // Right Bottom: PV Strip (HTML)
  // Bottom Right: Metrics (HTML)

  // We use <Html> to render these DOM elements into the scene.
  
  const showCompare = beat === 5;

  return (
    <group position={[0, 0, 0]}>
        {/* Transition Curtain */}
        {isActive && <Html fullscreen style={{pointerEvents: 'none', zIndex: 100}}><ScanlineCurtain /></Html>}

        {/* Main Content Container */}
        <Html fullscreen style={{ pointerEvents: 'none', zIndex: 10 }}>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/80">
                <div className="relative w-full max-w-7xl h-full flex flex-col items-center p-6 md:p-12">
                
                    {/* Header */}
                    <div className={`text-center mb-8 shrink-0 transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                        <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-500 drop-shadow-[0_0_20px_rgba(34,211,238,0.4)] tracking-tight">
                            {payload.headline}
                        </h1>
                        <p className="text-slate-300 text-sm md:text-base mt-2 tracking-[0.2em] uppercase font-medium">{payload.subline}</p>
                    </div>

                    {!showCompare ? (
                        <div className="flex w-full h-[600px] gap-8 min-h-0 items-center justify-center">
                            {/* LEFT: Tree Panel */}
                            <div className="flex-1 flex flex-col min-h-0 min-w-[400px] bg-slate-900/60 border border-slate-700/50 rounded-xl backdrop-blur-md overflow-hidden shadow-2xl h-full">
                                 <div className="px-6 py-4 bg-white/5 border-b border-white/5 flex justify-between items-center shrink-0">
                                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
                                        Search Tree Visualization
                                    </span>
                                    <span className="px-2 py-1 bg-cyan-500/10 text-cyan-400 text-xs font-mono font-bold rounded border border-cyan-500/20">
                                        LEVEL: {activeLevel}
                                    </span>
                                 </div>
                                 <div className="flex-1 relative w-full h-full p-4 overflow-hidden">
                                    <SearchTreePanel 
                                        spec={treeSpec} 
                                        beat={beat} 
                                        width={800} 
                                        height={600} 
                                        activeMoveIndex={activeMoveIndex}
                                    />
                                 </div>
                            </div>

                            {/* RIGHT: Board + Metrics */}
                            <div className="w-[380px] flex flex-col gap-4 shrink-0 h-full">
                                {/* Board */}
                                <div className="aspect-square bg-slate-900 rounded-xl shadow-2xl border border-slate-700 overflow-hidden relative group shrink-0">
                                    <Chessboard 
                                        position={currentFen} 
                                        arePiecesDraggable={false}
                                        boardWidth={380}
                                        customArrows={arrows.map(a => [a[0] as any, a[1] as any, 'rgb(251, 191, 36)'])} 
                                        customSquareStyles={{}} 
                                        customDarkSquareStyle={{ backgroundColor: '#334155' }}
                                        customLightSquareStyle={{ backgroundColor: '#94a3b8' }}
                                        animationDuration={200}
                                    />
                                    {/* Level Tabs Overlay */}
                                    <div className="absolute top-3 right-3 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        {LEVELS.map(l => (
                                            <button 
                                                key={l}
                                                onClick={() => setActiveLevel(l)}
                                                className={`px-2 py-1 text-[10px] font-bold rounded border backdrop-blur-md transition-all ${activeLevel === l ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)] scale-110' : 'bg-black/60 text-slate-400 border-slate-600 hover:bg-slate-800'}`}
                                            >
                                                {l}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* PV Strip */}
                                <div className="shrink-0">
                                    <PVStrip 
                                        pvUci={currentLevelData.pvUci} 
                                        beat={beat}
                                        level={activeLevel}
                                        activeIndex={activeMoveIndex}
                                    />
                                </div>

                                {/* Metrics Card */}
                                <div className="grow flex flex-col justify-end">
                                    <MetricsCard 
                                        metrics={currentLevelData.metrics} 
                                        beat={beat} 
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Beat 5: Compare Table */
                        <div className="w-full max-w-5xl mt-8 flex flex-col items-center justify-center min-h-[400px]">
                            <CompareTable lines={payload.compareLines} />
                            <div className="mt-12 text-center animate-pulse text-cyan-400 font-mono text-base tracking-wide">
                                {payload.bridgeLine}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Html>
    </group>
  );
}
