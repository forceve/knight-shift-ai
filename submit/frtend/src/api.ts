import { AILevel, BatchTestSummary, GameMode, GameState, MatchDetail, MatchSummary, MoveResponse, PlayerColor, PagedMatches, PagedTests } from "./types";

// Auto-detect API base URL based on current hostname
function getApiBase(): string {
  // If explicitly set via env var, use it
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }
  
  // Auto-detect based on current hostname
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    // If accessed via frp-gym.com, use frp-gym.com:57367 for backend (match page protocol to avoid mixed content)
    if (hostname === "frp-gym.com" || hostname.includes("frp-gym.com")) {
      const proto = window.location.protocol === "https:" ? "https" : "http";
      return `${proto}://frp-gym.com:57367`;
    }
    
    // If accessed via frp-lab.com, use frp-lab.com with same port pattern (match page protocol)
    if (hostname === "frp-lab.com" || hostname.includes("frp-lab.com")) {
      const proto = window.location.protocol === "https:" ? "https" : "http";
      // Assuming similar port pattern, adjust if needed
      return `${proto}://frp-lab.com:${port}`;
    }
    
    // Default to localhost for local access
    return "http://localhost:6789";
  }
  
  // Fallback for SSR
  return "http://localhost:6789";
}

const API_BASE = getApiBase();

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Request failed");
  }
  return res.json();
}

export function createGame(payload: { mode: GameMode; ai_level?: AILevel | null; player_color?: PlayerColor; start_fen?: string | null }) {
  return api<GameState>("/games", { method: "POST", body: JSON.stringify(payload) });
}

export function humanMove(gameId: string, payload: { from_square: string; to_square: string; promotion?: string | null }) {
  return api<MoveResponse>(`/games/${gameId}/move`, { method: "POST", body: JSON.stringify(payload) });
}

export function aiMove(gameId: string, timeLimit?: number) {
  const suffix = timeLimit ? `?time_limit=${timeLimit}` : "";
  return api<MoveResponse>(`/games/${gameId}/ai-move${suffix}`, { method: "POST" });
}

export function resignGame(gameId: string, payload: { player: PlayerColor }) {
  return api<GameState>(`/games/${gameId}/resign`, { method: "POST", body: JSON.stringify(payload) });
}

export function listMatches(page = 1, pageSize = 100) {
  return api<PagedMatches>(`/m2m/matches?page=${page}&page_size=${pageSize}`);
}

export function runMatch(payload: { white_engine: AILevel; black_engine: AILevel; max_moves?: number; start_fen?: string | null; time_limit_white?: number | null; time_limit_black?: number | null }) {
  return api<MatchDetail>("/m2m/match", { method: "POST", body: JSON.stringify(payload) });
}

export function getMatch(matchId: string) {
  return api<MatchDetail>(`/m2m/matches/${matchId}`);
}

export function runBatch(payload: { white_engine: AILevel; black_engine: AILevel; games: number; swap_colors: boolean; max_moves?: number; start_fen?: string | null; time_limit_white?: number | null; time_limit_black?: number | null }) {
  return api<BatchTestSummary>("/m2m/batch", { method: "POST", body: JSON.stringify(payload) });
}

export function listTests(page = 1, pageSize = 100) {
  return api<PagedTests>(`/m2m/tests?page=${page}&page_size=${pageSize}`);
}

export function getTest(testId: string) {
  return api<BatchTestSummary>(`/m2m/tests/${testId}`);
}

export function getAiLevels() {
  return api<{ levels: AILevel[] }>("/ai-levels");
}

export function runTimeBenchmark(payload: { white_engine: AILevel; black_engine: AILevel; time_limits: number[]; games_per_limit: number; swap_colors: boolean; max_moves?: number; start_fen?: string | null }) {
  return api<BatchTestSummary>("/m2m/time-benchmark", { method: "POST", body: JSON.stringify(payload) });
}

export { API_BASE };
