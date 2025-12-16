import { Html, Line } from "@react-three/drei";
import { PipelinePayload } from "../../../data/presentation";

type Props = { payload: PipelinePayload; sceneT: number; liteMode: boolean; isActive: boolean; warmup: boolean };

export default function PipelineScene({ payload, warmup }: Props) {
  return (
    <group>
      <ambientLight intensity={0.5} />
      <spotLight position={[0, 3, 2]} intensity={1.1} angle={0.8} penumbra={0.4} color="#7ce7be" />
      <mesh position={[0, -0.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, 2]} />
        <meshBasicMaterial color="#0b1224" transparent opacity={0.6} />
      </mesh>

      <Line points={[-2.5, 0, 0, 2.5, 0, 0]} color="#7ce7be" lineWidth={3} dashed dashSize={0.2} gapSize={0.1} />

      {payload.nodes.map((node, idx) => {
        const x = -2.5 + (idx / (payload.nodes.length - 1)) * 5;
        return (
          <group key={node.id} position={[x, 0, 0]}>
            <mesh>
              <sphereGeometry args={[0.16, 24, 24]} />
              <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={0.8} />
            </mesh>
            {!warmup && (
              <Html transform position={[0, 0.5, 0]} style={{ pointerEvents: "none" }}>
                <div className="pipeline-node">
                  <div className="text-[11px] uppercase tracking-wide text-slate-400">{node.label}</div>
                  <div className="text-xs text-slate-200 max-w-[180px]">{node.blurb}</div>
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
