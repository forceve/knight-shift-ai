export type GameMode = "h2h" | "h2m" | "m2m";
export type AILevel = string; // Dynamic type - values come from backend
export type PlayerColor = "white" | "black";

export type GameState = {
  game_id: string;
  mode: GameMode;
  ai_level?: AILevel | null;
  player_color?: PlayerColor | null;
  fen: string;
  turn: PlayerColor;
  status: string;
  winner?: PlayerColor | null;
  result_reason?: string | null;
  last_move?: string | null;
  move_history: string[];
  in_check: boolean;
  avg_rollouts_per_move?: number | null; // Average rollouts per move (for MCTS engines debugging)
};

export type MoveResponse = {
  state: GameState;
  ai_move?: string | null;
};

export type MatchSummary = {
  match_id: string;
  status: string;
  winner?: PlayerColor | null;
  result_reason?: string | null;
  white_engine: AILevel;
  black_engine: AILevel;
  moves: number;
  created_at: string;
  time_limit_white?: number | null;
  time_limit_black?: number | null;
};

export type MatchDetail = MatchSummary & { move_history: string[]; final_fen: string };

export type BatchTestResults = { white: number; black: number; draw: number };

export type TestKind = "batch" | "time_scaled";

export type HistoryEntry = {
  id: string;
  kind: "game" | "m2m";
  mode?: GameMode | null;
  ai_level?: AILevel | null;
  player_color?: PlayerColor | null;
  white_engine?: AILevel | null;
  black_engine?: AILevel | null;
  winner?: PlayerColor | null;
  result_reason?: string | null;
  moves: number;
  created_at: string;
};

export type BenchmarkRow = {
  time_limit: number;
  results: BatchTestResults;
  games: number;
  avg_moves: number;
  white_win_rate: number;
  black_win_rate: number;
  draw_rate: number;
};

export type BatchTestSummary = {
  test_id: string;
  kind: TestKind;
  status: string;
  white_engine: AILevel;
  black_engine: AILevel;
  games: number;
  total_games: number;
  completed: number;
  results: BatchTestResults;
  matches: string[];
  swap_colors: boolean;
  max_moves: number;
  time_limit_white?: number | null;
  time_limit_black?: number | null;
  created_at: string;
  time_limits?: number[] | null;
  games_per_limit?: number | null;
  rows?: BenchmarkRow[] | null;
  image_base64?: string | null;
};

export type PagedMatches = {
  items: MatchSummary[];
  page: number;
  page_size: number;
  total: number;
};

export type PagedTests = {
  items: BatchTestSummary[];
  page: number;
  page_size: number;
  total: number;
};
