import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import ThreeStage from "../../components/presentation/ThreeStage";
import { SceneId, presentationScenes } from "../../data/presentation";
import { clamp01, isFormElement } from "../../components/presentation/utils";
import { useScenePrefetch } from "../../components/presentation/useScenePrefetch";
import { useWarmupQueue } from "../../components/presentation/useWarmupQueue";
import { useThesisDirector } from "../../components/presentation/useThesisDirector";
import ThesisLayer from "../../components/presentation/ThesisLayer";
import { SCENE_IDS_IN_ORDER } from "../../components/presentation/sceneChunkLoaders";
import { useWheelScrub } from "../../components/presentation/useWheelScrub";

const HUD_HIDE_DELAY_MS = 2600;
const MANUAL_SCRUB_COOLDOWN_MS = 1200;

export default function PresentationLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine active scene from URL
  // We expect /presentation/:sceneId
  // If we are at /presentation, we might redirect (handled in App.tsx routes usually),
  // but here we need to know the active index for the background.
  const pathParts = location.pathname.split("/");
  const currentSceneId = pathParts[pathParts.length - 1]; // simplistic, assumes /presentation/sceneX
  
  const activeIndex = useMemo(() => {
    const idx = presentationScenes.findIndex((s) => s.id === currentSceneId);
    return idx === -1 ? 0 : idx;
  }, [currentSceneId]);

  const scene = presentationScenes[activeIndex];
  
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(true);
  const [hudVisible, setHudVisible] = useState(true);
  const [liteMode, setLiteMode] = useState(false);
  const [wheelEnabled, setWheelEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Scene memory to persist time per scene when navigating back/forth
  const sceneMemoryRef = useRef<Partial<Record<SceneId, number>>>({});
  const stageFrameRef = useRef<HTMLDivElement | null>(null);
  const controlHideTimer = useRef<number | null>(null);
  const sceneTRef = useRef(0);

  const thesis = useThesisDirector(scene);

  const prevScene = presentationScenes[(activeIndex - 1 + presentationScenes.length) % presentationScenes.length];
  const nextScene = presentationScenes[(activeIndex + 1) % presentationScenes.length];
  
  const cachedScenes = useMemo(() => {
    const list = [scene, prevScene, nextScene];
    const map = new Map(list.map((s) => [s.id, s]));
    return Array.from(map.values());
  }, [nextScene, prevScene, scene]);

  useScenePrefetch(true);
  const { warmupSceneId, warmupDone } = useWarmupQueue(SCENE_IDS_IN_ORDER, true);

  const goNext = useCallback(() => {
    const nextIdx = (activeIndex + 1) % presentationScenes.length;
    navigate(`/presentation/${presentationScenes[nextIdx].id}`);
  }, [activeIndex, navigate]);

  const goPrev = useCallback(() => {
    const prevIdx = (activeIndex - 1 + presentationScenes.length) % presentationScenes.length;
    navigate(`/presentation/${presentationScenes[prevIdx].id}`);
  }, [activeIndex, navigate]);

  const showHudTemporarily = useCallback(() => {
    setHudVisible(true);
    if (controlHideTimer.current) {
      window.clearTimeout(controlHideTimer.current);
    }
    controlHideTimer.current = window.setTimeout(() => setHudVisible(false), HUD_HIDE_DELAY_MS);
  }, []);

  // Restore memory for this scene
  const rememberedT = sceneMemoryRef.current[scene.id] ?? 0;
  
  const { sceneT, setSceneT, isScrubbing, lastScrubAt } = useWheelScrub({
    stageRef: stageFrameRef,
    beats: scene.meta.beats,
    enabled: wheelEnabled,
    value: rememberedT,
    onChange: (t, meta) => {
      sceneTRef.current = t;
      if (sceneMemoryRef.current[scene.id] !== t) {
        sceneMemoryRef.current[scene.id] = t;
      }
      if (meta?.manual) showHudTemporarily();
    },
    onShiftNavigate: (dir) => {
      if (dir === "next") {
        goNext();
      } else {
        goPrev();
      }
    },
  });

  useEffect(() => {
    sceneTRef.current = sceneT;
  }, [sceneT]);

  // When scene changes, reset T to remembered value (or 0)
  useEffect(() => {
    if (sceneMemoryRef.current[scene.id] === undefined) {
      sceneMemoryRef.current[scene.id] = 0; // Default start at 0
    }
    const targetT = sceneMemoryRef.current[scene.id] ?? 0;
    setSceneT(targetT);
    
    // Auto-reset audience selection is handled in SceneRoute or we pass a key to force reset
  }, [scene.id, setSceneT]); // scene.id is the trigger

  // Playback Loop
  useEffect(() => {
    let raf: number;
    let lastTs: number | null = null;
    const tick = (ts: number) => {
      if (!autoAdvanceEnabled || !warmupDone) {
        lastTs = ts;
        raf = window.requestAnimationFrame(tick);
        return;
      }
      if (isScrubbing || performance.now() - lastScrubAt.current < MANUAL_SCRUB_COOLDOWN_MS) {
        lastTs = ts;
        raf = window.requestAnimationFrame(tick);
        return;
      }
      if (sceneTRef.current >= 1) {
        lastTs = ts;
        raf = window.requestAnimationFrame(tick);
        return;
      }
      if (lastTs !== null) {
        const dt = ts - lastTs;
        const delta = dt / scene.meta.durationMs;
        if (delta > 0) {
          setSceneT((prev) => clamp01(prev + delta));
        }
      }
      lastTs = ts;
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [autoAdvanceEnabled, isScrubbing, lastScrubAt, scene.meta.durationMs, warmupDone, setSceneT, scene.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isFormElement(e.target)) return;
      if (e.key === "ArrowRight" || e.code === "Space" || e.key === "PageDown") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goPrev();
      } else if (e.key.toLowerCase() === "p") {
        setAutoAdvanceEnabled((v) => !v);
      } else if (e.key.toLowerCase() === "h") {
        setHudVisible((v) => !v);
      } else if (e.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          setHudVisible(false);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  useEffect(() => {
    const onFull = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFull);
    return () => document.removeEventListener("fullscreenchange", onFull);
  }, []);

  useEffect(() => () => controlHideTimer.current && window.clearTimeout(controlHideTimer.current), []);

  const requestFullscreen = () => {
    if (stageFrameRef.current && !document.fullscreenElement) {
      stageFrameRef.current.requestFullscreen().catch(() => {});
    }
  };

  const toggleFullscreenByCtrlClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.ctrlKey) {
      e.preventDefault();
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        requestFullscreen();
      }
    }
  };

  const handleMouseMove = () => {
    showHudTemporarily();
  };

  const handleMouseUp = (e: MouseEvent<HTMLDivElement>) => {
    if (isFormElement(e.target)) return;
    if (e.button === 3) {
      e.preventDefault();
      goPrev();
    } else if (e.button === 4) {
      e.preventDefault();
      goNext();
    }
  };

  const currentSceneLabel = useMemo(() => `${scene.meta.badge}: ${scene.meta.title}`, [scene.meta.badge, scene.meta.title]);
  const beats = scene.meta.beats ?? [];
  const activeBeat = useMemo(() => {
    if (!beats.length) return null;
    const nearest = beats.reduce(
      (acc, beat) => {
        const d = Math.abs(beat.t - sceneT);
        return d < acc.d ? { d, beat } : acc;
      },
      { d: 1, beat: beats[0] },
    );
    return nearest.d < 0.2 ? nearest.beat : null;
  }, [beats, sceneT]);
  const progressPercent = Math.round(sceneT * 100);

  return (
    <div onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onClick={toggleFullscreenByCtrlClick} className="presentation-shell bg-midnight text-slate-50">
      <div className="presentation-stage">
        <div className="stage-inner" ref={stageFrameRef}>
          <div className="presentation-canvas-layer">
            <ThreeStage activeScene={scene} cachedScenes={cachedScenes} sceneT={sceneT} liteMode={liteMode} warmupSceneId={warmupSceneId} />
          </div>
          <div className="presentation-overlay-layer">
            <ThesisLayer thesis={thesis} />
            <Outlet context={{ scene, sceneT, liteMode }} />
          </div>
        </div>
      </div>

      {!warmupDone && (
        <div className="warmup-overlay">
          <div className="warmup-card">Loading stage - warming shaders</div>
        </div>
      )}

      <div className="presentation-hud" style={{ opacity: hudVisible ? 1 : 0.12 }}>
        <div className="hud-left">
          <div className="text-[11px] text-slate-300">{currentSceneLabel}</div>
          <div className="flex items-center gap-2">
            <button className="hud-btn" onClick={goPrev} aria-label="Previous scene">
              {"<"}
            </button>
            <button className="hud-btn hud-btn-primary" onClick={() => setAutoAdvanceEnabled((v) => !v)} aria-label="Play pause">
              {autoAdvanceEnabled ? "Pause" : "Play"}
            </button>
            <button className="hud-btn" onClick={goNext} aria-label="Next scene">
              {">"}
            </button>
          </div>
          <div className="hud-timeline">
            <div className="hud-timeline-track">
              <div className="hud-timeline-progress" style={{ width: `${progressPercent}%` }} />
              {beats.map((beat, idx) => (
                <div
                  key={`${beat.t}-${idx}`}
                  className={`hud-beat ${sceneT >= beat.t ? "past" : ""} ${beat.snap ? "snap" : ""}`}
                  style={{ left: `${beat.t * 100}%` }}
                  title={beat.label}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSceneT(beat.t, { manual: true });
                  }}
                />
              ))}
              <div className="hud-playhead" style={{ left: `${progressPercent}%` }} />
            </div>
            <div className="hud-timeline-meta">
              <span>{progressPercent}%</span>
              {activeBeat?.label && <span className="hud-beat-label">{activeBeat.label}</span>}
            </div>
          </div>
        </div>
        <div className="hud-right">
          <button className={`hud-pill ${liteMode ? "active" : ""}`} onClick={() => setLiteMode((v) => !v)}>
            Lite {liteMode ? "ON" : "OFF"}
          </button>
          <button className={`hud-pill ${wheelEnabled ? "active" : ""}`} onClick={() => setWheelEnabled((v) => !v)}>
            Wheel {wheelEnabled ? "ON" : "OFF"}
          </button>
          <button className="hud-pill" onClick={requestFullscreen}>
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </button>
        </div>
      </div>
    </div>
  );
}

