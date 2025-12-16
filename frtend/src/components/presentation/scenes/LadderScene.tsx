import { Html, Float } from "@react-three/drei";
import { LadderPayload } from "../../../data/presentation";

type Props = { payload: LadderPayload; sceneT: number; liteMode: boolean; isActive: boolean; warmup: boolean };

export default function LadderScene({ payload, warmup }: Props) {
  return (
    <group>
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 3, 2]} intensity={1} color="#7ce7be" />
      {payload.cards.map((card, idx) => {
        const x = -2 + idx * 1.4;
        const y = -1 + idx * 0.6;
        return (
          <group key={card.level} position={[x, y, 0]}>
            <mesh receiveShadow>
              <boxGeometry args={[1.2, 0.2, 1.4]} />
              <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.2} />
            </mesh>
            {!warmup && (
              <Float speed={1} floatIntensity={0.15} rotationIntensity={0.1}>
                <Html transform position={[0, 0.8, 0]} style={{ pointerEvents: "none" }}>
                  <div className="ladder-card">
                    <div className="text-[11px] uppercase tracking-wide text-slate-400">{card.level}</div>
                    <div className="text-sm font-semibold text-slate-50">{card.tag}</div>
                    <div className="text-xs text-slate-300 max-w-[180px]">{card.blurb}</div>
                  </div>
                </Html>
              </Float>
            )}
          </group>
        );
      })}
    </group>
  );
}
