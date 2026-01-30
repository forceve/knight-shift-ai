import { Html, useGLTF } from "@react-three/drei";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DialPayload } from "../../../data/presentation";

type Props = { payload: DialPayload; sceneT: number; liteMode: boolean; isActive: boolean; warmup: boolean };

// Dial beats:
// 0.0: Hero (Title)
// 0.25: Definition
// 0.5: Dial Sweep (L1 -> ULT)
// 0.75: Bridge
// 1.0: Next

// Dial visual:
// Torus with pointer.
// Levels at specific angles.
// Pointer rotates based on T.

// Angles:
// L1: -45 deg
// L2: -15 deg
// L3: 15 deg
// ULT: 45 deg

const LEVELS = [
  { id: "L1", angle: -45 },
  { id: "L2", angle: -15 },
  { id: "L3", angle: 15 },
  { id: "ULT", angle: 45 },
];

export default function DialScene({ payload, sceneT, isActive, warmup }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Calculate dial rotation
  // T 0.0 - 0.25: Idle at L1 (or -90?)
  // T 0.25 - 0.5: Sweep L1 -> ULT
  // T 0.5 - 1.0: Hold ULT (or interactive?)
  
  // Let's make it interactive-ish with T.
  // 0.0-0.25: Angle -60 (Off)
  // 0.25-0.5: Lerp -45 to 45
  // 0.5+: 45
  
  const dialRotation = useMemo(() => {
    if (sceneT < 0.25) return THREE.MathUtils.degToRad(-60);
    if (sceneT < 0.5) {
      const p = (sceneT - 0.25) / 0.25; // 0-1
      return THREE.MathUtils.degToRad(THREE.MathUtils.lerp(-45, 45, p));
    }
    return THREE.MathUtils.degToRad(45);
  }, [sceneT]);

  // Determine active profile index based on rotation (or T) to highlight
  // Simple mapping: 
  // < 0.31: L1
  // < 0.37: L2
  // < 0.43: L3
  // > 0.43: ULT
  // (Approximate)
  
  let activeLevelIndex = -1;
  if (sceneT >= 0.25) {
    if (sceneT < 0.31) activeLevelIndex = 0;
    else if (sceneT < 0.37) activeLevelIndex = 1;
    else if (sceneT < 0.43) activeLevelIndex = 2;
    else activeLevelIndex = 3;
  }
  
  const showHero = sceneT < 0.2;
  const showDefinition = sceneT >= 0.2 && sceneT < 0.5;
  const showProfile = sceneT >= 0.25; // Shows profile as dial moves
  const showBridge = sceneT >= 0.7;
  const showNext = sceneT >= 0.9;

  const showHtml = isActive && !warmup;

  return (
    <group ref={groupRef} scale={0.7} position={[0, -0.5, 0]}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} color="#7ce7be" />
      <pointLight position={[-5, 5, -5]} intensity={0.5} color="#8fa8ff" />

      {/* Dial Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3, 0.15, 16, 100]} />
        <meshPhysicalMaterial 
          color="#1e293b" 
          metalness={0.9} 
          roughness={0.1}
          transmission={0.6}
          thickness={0.5}
          clearcoat={1}
        />
      </mesh>
      
      {/* Outer Glow Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.2, 0.02, 16, 100]} />
        <meshBasicMaterial color="#4ee1a0" transparent opacity={0.3} />
      </mesh>
      
      {/* Ticks */}
      {LEVELS.map((lvl) => (
        <group
          key={lvl.id} 
          position={[
            3 * Math.sin(THREE.MathUtils.degToRad(lvl.angle)), 
            0, 
            -3 * Math.cos(THREE.MathUtils.degToRad(lvl.angle))
          ]}
          rotation={[0, -THREE.MathUtils.degToRad(lvl.angle), 0]}
        >
           <mesh rotation={[Math.PI / 2, 0, 0]}>
             <capsuleGeometry args={[0.08, 0.4, 4, 8]} />
             <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.2} />
           </mesh>
        </group>
      ))}
      
      {/* Simple Dial Construction */}
      <group position={[0, 0, 0]}>
         {/* Ring Background */}
         <mesh position={[0, 0, -0.1]}>
           <ringGeometry args={[2.8, 3.2, 64, 1, -Math.PI/3, 2*Math.PI/3]} /> 
           {/* Arc from -60 to +60 degrees? Math.PI/3 is 60 deg. Length 120 deg. */}
           <meshBasicMaterial color="#0f172a" side={THREE.DoubleSide} />
         </mesh>
         
         {/* Pointer */}
         <group rotation={[0, 0, -dialRotation]}> 
            <mesh position={[0, 2.5, 0]}>
              <coneGeometry args={[0.2, 0.5, 32]} />
              <meshStandardMaterial color="#4ee1a0" emissive="#4ee1a0" emissiveIntensity={2} />
              <pointLight distance={3} intensity={2} color="#4ee1a0" />
            </mesh>
            <mesh position={[0, 0, 0]}>
               <cylinderGeometry args={[0.05, 0.05, 2.5]} />
               <meshStandardMaterial color="#4ee1a0" />
            </mesh>
         </group>
         
         {/* Tick Labels */}
         {isActive && !warmup && LEVELS.map((lvl, i) => (
           <Html
             key={lvl.id}
             position={[
               2.2 * Math.sin(THREE.MathUtils.degToRad(lvl.angle)),
               2.2 * Math.cos(THREE.MathUtils.degToRad(lvl.angle)),
               0
             ]}
             center
           >
             <div className={`text-xs font-bold transition-colors duration-300 ${activeLevelIndex === i ? "text-accent scale-125" : "text-slate-600"}`}>
               {lvl.id}
             </div>
           </Html>
         ))}
      </group>

      {/* Hero Text */}
      {showHero && isActive && !warmup && (
        <Html position={[0, 0, 0]} center>
          <div className="text-4xl font-black text-center tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white to-slate-500 whitespace-nowrap">
            DIFFICULTY = <br/>COMPUTATION BUDGET
          </div>
        </Html>
      )}

      {/* Definition Card */}
      {showDefinition && isActive && !warmup && (
        <Html position={[3.5, 1, 0]} center>
          <div className="thesis-card w-64 backdrop-blur-md bg-slate-900/80 border border-white/10 p-4 rounded-xl shadow-2xl">
            <h3 className="text-accent text-sm font-bold uppercase tracking-widest mb-2">Definition</h3>
            {payload.definitionLines.map((line, i) => (
              <p key={i} className="text-slate-300 text-xs mb-1 leading-relaxed">{line}</p>
            ))}
          </div>
        </Html>
      )}

      {/* Profile Card */}
      {showProfile && activeLevelIndex >= 0 && isActive && !warmup && (
        <Html position={[3.5, -1, 0]} center>
          <div className="thesis-card w-64 backdrop-blur-md bg-slate-900/80 border border-white/10 p-4 rounded-xl shadow-2xl">
             <div className="flex justify-between items-center mb-3">
               <span className="text-2xl font-bold text-white">{payload.profiles[activeLevelIndex].level}</span>
               <span className="px-2 py-0.5 bg-white/10 rounded text-[10px] text-accent uppercase tracking-wider">
                 {payload.profiles[activeLevelIndex].depthLabel}
               </span>
             </div>
             <div className="space-y-2">
               <div className="flex justify-between text-xs border-b border-white/5 pb-1">
                 <span className="text-slate-400">Time/Move</span>
                 <span className="text-slate-200 font-mono">{payload.profiles[activeLevelIndex].avgTimeMs} ms</span>
               </div>
               <div className="flex justify-between text-xs border-b border-white/5 pb-1">
                 <span className="text-slate-400">Nodes</span>
                 <span className="text-slate-200 font-mono">{payload.profiles[activeLevelIndex].avgNodes?.toLocaleString()}</span>
               </div>
               <div className="flex justify-between text-xs pt-1">
                 <span className="text-slate-400">Persona</span>
                 <span className="text-white italic">"{payload.profiles[activeLevelIndex].persona}"</span>
               </div>
             </div>
          </div>
        </Html>
      )}

      {/* Bridge / Next */}
      {(showBridge || showNext) && isActive && !warmup && (
        <Html position={[0, -2.5, 0]} center>
          <div className="text-center w-96">
             {showBridge && (
               <p className="text-lg text-slate-200 font-medium mb-4 animate-in fade-in slide-in-from-bottom-2">
                 {payload.bridgeLine}
               </p>
             )}
             {showNext && (
               <p className="text-sm text-accent uppercase tracking-widest animate-pulse">
                 {payload.nextLine}
               </p>
             )}
          </div>
        </Html>
      )}

    </group>
  );
}
