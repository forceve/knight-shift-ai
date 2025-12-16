import { useMemo } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { BudgetPayload } from "../../../data/presentation";
import { lerp } from "../utils";

type Props = { payload: BudgetPayload; sceneT: number; liteMode: boolean; isActive: boolean; warmup: boolean };

export default function DialScene({ payload, sceneT }: Props) {
  const sweep = useMemo(() => {
    const steps = payload.levels.length - 1;
    const pos = sceneT * steps;
    const idx = Math.min(payload.levels.length - 2, Math.floor(pos));
    const localT = pos - idx;
    const from = payload.levels[idx];
    const to = payload.levels[idx + 1];
    return lerp(from.dialAngle, to.dialAngle, localT);
  }, [payload.levels, sceneT]);

  const ringColor = new THREE.Color("#7ce7be");

  return (
    <group position={[0, 0, 0]}>
      <ambientLight intensity={0.65} />
      <pointLight position={[0, 2.5, 2.5]} intensity={1.4} color="#7ce7be" />
      <mesh rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <torusGeometry args={[1.7, 0.08, 16, 64]} />
        <meshStandardMaterial color="#111827" emissive="#162441" roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.7, 0.012, 16, 64]} />
        <meshStandardMaterial color="#0ea5e9" emissive="#52bde6" emissiveIntensity={0.6} transparent opacity={0.6} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 1.6, 48]} />
        <meshBasicMaterial color="#0f172a" transparent opacity={0.75} />
      </mesh>

      {payload.levels.map((lvl, idx) => {
        const angle = (lvl.dialAngle / 180) * Math.PI;
        const radius = 1.7;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        return (
          <mesh key={lvl.id} position={[x, 0.02, y]} rotation={[-Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.1, 16]} />
            <meshStandardMaterial color="#7dd3fc" emissive="#7dd3fc" emissiveIntensity={idx === 0 ? 0.6 : 0.4} />
          </mesh>
        );
      })}

      <group rotation={[0, sweep * (Math.PI / 180), 0]}>
        <mesh position={[0, 0, 1.15]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.12, 0.32, 24]} />
          <meshStandardMaterial color={ringColor} emissive={ringColor} emissiveIntensity={1} metalness={0.3} />
        </mesh>
        <Line points={[0, 0, 0, 0, 0, 1.25]} color="#7ce7be" lineWidth={3} />
      </group>

      <mesh position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.6, 2.6]} />
        <meshBasicMaterial color="#0b1224" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}
