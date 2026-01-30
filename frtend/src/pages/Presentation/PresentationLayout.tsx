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
  const [playbackSpeed, setPlaybackSpeed] = useState(0.8);
  
  // Scene memory to persist time per scene when navigating back/forth
  const sceneMemoryRef = useRef<Partial<Record<SceneId, number>>>({});
  const shellRef = useRef<HTMLDivElement | null>(null);
  const controlHideTimer = useRef<number | null>(null);
  const sceneTRef = useRef(0);
  const restartTimerRef = useRef<number | null>(null);

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
  const preventButtonFocus = (e: React.MouseEvent<HTMLElement>) => {
    // Prevent buttons from retaining focus so Space toggles play/pause instead of activating buttons
    e.preventDefault();
  };

  // Always start each scene at 0 progress
  const rememberedT = 0;
  
  // Input Handling:
  // Scene 1 & 2: Wheel controls BEATS (step-wise).
  // Others: Wheel controls time (continuous).
  // We need to adapt useWheelScrub or handle "step" logic.
  // Current useWheelScrub applies continuous delta.
  // We can "snap" to beats if we are in scene 1/2.
  
  const isStepBasedScene = scene.id === SceneId.Freeze || scene.id === SceneId.Dial || scene.id === SceneId.Knobs;
  const beats = scene.meta.beats ?? [];
  
  // Custom onChange wrapper to handle beat stepping for specific scenes
  const handleTimeChange = useCallback(
    (t: number, meta?: { manual?: boolean }) => {
      // Manual scrubs just update playhead; auto-advance resumes after cooldown.
      sceneTRef.current = t;
      if (meta?.manual) {
        showHudTemporarily();
      }
    },
    [showHudTemporarily],
  );

  const { sceneT, setSceneT, isScrubbing, lastScrubAt } = useWheelScrub({
    stageRef: shellRef,
    beats: scene.meta.beats,
    enabled: wheelEnabled,
    value: rememberedT,
    onChange: handleTimeChange,
    onShiftNavigate: (dir) => {
      if (dir === "next") {
        goNext();
      } else {
        goPrev();
      }
    },
  });

  const toggleAutoAdvance = useCallback(() => {
    setAutoAdvanceEnabled((v) => {
      const next = !v;
      if (next) {
        // Clear manual scrub cooldown so play resumes immediately after wheel/drag
        lastScrubAt.current = 0;
      }
      return next;
    });
  }, [lastScrubAt]);

  const stepSceneContent = useCallback(
    (direction: "forward" | "backward") => {
      const dir = direction === "forward" ? 1 : -1;
      const current = sceneTRef.current;
      const sortedBeats = beats.slice().sort((a, b) => a.t - b.t);
      const eps = 0.001;
      let target: number | null = null;

      if (sortedBeats.length > 0) {
        if (dir > 0) {
          const nextBeat = sortedBeats.find((b) => b.t > current + eps);
          if (nextBeat) target = nextBeat.t;
        } else {
          for (let i = sortedBeats.length - 1; i >= 0; i -= 1) {
            if (sortedBeats[i].t < current - eps) {
              target = sortedBeats[i].t;
              break;
            }
          }
        }
      }

      // Fallback: nudge timeline if no beats or at ends
      if (target === null) {
        const step = 0.08;
        target = clamp01(current + dir * step);
      }

      setSceneT(target, { manual: true });
      showHudTemporarily();
    },
    [beats, setSceneT, showHudTemporarily],
  );

  useEffect(() => {
    sceneTRef.current = sceneT;
  }, [sceneT]);

  // When scene changes, reset T to 0
  useEffect(() => {
    sceneMemoryRef.current[scene.id] = 0;
    setSceneT(0);
  }, [scene.id, setSceneT]);

  useEffect(() => {
    // When the final scene finishes, wait 1s then restart from the first scene.
    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    const isFinalScene = scene.id === SceneId.Closing;
    const isComplete = sceneT >= 0.999;
    if (isFinalScene && isComplete) {
      restartTimerRef.current = window.setTimeout(() => {
        restartTimerRef.current = null;
        setAutoAdvanceEnabled(true);
        navigate(`/presentation/${presentationScenes[0].id}`);
      }, 1000);
    }
  }, [navigate, scene.id, sceneT]);

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
        const delta = (dt / scene.meta.durationMs) * playbackSpeed;
        if (delta > 0) {
          setSceneT((prev) => clamp01(prev + delta));
        }
      }
      lastTs = ts;
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [autoAdvanceEnabled, isScrubbing, lastScrubAt, scene.meta.durationMs, warmupDone, setSceneT, scene.id, playbackSpeed]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isButton = target?.tagName === "BUTTON";
      if (isFormElement(target) && !isButton) return;
      if ((e.code === "Space" || e.key === "Enter") && scene.id === SceneId.Closing) {
        e.preventDefault();
        navigate("/play");
        return;
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        stepSceneContent("forward");
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        stepSceneContent("backward");
      } else if (e.key === "PageDown") {
        e.preventDefault();
        goNext();
      } else if (e.key === "PageUp") {
        e.preventDefault();
        goPrev();
      } else if (e.key.toLowerCase() === "w") {
        e.preventDefault();
        setPlaybackSpeed((s) => {
          const next = Math.min(4, s + 0.25);
          showHudTemporarily();
          return next;
        });
      } else if (e.key.toLowerCase() === "q") {
        e.preventDefault();
        setPlaybackSpeed((s) => {
          const next = Math.max(0.25, s - 0.25);
          showHudTemporarily();
          return next;
        });
      } else if (e.key.toLowerCase() === "p") {
        e.preventDefault();
        toggleAutoAdvance();
      } else if (e.code === "Space" || e.key === "Enter") {
        // Space/Enter toggle play/pause
        e.preventDefault();
        toggleAutoAdvance();
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
  }, [goNext, goPrev, isStepBasedScene, beats, setSceneT, stepSceneContent, showHudTemporarily, scene.id, navigate]);

  useEffect(() => {
    const onFull = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFull);
    return () => document.removeEventListener("fullscreenchange", onFull);
  }, []);

  useEffect(() => () => controlHideTimer.current && window.clearTimeout(controlHideTimer.current), []);
  useEffect(() => () => restartTimerRef.current && window.clearTimeout(restartTimerRef.current), []);

  const requestFullscreen = () => {
    if (shellRef.current && !document.fullscreenElement) {
      shellRef.current.requestFullscreen().catch(() => {});
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
    const target = e.target as HTMLElement | null;
    if (target?.closest(".presentation-hud, .presentation-overlay-layer")) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.button === 0) {
      // Left click: next scene
      e.preventDefault();
      goNext();
    } else if (e.button === 2) {
      e.preventDefault();
      goPrev();
    } else if (e.button === 3) {
      e.preventDefault();
      goPrev();
    } else if (e.button === 4) {
      e.preventDefault();
      goNext();
    }
  };

  const currentSceneLabel = useMemo(() => `${scene.meta.badge}: ${scene.meta.title}`, [scene.meta.badge, scene.meta.title]);
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
    <div ref={shellRef} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onClick={toggleFullscreenByCtrlClick} className="presentation-shell bg-midnight text-slate-50">
      <div className="presentation-stage">
        <div className="stage-inner">
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
            <button className="hud-btn" onMouseDown={preventButtonFocus} onClick={goPrev} aria-label="Previous scene">
              {"<"}
            </button>
            <button className="hud-btn hud-btn-primary" onMouseDown={preventButtonFocus} onClick={toggleAutoAdvance} aria-label="Play pause">
              {autoAdvanceEnabled ? "Pause" : "Play"}
            </button>
            <button className="hud-btn" onMouseDown={preventButtonFocus} onClick={goNext} aria-label="Next scene">
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
              <span className="ml-2 text-slate-400">Speed {playbackSpeed.toFixed(2)}x</span>
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
