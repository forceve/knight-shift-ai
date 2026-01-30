import { Html, Line } from "@react-three/drei";
import { Chessboard } from "react-chessboard";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { FreezePayload } from "../../../../data/presentation";
import * as THREE from "three";

type Props = { payload: FreezePayload; sceneT: number; liteMode: boolean; isActive: boolean; warmup: boolean };

const squareToPosition = (square: string | undefined, side: "left" | "right" | "center", splitProgress: number) => {
  if (!square || square.length < 2) return [0, 0, 0] as [number, number, number];
  const file = square.charCodeAt(0) - "a".charCodeAt(0);
  const rank = parseInt(square.charAt(1), 10) - 1;
  const squareSize = 0.22;
  
  // Center: x=0. Left: x=-1.8. Right: x=1.8.
  const targetBaseX = side === "left" ? -1.8 : side === "right" ? 1.8 : 0;
  const baseX = THREE.MathUtils.lerp(0, targetBaseX, splitProgress);
  
  const baseY = -0.6;
  const x = baseX + (file - 3.5) * squareSize;
  const y = baseY + (rank - 3.5) * squareSize;
  return [x, y, -0.4] as [number, number, number];
};

const RenderArrow = ({ from, to, color, side, splitProgress }: { from: string; to: string; color: string; side: "left" | "right" | "center"; splitProgress: number }) => {
  const start = squareToPosition(from, side, splitProgress);
  const end = squareToPosition(to, side, splitProgress);
  const mid: [number, number, number] = [(start[0] + end[0]) / 2, start[1] + 0.35, (start[2] + end[2]) / 2];
  return <Line points={[start, mid, end]} color={color} lineWidth={2.5} transparent opacity={0.8} />;
};

export default function FreezeScene({ payload, sceneT, warmup, isActive }: Props) {
  // Logic:
  // 0.0-0.2: Intro (InitialFen)
  // 0.2-0.4: Opponent Move (White Qe4)
  // 0.4-0.6: Split (Transition)
  // 0.6-0.8: Parallel 1 (Left: ...Qxe4, Right: ...Qxh2#)
  // 0.8-1.0: Parallel 2 (Left: Bf7#, Right: Hold)
  
  const splitProgress = THREE.MathUtils.smoothstep(sceneT, 0.4, 0.55);
  // mergeProgress unused for board position (boards stay split), but used for logic triggers
  const mergeProgress = THREE.MathUtils.smoothstep(sceneT, 0.95, 1.0);
  
  const isIntro = sceneT < 0.2;
  const isOpponentMove = sceneT >= 0.2 && sceneT < 0.6; // Keep showing move during split
  const isParallel1 = sceneT >= 0.6 && sceneT < 0.8;
  const isParallel2 = sceneT >= 0.8;

  // Title Animation Logic
  // 1. Enter: sceneT 0.15 -> 0.25 (Fade in + Slide up to Top)
  // 2. Stay: 0.25 -> 0.9
  // 3. Morph to Center: sceneT 0.9 -> 1.0 (Slide down to Center + Scale Up)
  const titleAnim = useMemo(() => {
    let y = 3.5;
    let z = 0;
    let scale = 1;
    let opacity = 0;

    if (sceneT < 0.15) {
        opacity = 0;
    } else if (sceneT < 0.25) {
        // Entering
        const p = THREE.MathUtils.smoothstep(sceneT, 0.15, 0.25);
        opacity = p;
        y = THREE.MathUtils.lerp(1.5, 3.5, p);
    } else if (sceneT < 0.9) {
        // Holding at Top
        opacity = 1;
        y = 3.5;
    } else {
        // Dropping to Center
        const p = THREE.MathUtils.smoothstep(sceneT, 0.9, 1.0);
        opacity = 1;
        y = THREE.MathUtils.lerp(3.5, 1, p);
        z = THREE.MathUtils.lerp(0, 2, p);
        scale = THREE.MathUtils.lerp(1, 1.3, p);
    }
    return { position: [0, y, z] as [number, number, number], opacity, scale };
  }, [sceneT]);

  const titleVisuals = useMemo(() => {
    const warningProgress = THREE.MathUtils.clamp((sceneT - 0.8) / 0.2, 0, 1);
    const lerpColor = (from: string, to: string) => new THREE.Color(from).lerp(new THREE.Color(to), warningProgress).getStyle();
    const start = lerpColor("#67e8f9", "#fbbf24");
    const mid = lerpColor("#60a5fa", "#f97316");
    const end = lerpColor("#a855f7", "#ef4444");
    const neon = "#22d3ee";
    const strokeWidth = THREE.MathUtils.lerp(0.4, 2.2, warningProgress);
    const strokeColor = "#ff49e1";
    const glowRadius = THREE.MathUtils.lerp(16, 32, warningProgress);
    const glowAlpha = 0.35 + warningProgress * 0.3;
    const shimmerOffset = `${40 + warningProgress * 40}% 50%`;
    return {
      warningProgress,
      gradient: `linear-gradient(120deg, ${start}, #f472b6, ${mid}, ${neon}, ${end})`,
      stroke: `${strokeWidth}px ${strokeColor}`,
      textShadow: [
        `0 0 ${glowRadius}px rgba(255,73,225,${glowAlpha})`,
        `0 0 ${glowRadius * 0.6}px rgba(250,204,21,${glowAlpha * 0.8})`,
        `0 0 ${glowRadius * 0.5}px rgba(56,189,248,${glowAlpha * 0.7})`
      ].join(", "),
      shimmerOffset,
    };
  }, [sceneT]);

  // FEN Selection
  const currentFenLeft = useMemo(() => {
    if (isIntro) return payload.initialFen;
    if (isOpponentMove) return payload.initialFen; // Keep showing initialFen + arrow
    
    // For Parallel steps:
    // Distribute steps from 0.6 to 1.0
    if (sceneT >= 0.6) {
        const steps = payload.leftLine.steps;
        const progress = (sceneT - 0.6) / 0.4;
        const stepIndex = Math.min(steps.length - 1, Math.floor(progress * steps.length));
        return steps[stepIndex]?.fen ?? payload.initialFen;
    }
    
    return payload.initialFen;
  }, [sceneT, isIntro, isOpponentMove, payload]);

  const currentFenRight = useMemo(() => {
    if (isIntro) return payload.initialFen;
    if (isOpponentMove) return payload.initialFen;
    
    if (sceneT >= 0.6) {
        const steps = payload.rightLine.steps;
        const progress = (sceneT - 0.6) / 0.4;
        const stepIndex = Math.min(steps.length - 1, Math.floor(progress * steps.length));
        return steps[stepIndex]?.fen ?? payload.initialFen;
    }
    
    return payload.initialFen;
  }, [sceneT, isIntro, isOpponentMove, payload]);

  // Last Move Highlights
  const getMoveHighlights = (lastMove: string | undefined, color: string): Record<string, React.CSSProperties> => {
      if (!lastMove || lastMove.length < 4) return {};
      const from = lastMove.substring(0, 2);
      const to = lastMove.substring(2, 4);
      return {
          [from]: { backgroundColor: color },
          [to]: { backgroundColor: color },
      };
  };

  const customSquareStylesLeft = useMemo(() => {
    const steps = payload.leftLine.steps;
    const progress = (sceneT - 0.6) / 0.4;
    const stepIndex = sceneT >= 0.6 ? Math.min(steps.length - 1, Math.floor(progress * steps.length)) : 0;
    
    const currentStep = steps[stepIndex];
    const moveColor = "rgba(255, 255, 0, 0.4)"; // Yellow for moves
    
    let styles: Record<string, React.CSSProperties> = getMoveHighlights(currentStep?.lastMove, moveColor);

    if (sceneT >= 0.6) {
        if (stepIndex === steps.length - 1) {
            // Final Step: Mate
            // Highlight Mate square (d5) and King (e7) - Hardcoded for this specific demo
            styles = { ...styles, ...{
                d5: { backgroundColor: "rgba(239, 68, 68, 0.8)", boxShadow: "0 0 10px rgba(239, 68, 68, 0.8)" }, 
                e7: { backgroundColor: "rgba(239, 68, 68, 0.8)" } 
            }};
        } else if (stepIndex === 0) {
            // Step 0: Blunder (Bxd1)
            styles = { ...styles, ...{
                d1: { backgroundColor: "rgba(239, 68, 68, 0.5)" } // Red tint
            }};
        }
    }
    return styles;
  }, [sceneT, payload]);

  const customSquareStylesRight = useMemo(() => {
    const steps = payload.rightLine.steps;
    const progress = (sceneT - 0.6) / 0.4;
    const stepIndex = sceneT >= 0.6 ? Math.min(steps.length - 1, Math.floor(progress * steps.length)) : 0;
    
    const currentStep = steps[stepIndex];
    const moveColor = "rgba(255, 255, 0, 0.4)";
    
    let styles: Record<string, React.CSSProperties> = getMoveHighlights(currentStep?.lastMove, moveColor);

    if (sceneT >= 0.6) {
        if (stepIndex === steps.length - 1) {
            // Final Step: Winning
             styles = { ...styles, ...{
                f3: { backgroundColor: "rgba(16, 185, 129, 0.8)", boxShadow: "0 0 10px rgba(16, 185, 129, 0.8)" } 
             }};
        } else if (stepIndex === 0) {
            // Step 0: Correct (Nxe5)
             styles = { ...styles, ...{
                e5: { backgroundColor: "rgba(16, 185, 129, 0.5)" }
             }};
        }
    }
    return styles;
  }, [sceneT, payload]);


  const showMateBadges = sceneT >= 0.95; // Only at the very end
  const showFinalMerge = sceneT >= 0.98;
  const showPrompt = sceneT >= 0.25 && sceneT < 0.4;
  const showHtml = isActive && !warmup;
  const showLineInfo = sceneT > 0.6; // Show info after split

  const leftBoardX = THREE.MathUtils.lerp(0, -3.2, splitProgress);
  const rightBoardX = THREE.MathUtils.lerp(0, 3.2, splitProgress);
  const boardScale = THREE.MathUtils.lerp(0.6, 0.35, splitProgress);

  // Arrows
  const showOpponentArrow = isOpponentMove;
  // Dynamic arrows based on step index (sceneT)
  const activeLeftArrows = useMemo(() => {
      if (sceneT < 0.6) return undefined;
      const steps = payload.leftLine.steps;
      const progress = (sceneT - 0.6) / 0.4;
      const stepIndex = Math.min(steps.length - 1, Math.floor(progress * steps.length));
      return steps[stepIndex]?.arrows;
  }, [sceneT, payload]);

  const activeRightArrows = useMemo(() => {
      if (sceneT < 0.6) return undefined;
      const steps = payload.rightLine.steps;
      const progress = (sceneT - 0.6) / 0.4;
      const stepIndex = Math.min(steps.length - 1, Math.floor(progress * steps.length));
      return steps[stepIndex]?.arrows;
  }, [sceneT, payload]);

  return (
    <group scale={0.58} position={[0, -0.2, 0]}>
      <spotLight position={[-3.2, 3, 2]} intensity={1.2} color="#7ce7be" angle={0.8} penumbra={0.6} />
      <spotLight position={[3.2, 3, 2]} intensity={1.2} color="#8fa8ff" angle={0.8} penumbra={0.6} />
      
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.4, 0]}>
        <planeGeometry args={[12, 8]} />
        <meshBasicMaterial color="#0d1324" transparent opacity={0.8} />
      </mesh>
      
      <mesh position={[0, -1.39, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[splitProgress * 4 + 0.1, 6]} />
        <meshBasicMaterial color="#4ee1a0" transparent opacity={splitProgress * 0.2} />
      </mesh>

      <group position={[0, 0.2, 0]}>
        {showHtml && (
          <>
            <Html
              transform
              scale={boardScale} // Dynamic scale
              position={[leftBoardX, -0.8, -1]} // Lower Y position
              rotation={[0, splitProgress * 0.15, 0]}
              style={{ pointerEvents: "none", opacity: 1, transition: "opacity 0.2s", zIndex: 10 }}
              wrapperClass="presentation-html-board"
            >
              <div style={{ position: 'relative', width: '360px', height: '360px' }}> {/* Moderate container size */}
                {/* Info Card - Left */}
                {showLineInfo && !showFinalMerge && (
                  <div className="absolute -top-32 left-0 right-0 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{payload.leftLine.tag}</div>
                    <div className="text-2xl font-black text-white mb-1">{payload.leftLine.verdict}</div>
                    <div className="text-xs text-slate-400 text-center max-w-[220px]">Greedy capture... blinded by the free queen.</div>
                  </div>
                )}
                
                <Chessboard 
                    id="freeze-left" 
                    position={currentFenLeft} 
                    arePiecesDraggable={false} 
                    boardWidth={360}
                    customSquareStyles={customSquareStylesLeft}
                />
                {showMateBadges && !showFinalMerge && (
                  <div className="absolute -top-12 left-0 right-0 flex justify-center">
                    <div className="px-3 py-1 bg-red-500/90 text-white text-xs font-bold rounded shadow-lg backdrop-blur">
                      CHECKMATE
                    </div>
                  </div>
                )}
                {showMateBadges && !showFinalMerge && (
                  <div className="absolute -bottom-16 left-0 right-0 text-center flex flex-col items-center">
                    <div className="text-[11px] text-slate-300 bg-black/60 px-3 py-2 rounded-lg backdrop-blur border border-white/10 max-w-[280px]">
                      "Greed kills. Black took the queen but missed the forced mate in 3."
                    </div>
                  </div>
                )}
              </div>
            </Html>

            <Html
              transform
              scale={boardScale} 
              position={[rightBoardX, -0.8, -1]} // Lower Y position
              rotation={[0, -splitProgress * 0.15, 0]}
              style={{ pointerEvents: "none", opacity: splitProgress > 0.01 ? 1 : 0, zIndex: 10 }}
              wrapperClass="presentation-html-board"
            >
              <div style={{ position: 'relative', width: '360px', height: '360px' }}>
                {/* Info Card - Right */}
                {showLineInfo && !showFinalMerge && (
                  <div className="absolute -top-32 left-0 right-0 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{payload.rightLine.tag}</div>
                    <div className="text-2xl font-black text-white mb-1">{payload.rightLine.verdict}</div>
                    <div className="text-xs text-slate-400 text-center max-w-[220px]">Sees the trap... and punishes it.</div>
                  </div>
                )}

                <Chessboard 
                    id="freeze-right" 
                    position={currentFenRight} 
                    arePiecesDraggable={false} 
                    boardWidth={360}
                    customSquareStyles={customSquareStylesRight}
                />
                {showMateBadges && !showFinalMerge && (
                  <div className="absolute -top-12 left-0 right-0 flex justify-center">
                    <div className="px-3 py-1 bg-emerald-500/90 text-white text-xs font-bold rounded shadow-lg backdrop-blur">
                      WINNING
                    </div>
                  </div>
                )}
                {showMateBadges && !showFinalMerge && (
                  <div className="absolute -bottom-16 left-0 right-0 text-center flex flex-col items-center">
                    <div className="text-[11px] text-slate-300 bg-black/60 px-3 py-2 rounded-lg backdrop-blur border border-white/10 max-w-[280px]">
                      "After neutralizing the knight, Black counter-attacks and wins the queen back."
                    </div>
                  </div>
                )}
              </div>
            </Html>
          </>
        )}

        {/* 3D Arrows */}
        {showOpponentArrow && (
           <RenderArrow from={payload.opponentMove.from} to={payload.opponentMove.to} color="#ff9b9b" side="center" splitProgress={0} />
        )}
        
        {activeLeftArrows
          ?.filter((a) => a && a.includes("->"))
          .map((a, i) => {
            const [from, to] = a.split("->");
            return <RenderArrow key={`left-${i}`} from={from} to={to} color="#ff5555" side="left" splitProgress={splitProgress} />;
          })}
        
        {activeRightArrows
          ?.filter((a) => a && a.includes("->"))
          .map((a, i) => {
            const [from, to] = a.split("->");
            return <RenderArrow key={`right-${i}`} from={from} to={to} color="#4ee1a0" side="right" splitProgress={splitProgress} />;
          })}
      </group>

      {showPrompt && showHtml && (
        <Html position={[0, 1.8, 0]} center>
          <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-rose-300 to-rose-600 drop-shadow-[0_0_25px_rgba(225,29,72,0.6)] font-sans tracking-tight animate-pulse">
            NOW WHAT?
          </div>
        </Html>
      )}

      {/* Main Title - Animates from Top to Center */}
      {showHtml && sceneT > 0.15 && (
        <Html 
          position={titleAnim.position} 
          style={{
            opacity: titleAnim.opacity,
            transform: `translate3d(-50%, -50%, 0) scale(${titleAnim.scale})`,
            transition: 'opacity 0.2s',
            zIndex: 20,
            pointerEvents: 'none',
            whiteSpace: 'nowrap'
          }}
        >
           <h2 
             className="text-4xl md:text-5xl font-black text-transparent bg-clip-text text-center leading-tight tracking-tight"
             style={{
               backgroundImage: titleVisuals.gradient,
               backgroundSize: "180% 180%",
               backgroundPosition: titleVisuals.shimmerOffset,
               WebkitTextStroke: titleVisuals.stroke,
               textShadow: titleVisuals.textShadow,
               filter: `drop-shadow(0 0 ${12 + 12 * titleVisuals.warningProgress}px rgba(255,73,225,${0.32 + titleVisuals.warningProgress * 0.28})) saturate(1.25)`,
               transition: "background-position 0.2s linear, background-image 0.2s linear, text-shadow 0.2s linear, -webkit-text-stroke 0.2s linear"
             }}
           >
             Same board, different choice.
           </h2>
        </Html>
      )}

      {/* Final Badges - Positioned below the Centered Title */}
      {showFinalMerge && showHtml && (
        <Html position={[0, -0.8, 1]} center>
           <div className="flex flex-col items-center gap-2">
             <div className="flex items-center gap-4">
                <div className="px-3 py-1 bg-red-500/80 text-white text-xs font-bold rounded">BLUNDER</div>
                <div className="px-3 py-1 bg-emerald-500/80 text-white text-xs font-bold rounded">MATE</div>
             </div>
           </div>
        </Html>
      )}
    </group>
  );
}
