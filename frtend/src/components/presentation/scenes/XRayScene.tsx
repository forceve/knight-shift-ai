import { Html } from "@react-three/drei";
import { XRayPayload } from "../../../data/presentation";

type Props = { payload: XRayPayload; sceneT: number; liteMode: boolean; isActive: boolean; warmup: boolean };

const squareToPosition = (square: string) => {
  const file = square.charCodeAt(0) - "a".charCodeAt(0);
  const rank = parseInt(square.charAt(1), 10) - 1;
  const squareSize = 0.28;
  const base = -squareSize * 3.5;
  return [base + file * squareSize, base + rank * squareSize, 0] as const;
};

export default function XRayScene({ payload, sceneT, warmup }: Props) {
  const idx = Math.min(payload.frames.length - 1, Math.floor(sceneT * payload.frames.length));
  const frame = payload.frames[idx];

  return (
    <group>
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 2.4, 2.4]} intensity={1.2} color="#7ce7be" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]}>
        <planeGeometry args={[4, 4]} />
        <meshStandardMaterial color="#0b1224" transparent opacity={0.6} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.4, 2.4, 8, 8]} />
        <meshStandardMaterial color="#0f172a" wireframe opacity={0.5} transparent />
      </mesh>

      {frame.heatSquares.map((sq) => {
        const [x, y, z] = squareToPosition(sq);
        return (
          <mesh key={sq} position={[x, y, z + 0.02]}>
            <boxGeometry args={[0.22, 0.22, 0.02]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.9} transparent opacity={0.8} />
          </mesh>
        );
      })}

      {!warmup && (
        <Html position={[0, 1.6, 0]}>
          <div className="xray-caption">PV: {frame.pv.join(" -> ")} · Pruned {Math.round(frame.prunedRatio * 100)}%</div>
        </Html>
      )}
    </group>
  );
}
