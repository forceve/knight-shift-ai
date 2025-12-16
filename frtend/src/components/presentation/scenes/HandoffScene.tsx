import { useMemo } from "react";
import { HandoffPayload } from "../../../data/presentation";

type Props = { payload: HandoffPayload; sceneT: number; liteMode: boolean; isActive: boolean; warmup: boolean };

export default function HandoffScene({ payload, sceneT }: Props) {
  const scale = useMemo(() => 1 - 0.4 * sceneT, [sceneT]);

  return (
    <group scale={[scale, scale, scale]}>
      <ambientLight intensity={0.7} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.5, 2.5]} />
        <meshBasicMaterial color="#0b1224" transparent opacity={0.7} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2, 2.25, 64]} />
        <meshBasicMaterial color="#7ce7be" transparent opacity={0.8} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.1, 1.25, 64]} />
        <meshBasicMaterial color="#8fa8ff" transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 0, 0.16]}>
        <boxGeometry args={[3.6, 0.08, 0.2]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.7} />
      </mesh>
    </group>
  );
}
