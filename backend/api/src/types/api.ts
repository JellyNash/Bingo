export type GameStatus = 'LOBBY' | 'OPEN' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
export type PlayerStatus = 'ACTIVE' | 'COOLDOWN' | 'DISQUALIFIED' | 'LEFT';
export type BingoPattern =
  | 'ROW_1'
  | 'ROW_2'
  | 'ROW_3'
  | 'ROW_4'
  | 'ROW_5'
  | 'COL_1'
  | 'COL_2'
  | 'COL_3'
  | 'COL_4'
  | 'COL_5'
  | 'DIAGONAL_1'
  | 'DIAGONAL_2'
  | 'FOUR_CORNERS';

export interface ApiGame {
  id: string;
  pin: string;
  name?: string | null;
  status: GameStatus;
  maxPlayers: number;
  allowLateJoin: boolean;
  autoDrawInterval: number;
  autoDrawEnabled: boolean;
  winnerLimit: number;
  currentSequence: number;
  lastDrawAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  pausedAt?: string | null;
  createdAt: string;
  createdBy?: string | null;
}

export interface ApiPlayer {
  id: string;
  gameId: string;
  nickname: string;
  status: PlayerStatus;
  strikes: number;
  isDisqualified: boolean;
  cooldownUntil?: string | null;
  joinedAt: string;
  lastSeenAt: string;
}

export interface ApiBingoCard {
  id: string;
  playerId: string;
  numbers: (number | 'FREE')[][];
  cardSignature: string;
  marks: Record<string, boolean>;
  generatedAt: string;
}

export interface ApiDraw {
  id: string;
  gameId: string;
  sequence: number;
  letter: 'B' | 'I' | 'N' | 'G' | 'O';
  number: number;
  drawnAt: string;
  drawnBy?: string | null;
  drawSignature?: string | null;
}

export type ClaimStatus = 'PENDING' | 'ACCEPTED' | 'DENIED' | 'SUPERSEDED';

export interface ApiClaim {
  id: string;
  gameId: string;
  playerId: string;
  pattern: BingoPattern;
  isValid: boolean | null;
  timestamp: string;
  status: ClaimStatus;
  validatedAt?: string | null;
  validatedBy?: string | null;
  denialReason?: string | null;
  isWinner: boolean;
  winPosition?: number | null;
}

export interface ApiPenalty {
  id: string;
  gameId: string;
  playerId: string;
  type: string;
  reason: string;
  severity: number;
  appliedAt: string;
  expiresAt?: string | null;
  isActive: boolean;
}

export interface GameSnapshot {
  game: ApiGame;
  draws: ApiDraw[];
  players: ApiPlayer[];
  recentClaims: ApiClaim[];
  winners: { player: ApiPlayer; claim: ApiClaim }[];
}
