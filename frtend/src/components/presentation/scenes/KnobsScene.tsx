import { Float } from "@react-three/drei";
import { useMemo } from "react";
import { KnobPayload } from "../../../data/presentation";
import { lerp } from "../utils";

type Props = { payload: KnobPayload; sceneT: number; liteMode: boolean; isActive: boolean; warmup: boolean };

const knobLabels: Array<{ key: keyof KnobPayload["knobs"][number]; label: string }> = [
  { key: "horizon", label: "Horizon" },
  { key: "efficiency", label: "Efficiency" },
  { key: "evalRichness", label: "Eval richness" },
  { key: "randomness", label: "Randomness" },
];

export default function KnobsScene({ payload, sceneT, liteMode }: Props) {
  const blended = useMemo(() => {
    const steps = payload.knobs.length - 1;
    const pos = sceneT * steps;
    const idx = Math.min(payload.knobs.length - 2, Math.floor(pos));
    const localT = pos - idx;
    const from = payload.knobs[idx];
    const to = payload.knobs[idx + 1];
    return {
      horizon: lerp(from.horizon, to.horizon, localT),
      efficiency: lerp(from.efficiency, to.efficiency, localT),
      evalRichness: lerp(from.evalRichness, to.evalRichness, localT),
      randomness: lerp(from.randomness, to.randomness, localT),
    };
  }, [payload.knobs, sceneT]);

  return (
    <group>
      <ambientLight intensity={0.7} />
      <spotLight position={[0, 3, 3]} angle={0.8} intensity={1.2} penumbra={0.6} color="#7ce7be" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.7, 0]}>
        <planeGeometry args={[5, 2.8]} />
        <meshBasicMaterial color="#0b1224" transparent opacity={0.65} />
      </mesh>
      {knobLabels.map((entry, idx) => {
        const value = blended[entry.key];
        const x = -2 + idx * 1.3;
        const height = 0.4 + (value / 100) * 0.8;
        return (
          <Float key={entry.key} speed={liteMode ? 0.6 : 1} rotationIntensity={0.08} floatIntensity={0.08}>
            <group position={[x, -0.1, 0]}>
              <mesh>
                <cylinderGeometry args={[0.25, 0.25, height, 32]} />
                <meshStandardMaterial color="#111827" emissive="#0ea5e9" emissiveIntensity={0.4} />
              </mesh>
              <mesh position={[0, height / 2 + 0.2, 0]}>
                <torusGeometry args={[0.24, 0.03, 16, 64]} />
                <meshStandardMaterial color="#7ce7be" emissive="#7ce7be" emissiveIntensity={0.8} />
              </mesh>
            </group>
          </Float>
        );
      })}
    </group>
  );
}
