import { useCallback } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import UIStage from "../../components/presentation/UIStage";
import { PresentationScene } from "../../data/presentation";

type PresentationContext = {
  scene: PresentationScene;
  sceneT: number;
  liteMode: boolean;
};

export default function SceneRoute() {
  const { scene, sceneT, liteMode } = useOutletContext<PresentationContext>();
  const navigate = useNavigate();
  const handleHandoff = useCallback(() => navigate("/play"), [navigate]);

  return (
    <UIStage
      scene={scene}
      sceneT={sceneT}
      liteMode={liteMode}
      onHandoff={handleHandoff}
    />
  );
}
