import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import { AmbientPayload, PresentationScene, SceneId, presentationScenes } from "../../data/presentation";
import AmbientScene from "./scenes/AmbientScene";
import FreezeScene from "./scenes/Freeze/index"; // Updated path
import DialScene from "./scenes/DialScene";
import KnobsScene from "./scenes/Knobs";
import LadderScene from "./scenes/LadderScene";
import XRayScene from "./scenes/XRay";
import PipelineScene from "./scenes/PipelineScene";
import LandscapeScene from "./scenes/LandscapeScene";
import PortalWipe from "./PortalWipe"; // Import

type SceneSlot = {
  scene: PresentationScene;
  sceneT: number;
  isActive: boolean;
  isWarmup: boolean;
};

type Props = {
  activeScene: PresentationScene;
  cachedScenes: PresentationScene[];
  sceneT: number;
  liteMode: boolean;
  warmupSceneId: SceneId | null;
};

function SceneRenderer({ scene, sceneT, liteMode, isActive, isWarmup }: SceneSlot & { liteMode: boolean }) {
  const commonProps = { sceneT, liteMode, isActive, warmup: isWarmup };
  switch (scene.id) {
    case SceneId.Freeze:
      return <FreezeScene payload={scene.payload} {...commonProps} />;
    case SceneId.Dial:
      return <DialScene payload={scene.payload} {...commonProps} />;
    case SceneId.Knobs:
      return <KnobsScene payload={scene.payload} {...commonProps} />;
    case SceneId.Ladder:
      return <LadderScene payload={scene.payload} {...commonProps} />;
    case SceneId.XRay:
      return <XRayScene payload={scene.payload} {...commonProps} />;
    case SceneId.Pipeline:
      return <PipelineScene payload={scene.payload} {...commonProps} />;
    case SceneId.Landscape:
      return <LandscapeScene payload={scene.payload} {...commonProps} />;
    case SceneId.FutureLite:
    case SceneId.Closing:
      return null;
    default:
      return null;
  }
}

export default function ThreeStage({ activeScene, cachedScenes, sceneT, liteMode, warmupSceneId }: Props) {
  const freezeBoost = activeScene.id === SceneId.Freeze;
  const effectsEnabled = !liteMode;
  const dpr = useMemo(() => (liteMode ? [1, 1.25] : [1, 1.5]), [liteMode]);
  const ambientScene = useMemo(() => presentationScenes.find((s) => s.id === SceneId.Ambient) as PresentationScene | undefined, []);
  const ambientPayload = (ambientScene?.payload ?? (presentationScenes[0]?.payload as AmbientPayload)) as AmbientPayload;

  // Transition Logic (Simple placeholder for "Portal Wipe")
  // We need state for transition. For now, we can infer it or just pass 0.
  // Ideally PresentationLayout controls transition state.
  // Assuming "activeScene" changes instantly, but we want a visual wipe.
  // The layout should handle the delay.
  // Here we just render the PortalWipe overlay.
  // We can drive PortalWipe using sceneT if the scene has a transition beat?
  // Or prop passed down?
  // Let's add a prop `transitionProgress` later. For now, render it invisible.
  
  const transitionProgress = 0; // Placeholder

  return (
    <Canvas
      className="presentation-canvas"
      dpr={dpr}
      camera={{ position: [0, 1.2, 6.5], fov: 50 }}
      gl={{ antialias: !liteMode, alpha: true }}
      frameloop="always"
    >
      <Suspense fallback={null}>
        <color attach="background" args={["#070c18"]} />
        {/* Persistent ambient backdrop (knights + particles) visible only for Landscape/FutureLite/Closing (Scene 7/8/9) and Scene 0 itself */}
        {ambientScene && (
          <group
            key="ambient-bg"
            visible={
              activeScene.id === SceneId.Ambient ||
              activeScene.id === SceneId.Landscape ||
              activeScene.id === SceneId.FutureLite ||
              activeScene.id === SceneId.Closing
            }
          >
            <AmbientScene
              payload={ambientPayload}
              sceneT={activeScene.id === SceneId.Ambient ? sceneT : 0}
              liteMode={liteMode}
              isActive={activeScene.id === SceneId.Ambient}
              warmup={false}
            />
          </group>
        )}
        <group key={activeScene.id} visible>
          <SceneRenderer scene={activeScene} sceneT={sceneT} liteMode={liteMode} isActive isWarmup={false} />
        </group>
        
        <PortalWipe active={false} progress={0} mode="idle" />

        {effectsEnabled && (
          <EffectComposer>
            <Bloom intensity={freezeBoost ? 0.8 : 0.4} luminanceThreshold={0.2} mipmapBlur radius={0.7} />
            <Vignette eskil offset={0.1} darkness={0.6} />
            {freezeBoost && <ChromaticAberration offset={[0.002, 0.0015]} radialModulation />}
          </EffectComposer>
        )}
      </Suspense>
    </Canvas>
  );
}
