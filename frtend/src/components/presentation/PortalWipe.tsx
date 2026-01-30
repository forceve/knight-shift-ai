import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type Props = {
  active: boolean; // Is transition active? (Usually based on sceneT of outgoing scene or global state)
  progress: number; // 0 (open/idle) -> 1 (wipe full) -> 0 (close)
  mode: "open" | "close" | "idle";
};

// Global portal wipe component that can be overlayed in ThreeStage
export default function PortalWipe({ active, progress, mode }: Props) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();

  // Shader material for the portal effect
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uProgress: { value: 0 }, // 0 to 1
      uColor: { value: new THREE.Color("#0b1224") }, // Background color to wipe to
      uEdgeColor: { value: new THREE.Color("#4ee1a0") },
      uResolution: { value: new THREE.Vector2(viewport.width, viewport.height) },
    }),
    [viewport]
  );

  useFrame((state) => {
    if (meshRef.current) {
      uniforms.uTime.value = state.clock.elapsedTime;
      uniforms.uProgress.value = progress;
    }
  });

  // If not active and not wiping, render nothing or just a thin line?
  // Requirements: "idle (thin light strip)", "open (door gap)", "wipe (mask)"
  // So it is always visible to some extent?
  // "Transition (Scene1->Scene2): ... portal wipe ... from Scene1 end"
  
  // Implementation:
  // A plane that covers the screen.
  // Fragment shader creates a hole in the middle.
  // The hole size depends on progress.
  // progress 0: Hole is infinite (invisible).
  // progress 1: Hole is 0 (fully opaque).
  
  // But we want "Idle (thin light strip)".
  // So:
  // Idle: A vertical thin line glow in center.
  // Open: Line expands to a gap.
  // Wipe: Gap INVERTS? Or material is the background?
  
  // Let's use a simpler approach for stability:
  // Two planes (Left and Right doors).
  // Idle: Open (planes far apart? No, thin line means they are almost touching?).
  // "Portal open": Gap widens.
  // "Wipe": Actually, a "Portal Wipe" usually means the portal expands to fill the screen, revealing the next scene?
  // Or the portal IS the mask?
  // "Portal from center extends to become mask (wipe)".
  // This means the "hole" becomes the "content"?
  // Or the "blackness" expands?
  // "Portal expands... wipe... scene 2 dial appears".
  // This implies the portal content (new scene) wipes over the old scene.
  // But Scene 2 is Dial.
  // Let's assume:
  // 1. Scene 1 is visible.
  // 2. Portal (glow) in center expands.
  // 3. Inside the portal is Scene 2? (Hard to do without multiple render passes).
  // Easier:
  // 1. Portal shape (white/glow) expands from center to cover screen.
  // 2. Full white/glow.
  // 3. Switch scene behind.
  // 4. Portal shape shrinks/fades revealing Scene 2.
  
  // Shader: 
  // Alpha = 1.0 inside the "Wipe" zone? 
  // No, we want to block the view.
  
  return (
    <mesh ref={meshRef} position={[0, 0, 10]}>
      <planeGeometry args={[viewport.width, viewport.height]} />
      <shaderMaterial
        transparent
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform float uProgress;
          uniform vec3 uColor;
          uniform vec3 uEdgeColor;
          varying vec2 vUv;

          // Signed distance to a vertical line in center
          float sdBox(vec2 p, vec2 b) {
            vec2 d = abs(p)-b;
            return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
          }

          void main() {
            vec2 uv = vUv * 2.0 - 1.0;
            // Aspect ratio fix?
            
            // Progress 0: Visible Scene (Transparent).
            // Progress 1: Full Coverage (Opaque Color).
            
            // We want a vertical slit expanding.
            float width = uProgress * 2.0; // Expand to full width
            
            // Inverted: We want to draw the "Door" closing or the "Portal" opening?
            // "Wipe" usually means obscuring old scene.
            // Let's make two black curtains closing from sides?
            // Or a central light expanding?
            // User said: "Portal from center extends to become mask".
            // Mask usually hides.
            
            // Let's draw a central box.
            // If progress = 0 (idle), box is thin (glow).
            // If progress -> 1 (wipe), box fills screen.
            
            float dist = abs(uv.x);
            float mask = 1.0 - smoothstep(width - 0.1, width, dist);
            
            // If mask=1 (center), we are "in portal".
            // If mask=0 (sides), we are "outside".
            
            // We want the Portal to be the OPAQUE part that wipes the screen?
            // "Wipe... UI/boards fade out... Switch... Portal close".
            // So the Portal IS the occluder.
            
            vec3 color = uColor;
            float alpha = mask;
            
            // Edge glow
            float edge = smoothstep(width, width - 0.05, dist) - smoothstep(width - 0.05, width - 0.1, dist);
            color += uEdgeColor * edge * 2.0;
            
            gl_FragColor = vec4(color, alpha);
          }
        `}
      />
    </mesh>
  );
}

