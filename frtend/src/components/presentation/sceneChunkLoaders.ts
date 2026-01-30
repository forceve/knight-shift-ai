import { SceneId } from "../../data/presentation";

// Dynamic imports allow us to prefetch code chunks when needed.
// Current build also statically imports these scenes, but we keep loaders for future lazy splitting.
export const sceneChunkLoaders: Array<() => Promise<unknown>> = [
  () => import("./scenes/AmbientScene"),
  () => import("./scenes/Freeze/index"),
  () => import("./scenes/DialScene"),
  () => import("./scenes/Knobs"),
  () => import("./scenes/LadderScene"),
  () => import("./scenes/XRay"),
  () => import("./scenes/PipelineScene"),
  () => import("./scenes/LandscapeScene"),
  () => import("./scenes/FutureLite/FutureLiteScene"),
  () => import("./scenes/ClosingScene"),
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
  SceneId.FutureLite,
  SceneId.Closing,
];
