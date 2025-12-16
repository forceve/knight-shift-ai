import { useEffect, useRef } from "react";
import { sceneChunkLoaders } from "./sceneChunkLoaders";

export function useScenePrefetch(enable: boolean) {
  const started = useRef(false);
  useEffect(() => {
    if (!enable || started.current) return;
    started.current = true;
    sceneChunkLoaders.forEach((fn) => {
      fn().catch(() => {
        /* ignore prefetch failures */
      });
    });
  }, [enable]);
}
