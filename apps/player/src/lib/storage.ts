// Storage helpers for persistent data

const STORAGE_KEYS = {
  RESUME_TOKEN: 'resumeToken',
  LAST_GAME_ID: 'lastGameId',
  LAST_CARD_SNAPSHOT: 'lastCardSnapshot',
  SESSION_TOKEN: 'sessionToken',
} as const;

export interface CardSnapshot {
  grid: number[][];
  marks: Record<number, boolean>;
  timestamp: number;
}

export const storage = {
  // Resume token (persistent)
  getResumeToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.RESUME_TOKEN);
  },

  setResumeToken(token: string): void {
    localStorage.setItem(STORAGE_KEYS.RESUME_TOKEN, token);
  },

  clearResumeToken(): void {
    localStorage.removeItem(STORAGE_KEYS.RESUME_TOKEN);
  },

  // Session token (session only)
  getSessionToken(): string | null {
    return sessionStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
  },

  setSessionToken(token: string): void {
    sessionStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, token);
  },

  clearSessionToken(): void {
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_TOKEN);
  },

  // Game ID
  getLastGameId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.LAST_GAME_ID);
  },

  setLastGameId(gameId: string): void {
    localStorage.setItem(STORAGE_KEYS.LAST_GAME_ID, gameId);
  },

  // Card snapshot
  getCardSnapshot(): CardSnapshot | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LAST_CARD_SNAPSHOT);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setCardSnapshot(grid: number[][], marks: Record<number, boolean>): void {
    const snapshot: CardSnapshot = {
      grid,
      marks,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEYS.LAST_CARD_SNAPSHOT, JSON.stringify(snapshot));
  },

  // Clear all
  clearAll(): void {
    this.clearResumeToken();
    this.clearSessionToken();
    localStorage.removeItem(STORAGE_KEYS.LAST_GAME_ID);
    localStorage.removeItem(STORAGE_KEYS.LAST_CARD_SNAPSHOT);
  },
};