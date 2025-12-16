import React, { useMemo, useState, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { aiMove, createGame, humanMove, resignGame } from "../api";
import { Controls } from "../components/Controls";
import { MoveList } from "../components/MoveList";
import { StatusBar } from "../components/StatusBar";
import { AILevel, GameMode, GameState, PlayerColor } from "../types";

export default function PlayPage() {
  const [mode, setMode] = useState<GameMode>("h2m");
  const [aiLevel, setAiLevel] = useState<AILevel>("level2");
  const [whiteEngine, setWhiteEngine] = useState<AILevel>("level2");
  const [blackEngine, setBlackEngine] = useState<AILevel>("level2");
  const [color, setColor] = useState<PlayerColor>("white");
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [aiTimeLimit, setAiTimeLimit] = useState<number>(1.0);
  const [selected, setSelected] = useState<string | null>(null);
  const [legalTargets, setLegalTargets] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);

  const orientation = useMemo(() => (color === "white" ? "white" : "black"), [color]);
  const boardWidth = useMemo(() => (typeof window === "undefined" ? 520 : Math.min(520, window.innerWidth - 48)), []);

  useEffect(() => {
    if (state && state.status !== "in_progress") {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [state]);

  const newGame = async () => {
    try {
      const payload: any = { mode, player_color: color };
      if (mode === "m2m") {
        payload.white_engine = whiteEngine;
        payload.black_engine = blackEngine;
      } else if (mode !== "h2h") {
        payload.ai_level = aiLevel;
      }
      const data = await createGame(payload);
      setState(data);
      setError(null);
      // If AI starts (player picked black), immediately ask for AI move
      if (mode === "h2m" && data.turn !== color) {
        await triggerAiMove(data.game_id, aiTimeLimit);
      }
      // If m2m mode, start AI vs AI automatically
      if (mode === "m2m") {
        await triggerAiMove(data.game_id, aiTimeLimit);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleMove = async (source: string, target: string, piece?: string | undefined) => {
    if (!state) return false;
    try {
      const promotionNeeded = piece?.toLowerCase().endsWith("p") && (target.endsWith("8") || target.endsWith("1"));
      const res = await humanMove(state.game_id, {
        from_square: source,
        to_square: target,
        promotion: promotionNeeded ? "q" : null,
      });
      setState(res.state);
      setError(null);
      setSelected(null);
      setLegalTargets([]);
      if (res.state.mode === "h2m" && res.state.status === "in_progress" && res.state.turn !== color) {
        await triggerAiMove(state.game_id, aiTimeLimit);
      }
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const onSquareClick = async (square: string) => {
    if (!state) return;
    const chess = new Chess(state.fen);
    if (selected && legalTargets.includes(square)) {
      const piece = chess.get(selected);
      await handleMove(selected, square, piece ? `${piece.color}${piece.type}` : undefined);
      return;
    }
    const moves = chess.moves({ square, verbose: true });
    if (moves.length === 0) {
      setSelected(null);
      setLegalTargets([]);
      return;
    }
    setSelected(square);
    setLegalTargets(moves.map((m) => m.to));
  };

  const highlightStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    if (selected) {
      styles[selected] = { boxShadow: "inset 0 0 0 3px rgba(78,225,160,0.8)" };
    }
    legalTargets.forEach((sq) => {
      styles[sq] = { boxShadow: "inset 0 0 0 3px rgba(122,162,247,0.8)" };
    });
    return styles;
  }, [selected, legalTargets]);

  const triggerAiMove = async (gameId?: string, timeLimit?: number) => {
    const targetGame = gameId ?? state?.game_id;
    if (!targetGame) return;
    if (isThinking) return; // Prevent concurrent calls
    setIsThinking(true);
    try {
      const res = await aiMove(targetGame, timeLimit);
      setState(res.state);
      setError(null);
      // If m2m mode and game is still in progress, continue with next AI move
      if (res.state.mode === "m2m" && res.state.status === "in_progress") {
        // Use setTimeout to avoid blocking and allow UI to update
        setTimeout(() => {
          triggerAiMove(res.state.game_id, timeLimit);
        }, 100);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsThinking(false);
    }
  };

  const resign = async () => {
    if (!state) return;
    try {
      const res = await resignGame(state.game_id, { player: color });
      setState(res);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="pill mb-2">Play Page</div>
            <h2 className="text-2xl font-semibold text-slate-50">Human vs Human / Human vs AI</h2>
            <p className="text-slate-400 text-sm">Control panel, board, status, and move list.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 card p-4 lg:p-6 flex justify-center">
            <Chessboard
              id="board"
              position={state?.fen || "start"}
              boardOrientation={orientation}
              boardWidth={boardWidth}
              customBoardStyle={{
                borderRadius: "16px",
                boxShadow: "0 10px 50px rgba(0,0,0,0.3)",
              }}
              onPieceDrop={(s, t, piece) => handleMove(s, t, piece)}
              onSquareClick={(sq) => onSquareClick(sq)}
              customSquareStyles={highlightStyles}
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="card p-4 lg:p-5 flex flex-col gap-3">
              <Controls
                mode={mode}
                setMode={setMode}
                aiLevel={aiLevel}
                setAiLevel={setAiLevel}
                whiteEngine={whiteEngine}
                setWhiteEngine={setWhiteEngine}
                blackEngine={blackEngine}
                setBlackEngine={setBlackEngine}
                color={color}
                setColor={setColor}
                onNewGame={newGame}
                onResign={resign}
                onAiMove={() => triggerAiMove(undefined, aiTimeLimit)}
                disableAiMove={isThinking || mode === "h2h"}
                aiTimeLimit={aiTimeLimit}
                setAiTimeLimit={setAiTimeLimit}
              />
              <StatusBar state={state} isThinking={isThinking} error={error} />
              <MoveList moves={state?.move_history || []} />
            </div>

            <div className="card p-4 text-sm text-slate-300">
              <div className="font-semibold mb-1">Quick Tips</div>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>Pick mode and AI level, then start a new game.</li>
                <li>If you choose black in H2M, AI opens automatically.</li>
                <li>Promotion defaults to a queen for now.</li>
                <li>Use AI Move to force engine when it is its turn.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      {showModal && state && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center z-30">
          <div className="card p-6 w-full max-w-md space-y-3">
            <div className="text-sm pill bg-white/15 inline-block">Game Over</div>
            <h3 className="text-xl font-semibold text-slate-100">
              {state.status === "checkmate"
                ? "Checkmate"
                : state.status === "stalemate"
                ? "Stalemate"
                : state.status === "draw"
                ? "Draw"
                : state.status === "resigned"
                ? "Resigned"
                : state.status}
            </h3>
            <div className="text-slate-300 text-sm space-y-1">
              <div>Winner: {state.winner ?? "None"}</div>
              <div>Reason: {state.result_reason ?? "N/A"}</div>
              <div>Moves: {state.move_history.length}</div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 bg-accent text-midnight rounded-lg py-2 font-semibold" onClick={() => setShowModal(false)}>
                Close
              </button>
              <button className="flex-1 bg-white/10 rounded-lg py-2 text-slate-100 hover:bg-white/20" onClick={newGame}>
                New Game
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
