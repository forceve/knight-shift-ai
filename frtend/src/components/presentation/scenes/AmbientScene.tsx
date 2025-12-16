import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line, PointMaterial, Points } from "@react-three/drei";
import * as THREE from "three";
import { AmbientPayload } from "../../../data/presentation";

type Props = { payload: AmbientPayload; sceneT: number; liteMode: boolean; isActive: boolean; warmup: boolean };

export default function AmbientScene({ payload, liteMode, isActive, warmup }: Props) {
  const group = useRef<THREE.Group>(null);
  const particleCount = liteMode ? Math.floor(payload.particleCount * 0.55) : payload.particleCount;
  const showAtmosphere = isActive && !warmup;

  const positions = useMemo(() => {
    const arr = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      arr[i * 3 + 0] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 6;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return arr;
  }, [particleCount]);

  useFrame((state) => {
    if (!isActive && !warmup) return;
    const t = state.clock.getElapsedTime();
    if (group.current) {
      group.current.rotation.y = Math.sin(t * payload.cameraSway.speed) * 0.05;
      group.current.position.y = Math.sin(t * 0.3) * 0.12;
    }
  });

  return (
    <group ref={group}>
      {showAtmosphere && (
        <>
          <color attach="background" args={["#070c18"]} />
          <fog attach="fog" args={["#070c18", 6, 18]} />
        </>
      )}
      <gridHelper args={[18, 24, "#1f2b45", "#1f2b45"]} position={[0, -2.2, 0]} />
      <Points positions={positions} stride={3} frustumCulled>
        <PointMaterial transparent color="#9ae6b4" size={0.045} sizeAttenuation depthWrite={false} />
      </Points>
      <Line
        points={[
          [-8, -2.2, -8],
          [8, -2.2, -8],
          [8, -2.2, 8],
          [-8, -2.2, 8],
          [-8, -2.2, -8],
        ]}
        color="#23304f"
        lineWidth={1}
      />
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 6]}>
        <planeGeometry args={[16, 6]} />
        <meshBasicMaterial color="#8fb3ff" transparent opacity={0.08} />
      </mesh>
    </group>
  );
}
