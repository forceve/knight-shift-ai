import { useMemo } from "react";
import { PointMaterial, Points } from "@react-three/drei";

type Props = { sceneT: number; liteMode: boolean; isActive: boolean; warmup: boolean };

export default function AudienceScene({ liteMode }: Props) {
  const count = liteMode ? 180 : 320;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      arr[i * 3 + 0] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 1] = Math.random() * 5;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    return arr;
  }, [count]);

  return (
    <group>
      <Points positions={positions} stride={3}>
        <PointMaterial color="#8fa8ff" size={0.04} sizeAttenuation depthWrite={false} transparent opacity={0.8} />
      </Points>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
        <planeGeometry args={[10, 6]} />
        <meshBasicMaterial color="#0b1224" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}
