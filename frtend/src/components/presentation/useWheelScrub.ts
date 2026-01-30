import { useCallback, useEffect, useRef, useState } from "react";
import { clamp01, isFormElement } from "./utils";

const SNAP_EPS = 0.03;
const SCRUB_COOLDOWN_MS = 1200;
const IDLE_SNAP_DELAY = 150;
const SCROLL_SCALE = 0.85;

type Beat = { t: number; label?: string; snap?: boolean };

type SetSceneT = (next: number | ((prev: number) => number), meta?: { manual?: boolean }) => void;

type WheelScrubOpts = {
  stageRef: React.RefObject<HTMLElement>;
  beats?: Beat[];
  enabled: boolean;
  value?: number;
  onChange?: (t: number, meta?: { manual?: boolean }) => void;
  onShiftNavigate?: (dir: "next" | "prev") => void;
};

export function useWheelScrub(opts: WheelScrubOpts) {
  const { stageRef, beats, enabled, value, onChange, onShiftNavigate } = opts;
  const [sceneT, setSceneTState] = useState(value ?? 0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const lastScrubAt = useRef(0);
  const idleTimer = useRef<number | null>(null);
  const pendingDelta = useRef(0);
  const rafRef = useRef<number | null>(null);
  const sceneTRef = useRef(sceneT);

  useEffect(() => {
    sceneTRef.current = sceneT;
  }, [sceneT]);

  useEffect(() => {
    if (!enabled) {
      setIsScrubbing(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (typeof value !== "number") return;
    setSceneTState((prev) => {
      const clamped = clamp01(value);
      if (Math.abs(prev - clamped) < 0.0001) return prev;
      sceneTRef.current = clamped;
      return clamped;
    });
  }, [value]);

  const applySceneT = useCallback<SetSceneT>(
    (nextValue, meta) => {
      setSceneTState((prev) => {
        const resolved = typeof nextValue === "function" ? (nextValue as (p: number) => number)(prev) : nextValue;
        const clamped = clamp01(resolved);
        if (Math.abs(clamped - prev) < 0.0001) {
          if (meta?.manual) lastScrubAt.current = performance.now();
          return prev;
        }
        if (meta?.manual) lastScrubAt.current = performance.now();
        sceneTRef.current = clamped;
        onChange?.(clamped, meta);
        return clamped;
      });
    },
    [onChange],
  );

  const maybeSnap = useCallback(() => {
    if (!beats || beats.length === 0) return;
    const now = performance.now();
    if (now - lastScrubAt.current > SCRUB_COOLDOWN_MS) return;
    const nearest = beats.reduce(
      (acc, b) => {
        const d = Math.abs(b.t - sceneTRef.current);
        return d < acc.d ? { d, t: b.t } : acc;
      },
      { d: 1, t: sceneTRef.current },
    );
    if (nearest.d <= SNAP_EPS) {
      applySceneT(nearest.t);
    }
  }, [applySceneT, beats]);

  const flushDelta = useCallback(() => {
    const delta = pendingDelta.current;
    pendingDelta.current = 0;
    rafRef.current = null;
    if (!delta) return;
    setIsScrubbing(true);
    applySceneT((prev) => prev + delta, { manual: true });
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => {
      setIsScrubbing(false);
      maybeSnap();
    }, IDLE_SNAP_DELAY);
  }, [applySceneT, maybeSnap]);

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (isFormElement(target)) return;
      // Allow wheel globally; stageRef boundary checks caused misses in some layouts
      if (e.shiftKey && onShiftNavigate) {
        e.preventDefault();
        onShiftNavigate(e.deltaY > 0 ? "next" : "prev");
        return;
      }
      e.preventDefault();
      pendingDelta.current += normalizeWheel(e) * SCROLL_SCALE;
      if (!rafRef.current) {
        rafRef.current = window.requestAnimationFrame(flushDelta);
      }
    };
    window.addEventListener("wheel", handler, { passive: false });
    return () => {
      window.removeEventListener("wheel", handler);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, [enabled, flushDelta, onShiftNavigate, stageRef]);

  return { sceneT, setSceneT: applySceneT, isScrubbing, lastScrubAt };
}

function normalizeWheel(e: WheelEvent) {
  const base = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 800 : e.deltaY;
  const clamped = Math.max(-800, Math.min(800, base));
  return clamped / 1200;
}
