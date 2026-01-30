import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line, PointMaterial, Points, Image } from "@react-three/drei";
import * as THREE from "three";
import { AmbientPayload } from "../../../data/presentation";
import scene0knight from "../../../image/scene0knight.png";
import scene0knight2 from "../../../image/scene0knight2.png";

type Props = { payload: AmbientPayload; sceneT: number; liteMode: boolean; isActive: boolean; warmup: boolean };

export default function AmbientScene({ payload, liteMode, isActive, warmup }: Props) {
  const group = useRef<THREE.Group>(null);
  const knightRef = useRef<THREE.Mesh>(null);
  const knight2Ref = useRef<THREE.Mesh>(null);
  const particleCount = liteMode ? Math.floor(payload.particleCount * 0.55) : payload.particleCount;
  const showAtmosphere = true; // Always show atmosphere if this is the background layer

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
    // if (!isActive && !warmup) return; // Keep running for background
    const t = state.clock.getElapsedTime();
    if (group.current) {
      group.current.rotation.y = Math.sin(t * payload.cameraSway.speed) * 0.05;
      group.current.position.y = Math.sin(t * 0.3) * 0.12;
    }
    
    // Knight 1 floating effect (Right)
    if (knightRef.current) {
      knightRef.current.position.y = Math.sin(t * 0.2) * 0.3;
      knightRef.current.position.x = 3.5 + Math.sin(t * 0.15) * 0.2; 
      knightRef.current.rotation.z = Math.sin(t * 0.1) * 0.05;
    }

    // Knight 2 floating effect (Left - counter phase)
    if (knight2Ref.current) {
      knight2Ref.current.position.y = Math.sin(t * 0.18 + 2) * 0.3; // Offset phase
      knight2Ref.current.position.x = -3.5 + Math.sin(t * 0.12) * 0.2; // Base X = -3.5 (Left side)
      knight2Ref.current.rotation.z = Math.sin(t * 0.08 + 1) * -0.05;
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
      <gridHelper args={[18, 24, "#4a5568", "#2d3748"]} position={[0, -2.2, 0]} />
      <Points positions={positions} stride={3} frustumCulled>
        <PointMaterial transparent color="#9ae6b4" size={0.08} sizeAttenuation depthWrite={false} opacity={0.8} />
      </Points>
      
      {/* Knight Images */}
      {!warmup && (
        <>
          {/* Right side background */}
          <Image
            ref={knightRef}
            url={scene0knight}
            transparent
            opacity={0.6}
            scale={[5, 5]}
            position={[3.5, 0, -2]}
            color="#8fa8ff"
          />
          {/* Left side background */}
          <Image
            ref={knight2Ref}
            url={scene0knight2}
            transparent
            opacity={0.4} // Slightly more transparent for depth variety
            scale={[4.5, 4.5]} // Slightly smaller
            position={[-3.5, 0, -3]} // Slightly further back
            color="#7ce7be" // Tint slightly green to match left theme
          />
        </>
      )}

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
