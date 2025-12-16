import { useMemo } from "react";
import * as THREE from "three";
import { LandscapePayload } from "../../../data/presentation";

type Props = { payload: LandscapePayload; sceneT: number; liteMode: boolean; isActive: boolean; warmup: boolean };

export default function LandscapeScene({ payload, sceneT }: Props) {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(4, 3, 3, 3);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    payload.heightmap.forEach((h, idx) => {
      pos.setZ(idx, h);
    });
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [payload.heightmap]);

  const maxCost = Math.max(...payload.costStrengthPoints.map((p) => p.cost));
  const minStrength = Math.min(...payload.costStrengthPoints.map((p) => p.strength));
  const maxStrength = Math.max(...payload.costStrengthPoints.map((p) => p.strength));
  const markerIndex = Math.min(payload.costStrengthPoints.length - 1, Math.floor(sceneT * payload.costStrengthPoints.length));
  const markerPoint = payload.costStrengthPoints[markerIndex];
  const markerX = ((markerPoint.cost / maxCost) - 0.5) * 3.5;
  const markerY = ((markerPoint.strength - minStrength) / (maxStrength - minStrength) - 0.5) * 2.5;

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 4, 3]} intensity={1} color="#7ce7be" />
      <mesh geometry={geometry} rotation={[0, 0, 0]}>
        <meshStandardMaterial color="#0f172a" wireframe={false} metalness={0.2} roughness={0.5} />
      </mesh>
      <mesh geometry={geometry} rotation={[0, 0, 0]}>
        <meshStandardMaterial color="#12213c" wireframe transparent opacity={0.3} />
      </mesh>
      <mesh position={[markerX, markerY, 0.2]}>
        <sphereGeometry args={[0.08, 24, 24]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
}
