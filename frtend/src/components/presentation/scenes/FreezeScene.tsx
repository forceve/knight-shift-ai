import { Html, Line } from "@react-three/drei";
import { Chessboard } from "react-chessboard";
import { useMemo } from "react";
import { FreezePayload, MoveHighlight } from "../../../data/presentation";

type Props = { payload: FreezePayload; sceneT: number; liteMode: boolean; isActive: boolean; warmup: boolean };

const squareToPosition = (square: string, side: "left" | "right") => {
  const file = square.charCodeAt(0) - "a".charCodeAt(0);
  const rank = parseInt(square.charAt(1), 10) - 1;
  const squareSize = 0.22;
  const baseX = side === "left" ? -1.8 : 1.8;
  const baseY = -0.6;
  const x = baseX + (file - 3.5) * squareSize;
  const y = baseY + (rank - 3.5) * squareSize;
  return [x, y, -0.4] as const;
};

const renderHighlight = (h: MoveHighlight, idx: number, side: "left" | "right") => {
  const start = squareToPosition(h.from, side);
  const end = squareToPosition(h.to, side);
  const mid = [(start[0] + end[0]) / 2, start[1] + 0.35, (start[2] + end[2]) / 2];
  const color = h.color ?? (side === "left" ? "#7ce7be" : "#8fa8ff");
  return <Line key={`${side}-${idx}`} points={[start, mid, end]} color={color} lineWidth={2} />;
};

export default function FreezeScene({ payload, sceneT, warmup }: Props) {
  const script = useMemo(() => {
    const idx = Math.floor(sceneT * payload.scripts.length) % payload.scripts.length;
    return payload.scripts[idx];
  }, [payload.scripts, sceneT]);
  const showHighlights = sceneT >= 0.33;
  const showNote = sceneT >= 0.55;
  const showHtml = !warmup && showNote; // hide DOM overlay for warmups to avoid overlay bleed

  return (
    <group scale={0.58} position={[0, -0.2, 0]}>
      <spotLight position={[-3.2, 3, 2]} intensity={1.2} color="#7ce7be" angle={0.8} penumbra={0.6} />
      <spotLight position={[3.2, 3, 2]} intensity={1.2} color="#8fa8ff" angle={0.8} penumbra={0.6} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.4, 0]}>
        <planeGeometry args={[10, 6]} />
        <meshBasicMaterial color="#0d1324" transparent opacity={0.65} />
      </mesh>

      <group position={[0, 0.2, 0]}>
        {!warmup && (
          <>
            <Html
              transform
              distanceFactor={1.3}
              position={[-1.8, 0, -1]}
              rotation={[0, 0.18, 0]}
              style={{ pointerEvents: "none" }}
              wrapperClass="presentation-html-board"
            >
              <Chessboard id="freeze-l1" position={script.fen} arePiecesDraggable={false} boardWidth={210} />
            </Html>
            <Html
              transform
              distanceFactor={1.3}
              position={[1.8, 0, -1]}
              rotation={[0, -0.18, 0]}
              style={{ pointerEvents: "none" }}
              wrapperClass="presentation-html-board"
            >
              <Chessboard id="freeze-ult" position={script.fen} arePiecesDraggable={false} boardWidth={210} />
            </Html>
          </>
        )}

        {showHighlights && (
          <>
            {script.highlights.map((h, idx) => renderHighlight(h, idx, "left"))}
            {script.highlights.map((h, idx) => renderHighlight(h, idx, "right"))}
          </>
        )}
      </group>

      {!warmup && (
        <Html position={[0, 1.5, 0]} transform>
          <div className="freeze-label">FREEZE</div>
        </Html>
      )}
      {showNote && !warmup && (
        <Html position={[0, -1.9, 0]}>
          <div className="text-center text-[11px] uppercase tracking-[0.3em] text-slate-300">
            {script.note} · L1 {script.l1Move} vs ULT {script.ultMove}
          </div>
        </Html>
      )}
    </group>
  );
}
