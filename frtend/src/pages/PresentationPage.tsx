import { useEffect, useMemo, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";

type Slide = {
  id: string;
  badge: string;
  title: string;
  kicker: string;
  summary: string;
  bullets: string[];
  vibe: "aurora" | "grid" | "audience";
  tag: string;
};

const SLIDE_DURATION_MS = 5200;

const slides: Slide[] = [
  {
    id: "aurora",
    badge: "Scene 1",
    title: "Aurora Rail",
    kicker: "Hero opener with camera-flight motion",
    summary: "Use sweeping aurora light, parallax cards, and a single bold line to open the deck beyond PPT.",
    bullets: ["Neon haze with depth blur", "Stacked tiles fly in (H2M / H2H / M2M)", "CTA row pulses once then settles"],
    vibe: "aurora",
    tag: "Cinematic storyline",
  },
  {
    id: "grid",
    badge: "Scene 2",
    title: "Neon Data Wall",
    kicker: "Metrics that feel alive",
    summary: "Glassy cards on a moving mesh; counters climb and bars glow. Perfect for benchmarks or architecture.",
    bullets: ["API rail -> engine rail -> eval rail", "Count-up metrics with shimmer underline", "Decision toggle: Ship vs Rerun"],
    vibe: "grid",
    tag: "Glassy metrics",
  },
  {
    id: "audience",
    badge: "Scene 3",
    title: "Audience Challenge Mode",
    kicker: "Let the audience play against your evaluation.",
    summary: "Throw a position, let the room pick a move, reveal cached verdicts, then auto-play a 3-ply proof.",
    bullets: ["Three scripted moves with eval chips", "Instant verdict reveal (no live compute)", "3-ply line proves the point"],
    vibe: "audience",
    tag: "Interactive vibe",
  },
];

type ChallengeMove = {
  move: string;
  eval: string;
  verdict: string;
  script: string[];
  tone: "safe" | "cautious" | "wild";
  levels: { level: string; eval: string; outcome: string }[];
};

const challengeMoves: ChallengeMove[] = [
  {
    move: "1...Nf6",
    eval: "+0.8",
    verdict: "Best practical: develops, covers e4, keeps d5 pressure, and heads to quick castle.",
    script: ["1...Nf6 2.Nf3 d6", "...Be7 0-0 and Black is fully coordinated", "White loses the punch; eval holds around +0.8 for Black"],
    tone: "safe",
    levels: [
      { level: "Level 1", eval: "+1.4", outcome: "Wins center quickly; weak replies collapse." },
      { level: "Level 2", eval: "+1.0", outcome: "Solid lead, easy development to kingside castle." },
      { level: "Level 3", eval: "+0.8", outcome: "Keeps d5 under control; flexible plan." },
      { level: "Ultimate", eval: "+0.6", outcome: "Sound and resilient; no tactical holes." },
    ],
  },
  {
    move: "1...dxe4",
    eval: "+0.2",
    verdict: "Equalizes but concedes initiative; White develops with tempo and keeps the crowd engaged.",
    script: ["1...dxe4 2.Nxe4 Nf6", "3.Nxf6+ Qxf6 4.Nf3 Be7", "Calm play, but you lose the wow factor"],
    tone: "cautious",
    levels: [
      { level: "Level 1", eval: "+0.6", outcome: "You stay fine; White gets easy piece play." },
      { level: "Level 2", eval: "+0.3", outcome: "Slight edge but tempo lost." },
      { level: "Level 3", eval: "+0.2", outcome: "Equal, initiative to White." },
      { level: "Ultimate", eval: "0.0", outcome: "Neutral; prepares simple development." },
    ],
  },
  {
    move: "1...Bb4+",
    eval: "-0.4",
    verdict: "Flashy check that backfires: c3/d4 hit back and Black falls behind development.",
    script: ["1...Bb4+ 2.c3 Be7", "3.d4 exd4 4.cxd4", "White owns the center; backward d-pawn becomes a target"],
    tone: "wild",
    levels: [
      { level: "Level 1", eval: "-0.7", outcome: "Tactical slip: center collapses fast." },
      { level: "Level 2", eval: "-0.5", outcome: "Behind in development; pressure on d-pawn." },
      { level: "Level 3", eval: "-0.4", outcome: "Loses time; White expands easily." },
      { level: "Ultimate", eval: "-0.6", outcome: "Punished: weak dark squares, tempo lost." },
    ],
  },
];

export default function PresentationPage() {
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [selectedMove, setSelectedMove] = useState<ChallengeMove>(challengeMoves[0]);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const controlHideTimer = useRef<number | null>(null);
  const lastScrollAt = useRef<number>(0);

  const slide = slides[index % slides.length];
  const progress = Math.min(100, Math.round((elapsed / SLIDE_DURATION_MS) * 100));
  const audienceFen = "r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 1";

  const boardSquares = useMemo(
    () =>
      Array.from({ length: 8 }, (_, row) =>
        Array.from({ length: 8 }, (_col, col) => ({
          key: `${row}-${col}`,
          isLight: (row + col) % 2 === 0,
        })),
      ),
    [],
  );

  const goNext = () => {
    setIndex((prev) => (prev + 1) % slides.length);
    setElapsed(0);
  };
  const goPrev = () => {
    setIndex((prev) => (prev - 1 + slides.length) % slides.length);
    setElapsed(0);
  };

  useEffect(() => {
    if (!isPlaying) return;
    const tick = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 160;
        if (next >= SLIDE_DURATION_MS) {
          goNext();
          return 0;
        }
        return next;
      });
    }, 160);
    return () => clearInterval(tick);
  }, [isPlaying]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "BUTTON", "SELECT"].includes(target.tagName)) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((v) => !v);
      } else if (e.key === "Escape" && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    setElapsed(0);
  }, [index]);

  useEffect(() => {
    const onFull = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFull);
    return () => document.removeEventListener("fullscreenchange", onFull);
  }, []);

  useEffect(() => {
    return () => {
      if (controlHideTimer.current) {
        window.clearTimeout(controlHideTimer.current);
      }
    };
  }, []);

  const requestFullscreen = () => {
    if (stageRef.current && !document.fullscreenElement) {
      stageRef.current.requestFullscreen().catch(() => {});
    }
  };

  const toggleFullscreenByCtrlClick = (e: React.MouseEvent<HTMLDivElement>) => {
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
    setShowControls(true);
    if (controlHideTimer.current) {
      window.clearTimeout(controlHideTimer.current);
    }
    controlHideTimer.current = window.setTimeout(() => setShowControls(false), 2400);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (now - lastScrollAt.current < 500) return;
    lastScrollAt.current = now;
    if (e.deltaY > 0) {
      goNext();
    } else if (e.deltaY < 0) {
      goPrev();
    }
  };

  const boardSize = useMemo(() => {
    if (typeof window === "undefined") return 420;
    return Math.min(520, window.innerWidth - 80);
  }, []);

  return (
    <div
      ref={stageRef}
      onMouseMove={handleMouseMove}
      onWheel={handleWheel}
      onClick={toggleFullscreenByCtrlClick}
      className="relative min-h-[calc(100vh-64px)] w-full overflow-hidden bg-midnight text-slate-50"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className={`presentation-aurora ${slide.vibe === "aurora" ? "opacity-90" : "opacity-40"}`} />
        <div className={`presentation-grid ${slide.vibe === "grid" ? "opacity-80" : "opacity-30"}`} />
        <div className={`presentation-particles ${slide.vibe === "audience" ? "opacity-90" : "opacity-30"}`} />
        <div className="presentation-sweep" />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex-1 flex flex-col lg:flex-row items-start lg:items-center gap-10 px-6 sm:px-10 lg:px-16 py-6">
          <div className="flex-1 space-y-4 max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="pill">{slide.badge}</div>
              <div className="text-xs text-hint">{slide.tag}</div>
            </div>
            <div className="text-sm uppercase tracking-[0.3em] text-slate-300">{slide.kicker}</div>
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight">{slide.title}</h1>
            <p className="text-slate-200 text-lg max-w-2xl">{slide.summary}</p>
            <ul className="text-base text-slate-200 space-y-2">
              {slide.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="w-full lg:w-[440px] xl:w-[520px]">
            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6 shadow-glow overflow-hidden">
              <div className="flex items-center justify-between text-xs text-slate-300 mb-3">
                <span>{slide.title}</span>
                <span className="text-hint">{slide.badge}</span>
              </div>
              <div className="relative h-96 rounded-2xl overflow-hidden border border-white/10 bg-midnight/80">
                <div className="absolute inset-0 presentation-mini-grid opacity-60" />
                <div className="absolute inset-0">
                  <div
                    className={`absolute -left-10 top-10 w-52 h-36 rounded-2xl rotate-[-6deg] blur-[2px] ${
                      slide.vibe === "aurora" ? "bg-gradient-to-br from-hint/40 to-accent/30" : ""
                    } ${slide.vibe === "grid" ? "bg-gradient-to-br from-white/15 to-accent/15" : ""} ${
                      slide.vibe === "audience" ? "bg-gradient-to-br from-accent/30 to-hint/25" : ""
                    } border border-white/15 shadow-glow`}
                  />
                  <div className="absolute left-8 top-12 w-64 h-40 rounded-2xl bg-panel/80 border border-white/15 shadow-lg shadow-accent/20 rotate-[3deg] p-4 flex flex-col gap-2">
                    <div className="text-[11px] uppercase tracking-wide text-slate-400">Slide</div>
                    <div className="text-base text-slate-50 font-semibold">{slide.title}</div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-hint to-accent" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="text-[11px] text-slate-400">Autoplay demo</div>
                  </div>
                  <div className="absolute right-8 top-10 w-44 h-24 rounded-xl bg-white/5 border border-white/15 backdrop-blur flex flex-col items-center justify-center text-[11px] text-slate-100 gap-1">
                    <span>Motion path</span>
                    <span className="text-hint">Parallax enabled</span>
                  </div>
                  <div className="absolute right-8 bottom-10 w-48 h-28 rounded-xl bg-gradient-to-br from-white/10 to-accent/10 border border-white/10 flex flex-col justify-center items-center text-[11px] text-slate-100 gap-1">
                    <span>Micro timeline</span>
                    <span className="text-hint">00:{String((index + 1) * 12).padStart(2, "0")}</span>
                  </div>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-midnight to-transparent" />
              </div>
              <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-2">
                <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10 capitalize">{slide.vibe} look</span>
                <span>Hard-coded deck; hook up real assets later.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 sm:px-10 lg:px-16 pb-16 space-y-3">
          <div className="h-[10px] bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-hint to-accent" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex flex-wrap gap-2">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setIndex(idx)}
                className={`px-3 py-2 rounded-full text-xs border transition ${
                  idx === index ? "bg-accent text-midnight border-accent font-semibold" : "bg-white/5 border-white/10 text-slate-100 hover:bg-white/10"
                }`}
              >
                {s.badge}: {s.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed left-4 bottom-4 md:left-6 md:bottom-6 z-30">
        <div
          className="flex items-center gap-2 bg-black/70 border border-white/10 rounded-full px-3 py-2 shadow-lg backdrop-blur transition-opacity duration-300"
          style={{ opacity: showControls ? 1 : 0.08 }}
        >
          <div className="text-[11px] text-slate-200 px-2">Slide {index + 1}/{slides.length}</div>
          <button
            className="w-8 h-8 rounded bg-white/10 text-slate-100 hover:bg-white/20 font-semibold"
            onClick={goPrev}
            aria-label="Previous slide"
          >
            {"<"}
          </button>
          <button
            className="w-9 h-9 rounded bg-accent text-midnight font-bold hover:brightness-110"
            onClick={() => setIsPlaying((v) => !v)}
            aria-label="Play/Pause"
          >
            {isPlaying ? "||" : ">"}
          </button>
          <button
            className="w-8 h-8 rounded bg-white/10 text-slate-100 hover:bg-white/20 font-semibold"
            onClick={goNext}
            aria-label="Next slide"
          >
            {">"}
          </button>
          <div className="text-[11px] text-slate-300 px-2">Space to pause - Arrows to navigate</div>
        </div>
      </div>

      {slide.id === "audience" && (
        <div className="absolute right-4 top-20 md:right-10 md:top-24 z-20 w-full max-w-5xl">
          <div className="card bg-panel/90 border-white/10 p-4 md:p-5 space-y-4 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="pill mb-2 inline-block">Scene 3 · Audience Challenge Mode</div>
                <div className="text-xs text-hint">English tag: "Let the audience play against your evaluation."</div>
              </div>
              <div className="text-[11px] text-slate-400">Scripted, no live compute</div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <Chessboard
                    id="audience-board"
                    position={audienceFen}
                    arePiecesDraggable={false}
                    boardWidth={boardSize}
                    customBoardStyle={{
                      borderRadius: 16,
                      boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
                    }}
                  />
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-2">
                  <div className="text-sm font-semibold text-slate-50">Prepared proof line</div>
                  <div className="space-y-1 text-xs text-slate-200">
                    {selectedMove.script.map((line, idx) => (
                      <div key={line} className="flex items-start gap-2">
                        <span className="px-2 py-1 rounded bg-white/10 border border-white/10 text-[11px] text-slate-300">#{idx + 1}</span>
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm text-slate-300">Pick a move (hard-coded outcomes)</div>
                <div className="flex flex-wrap gap-2">
                  {challengeMoves.map((m) => {
                    const active = selectedMove.move === m.move;
                    return (
                      <button
                        key={m.move}
                        onClick={() => setSelectedMove(m)}
                        className={`px-3 py-2 rounded-lg border text-sm transition ${
                          active ? "border-accent bg-accent text-midnight font-semibold" : "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                        }`}
                      >
                        <div>{m.move}</div>
                        <div className="text-[11px] opacity-80">{m.eval}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-50">{selectedMove.move}</div>
                    <div
                      className={`px-2 py-1 rounded-full text-[11px] font-semibold ${
                        selectedMove.tone === "safe"
                          ? "bg-accent/20 text-accent"
                          : selectedMove.tone === "cautious"
                          ? "bg-hint/20 text-hint"
                          : "bg-red-400/20 text-red-200"
                      }`}
                    >
                      {selectedMove.eval}
                    </div>
                  </div>
                  <p className="text-sm text-slate-200">{selectedMove.verdict}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedMove.levels.map((lvl) => (
                      <div key={lvl.level} className="rounded-lg border border-white/10 bg-white/5 p-2">
                        <div className="text-[11px] text-slate-300">{lvl.level}</div>
                        <div className="text-sm font-semibold text-slate-50">{lvl.eval}</div>
                        <div className="text-[11px] text-slate-400">{lvl.outcome}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-[11px] text-slate-500">Audience picks a move; you reveal eval per level and narrate the 3-ply proof.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
