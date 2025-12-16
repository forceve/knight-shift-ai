import { useEffect, useMemo, useState } from "react";
import { MAIN_THESIS, PresentationScene, ThesisCue, ThesisMode } from "../../data/presentation";

export type ThesisState = {
  mode: ThesisMode;
  headline: string;
  subline?: string;
  emphasize?: string[];
  effect?: ThesisCue["effect"];
  chapterTag?: string;
  punching?: boolean;
};

const DEFAULT_STATE: ThesisState = {
  mode: "hero",
  headline: MAIN_THESIS,
  subline: "Budget ladder as a product",
  effect: "glow",
  chapterTag: "Intro",
};

export function useThesisDirector(scene: PresentationScene) {
  const [state, setState] = useState<ThesisState>(DEFAULT_STATE);

  const cue = useMemo<ThesisCue | undefined>(() => scene.meta.thesisCue, [scene.meta.thesisCue]);

  useEffect(() => {
    if (!cue) {
      setState({
        mode: "echo",
        headline: MAIN_THESIS,
        subline: scene.meta.title,
        chapterTag: scene.meta.badge,
      });
      return;
    }

    const mode = cue.mode ?? "echo";
    const headline = cue.headline ?? MAIN_THESIS;
    const subline = cue.subline ?? scene.meta.title;
    const emphasize = cue.emphasize ?? [];
    const effect = cue.effect ?? "glow";
    const chapterTag = cue.chapterTag ?? scene.meta.badge;
    const duration = cue.durationMs ?? 2200;

    if (mode === "punch") {
      setState({ mode: "punch", headline, subline, emphasize, effect, chapterTag, punching: true });
      const timer = window.setTimeout(() => {
        setState({ mode: "echo", headline: MAIN_THESIS, subline: chapterTag ?? subline, effect, chapterTag, punching: false });
      }, duration);
      return () => window.clearTimeout(timer);
    }

    setState({ mode, headline, subline, emphasize, effect, chapterTag, punching: false });
  }, [cue, scene.meta.badge, scene.meta.title]);

  return state;
}
