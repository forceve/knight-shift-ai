import { Line } from "@react-three/drei";
import { FuturePayload } from "../../../data/presentation";

type Props = { payload: FuturePayload; sceneT: number; liteMode: boolean; isActive: boolean; warmup: boolean };

const toPoints = (arr: { x: number; y: number }[]) =>
  arr.map((p) => {
    const x = (p.x / (arr[arr.length - 1].x || 1)) * 3 - 1.5;
    const y = ((p.y - arr[0].y) / (arr[arr.length - 1].y - arr[0].y || 1)) * 1.8 - 0.8;
    return [x, y, 0] as const;
  });

export default function FutureScene({ payload }: Props) {
  return (
    <group>
      <ambientLight intensity={0.7} />
      <Line points={toPoints(payload.eloCurveFixed)} color="#8fa8ff" lineWidth={3} />
      <Line points={toPoints(payload.eloCurveDynamic)} color="#7ce7be" lineWidth={4} />
      <mesh position={[0, -0.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4, 2]} />
        <meshBasicMaterial color="#0b1224" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}
