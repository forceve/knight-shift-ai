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
};

export type MatchDetail = MatchSummary & { move_history: string[]; final_fen: string };

export type BatchTestResults = { white: number; black: number; draw: number };

export type BatchTestSummary = {
  test_id: string;
  status: string;
  white_engine: AILevel;
  black_engine: AILevel;
  games: number;
  completed: number;
  results: BatchTestResults;
  matches: string[];
  swap_colors: boolean;
  max_moves: number;
  created_at: string;
};

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
