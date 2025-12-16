import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import { PresentationScene, SceneId, presentationScenes } from "../../data/presentation";
import AmbientScene from "./scenes/AmbientScene";
import FreezeScene from "./scenes/FreezeScene";
import DialScene from "./scenes/DialScene";
import KnobsScene from "./scenes/KnobsScene";
import LadderScene from "./scenes/LadderScene";
import XRayScene from "./scenes/XRayScene";
import PipelineScene from "./scenes/PipelineScene";
import LandscapeScene from "./scenes/LandscapeScene";
import AudienceScene from "./scenes/AudienceScene";
import FutureScene from "./scenes/FutureScene";
import HandoffScene from "./scenes/HandoffScene";

type SceneSlot = {
  scene: PresentationScene;
  isActive: boolean;
  isWarmup: boolean;
  sceneT: number;
};

type Props = {
  activeScene: PresentationScene;
  cachedScenes: PresentationScene[];
  sceneT: number;
  liteMode: boolean;
  warmupSceneId: SceneId | null;
  idleSceneT?: number;
};

function SceneRenderer({ scene, sceneT, liteMode, isActive, isWarmup }: SceneSlot & { liteMode: boolean }) {
  const commonProps = { sceneT, liteMode, isActive, warmup: isWarmup };
  switch (scene.id) {
    case SceneId.Ambient:
      return <AmbientScene payload={scene.payload} {...commonProps} />;
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
    case SceneId.Audience:
      return <AudienceScene {...commonProps} />;
    case SceneId.Future:
      return <FutureScene payload={scene.payload} {...commonProps} />;
    case SceneId.Handoff:
      return <HandoffScene payload={scene.payload} {...commonProps} />;
    default:
      return null;
  }
}

export default function ThreeStage({ activeScene, cachedScenes, sceneT, liteMode, warmupSceneId }: Props) {
  const freezeBoost = activeScene.id === SceneId.Freeze;
  const effectsEnabled = !liteMode;
  const dpr = useMemo(() => (liteMode ? [1, 1.25] : [1, 1.5]), [liteMode]);

  const slots = useMemo(() => {
    const map = new Map<SceneId, SceneSlot>();
    cachedScenes.concat(activeScene).forEach((scene) => {
      map.set(scene.id, { scene, isActive: scene.id === activeScene.id, isWarmup: false, sceneT: scene.id === activeScene.id ? sceneT : 0 });
    });
    if (warmupSceneId && !map.has(warmupSceneId)) {
      const warmupScene =
        cachedScenes.find((s) => s.id === warmupSceneId) ??
        presentationScenes.find((s) => s.id === warmupSceneId) ??
        activeScene;
      map.set(warmupSceneId, { scene: warmupScene, isActive: false, isWarmup: true, sceneT: 0 });
    } else if (warmupSceneId) {
      const existing = map.get(warmupSceneId);
      if (existing) {
        map.set(warmupSceneId, { ...existing, isWarmup: true });
      }
    }
    return Array.from(map.values());
  }, [activeScene, cachedScenes, sceneT, warmupSceneId]);

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
        {slots.map((slot) => (
          <group
            key={slot.scene.id}
            visible={slot.isActive || slot.isWarmup}
            scale={slot.isWarmup ? 0.0001 : 1}
            position={[0, 0, slot.isWarmup ? -30 : 0]}
          >
            <SceneRenderer scene={slot.scene} sceneT={slot.sceneT} liteMode={liteMode} isActive={slot.isActive} isWarmup={slot.isWarmup} />
          </group>
        ))}
        {effectsEnabled && (
          <EffectComposer>
            <Bloom intensity={freezeBoost ? 1.1 : 0.6} luminanceThreshold={0.12} mipmapBlur radius={0.7} />
            <Vignette eskil offset={0.08} darkness={0.9} />
            {freezeBoost && <ChromaticAberration offset={[0.002, 0.0015]} radialModulation />}
          </EffectComposer>
        )}
      </Suspense>
    </Canvas>
  );
}
