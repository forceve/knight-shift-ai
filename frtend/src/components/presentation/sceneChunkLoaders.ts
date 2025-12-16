import { SceneId } from "../../data/presentation";

// Dynamic imports allow us to prefetch code chunks when needed.
// Current build also statically imports these scenes, but we keep loaders for future lazy splitting.
export const sceneChunkLoaders: Array<() => Promise<unknown>> = [
  () => import("./scenes/AmbientScene"),
  () => import("./scenes/FreezeScene"),
  () => import("./scenes/DialScene"),
  () => import("./scenes/KnobsScene"),
  () => import("./scenes/LadderScene"),
  () => import("./scenes/XRayScene"),
  () => import("./scenes/PipelineScene"),
  () => import("./scenes/LandscapeScene"),
  () => import("./scenes/AudienceScene"),
  () => import("./scenes/FutureScene"),
  () => import("./scenes/HandoffScene"),
];

export const SCENE_IDS_IN_ORDER: SceneId[] = [
  SceneId.Ambient,
  SceneId.Freeze,
  SceneId.Dial,
  SceneId.Knobs,
  SceneId.Ladder,
  SceneId.XRay,
  SceneId.Pipeline,
  SceneId.Landscape,
  SceneId.Audience,
  SceneId.Future,
  SceneId.Handoff,
];
