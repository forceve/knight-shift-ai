import { useEffect, useRef, useState } from "react";
import { SceneId } from "../../data/presentation";

export function useWarmupQueue(ids: SceneId[], enable: boolean) {
  const [warmupSceneId, setWarmupSceneId] = useState<SceneId | null>(null);
  const [done, setDone] = useState(!enable);
  const cancelled = useRef(false);
  const started = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    if (!enable || started.current) return;
    started.current = true;
    setDone(false);
    const run = async () => {
      await new Promise((r) => setTimeout(r, 300));
      for (const id of ids) {
        if (cancelled.current) return;
        setWarmupSceneId(id);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      }
      setWarmupSceneId(null);
      setDone(true);
    };
    run();
    return () => {
      cancelled.current = true;
    };
  }, [enable, ids]);

  return { warmupSceneId, warmupDone: done };
}
