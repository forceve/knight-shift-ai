import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import UIStage from "../../components/presentation/UIStage";
import { PresentationScene, SceneId } from "../../data/presentation";

type PresentationContext = {
  scene: PresentationScene;
  sceneT: number;
  liteMode: boolean;
};

export default function SceneRoute() {
  const { scene, sceneT, liteMode } = useOutletContext<PresentationContext>();
  const [audienceSelection, setAudienceSelection] = useState<string | null>(null);

  // Reset/Init audience selection when scene is Audience
  useEffect(() => {
    if (scene.id === SceneId.Audience && !audienceSelection) {
      const first = scene.payload.branches?.[0];
      if (first) setAudienceSelection(first.id);
    }
  }, [scene.id, scene.payload, audienceSelection]);

  return (
    <UIStage
      scene={scene}
      sceneT={sceneT}
      liteMode={liteMode}
      audienceSelection={audienceSelection}
      onSelectBranch={setAudienceSelection}
    />
  );
}

