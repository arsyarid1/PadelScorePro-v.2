
export type GameType = 'Americano' | 'Mexicano' | 'Mexicano Mix' | 'Americano Mix' | 'Americano Fix' | 'Mexicano Fix' | 'Club Americano' | 'Club Mexicano' | 'Club Fix Americano';
export type ScoringFormat = 'Tournament Pro' | 'Custom Match' | 'Rally Points' | 'Tennis Classic';
export type CustomMatchType = 'Race to' | 'Best of' | 'Tournament Pro';
export type ViewState = 'dashboard' | 'setup' | 'leaderboard' | 'live' | 'shortcode' | 'superadmin';
export type Gender = 'male' | 'female';
export type TennisRule = 'Advantage' | 'Golden Point';

export interface Club {
  id: string;
  name: string;
}

export interface MatchHistoryEntry {
  matchId: string;
  opponent: string;
  score_us: number;
  score_them: number;
  result: 'Win' | 'Lose';
  type: ScoringFormat;
  date: string;
}

export interface Player {
  id: string;
  name: string;
  gender: Gender;
  seed: number;
  points: number;
  wins: number;
  matchesPlayed: number;
  winRate: number;
  avatarUrl: string;
  location: string;
  clubId?: string;
  matchHistory?: MatchHistoryEntry[];
}

export interface Team {
  playerIds: string[];
  score: any; // Current points (0, 15, 30, 40, Ad)
  games: number; // Games won in current set
  sets: number; // Sets won in match
}

export interface Match {
  id: string;
  teamA: Team;
  teamB: Team;
  winner?: 'A' | 'B';
  status: 'pending' | 'live' | 'finished';
  court: number;
  round: number;
  isTieBreak?: boolean;
  server?: 'A' | 'B';
}

export interface Tournament {
  id: string;
  shortcode?: string; // For spectator access
  name: string;
  type: GameType;
  scoring: ScoringFormat;
  customMatchType?: CustomMatchType;
  tennisRule?: TennisRule;
  maxPoints: number;
  courts: number;
  players: Player[];
  clubs?: Club[];
  matches: Match[];
  currentMatchId?: string;
  status: 'setup' | 'active' | 'finished';
  createdAt: string;
  isCloud?: boolean; // Flag for tournament mode
  role?: 'admin' | 'spectator';
}

export interface RefereeSession {
  courtId: number;
  refereeName: string;
  deviceId: string;
  browserInfo: string;
  lastActive: number;
}

export interface MatchState {
  teamA: {
    players: string[];
    score: any;
    games: number;
    sets: number;
    totalGames: number;
  };
  teamB: {
    players: string[];
    score: any;
    games: number;
    sets: number;
    totalGames: number;
  };
  server: 'A' | 'B';
  time: number;
  isTieBreak: boolean;
}
