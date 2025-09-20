import { create } from 'zustand';
import { api } from './api';
import { socketClient } from './socket';
import type { DrawNextEvent, StateUpdateEvent, ClaimResultEvent, PlayerPenaltyEvent } from './socket';

interface AuthState {
  resumeToken?: string;
  sessionToken?: string;
  playerId?: string;
  gameId?: string;
  cardId?: string;
  nickname?: string;
}

interface CardState {
  grid: number[][];
  marks: Record<number, boolean>;
}

interface DrawState {
  lastSeq: number;
  drawnSet: Set<number>;
}

interface Winner {
  playerId: string;
  nickname: string;
  rank: number;
  pattern: string;
}

interface StatusState {
  gameStatus: 'LOBBY' | 'OPEN' | 'ACTIVE' | 'PAUSED' | 'ENDED';
  cooldownMs?: number;
  strikes?: number;
  cooldownEndTime?: number;
}

interface ConnectionState {
  online: boolean;
  reconnecting: boolean;
  reconnectAttempts?: number;
}

interface PlayerStore {
  // State
  auth: AuthState;
  card: CardState;
  drawn: DrawState;
  winners: Winner[];
  status: StatusState;
  connection: ConnectionState;

  // Actions
  setAuth: (auth: Partial<AuthState>) => void;
  setCard: (grid: number[][]) => void;
  toggleMark: (position: number) => Promise<void>;
  submitClaim: (pattern: string) => Promise<void>;
  hydrateFromSnapshot: (snapshot: any) => void;

  // Socket event handlers
  handleDrawNext: (data: DrawNextEvent) => void;
  handleStateUpdate: (data: StateUpdateEvent) => void;
  handleClaimResult: (data: ClaimResultEvent) => void;
  handlePlayerPenalty: (data: PlayerPenaltyEvent) => void;

  // Connection management
  setConnection: (online: boolean, reconnecting?: boolean, reconnectAttempts?: number) => void;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;

  // Auth flow
  join: (pin: string, nickname: string) => Promise<boolean>;
  resume: () => Promise<boolean>;
  clearSession: () => void;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  // Initial state
  auth: {},
  card: {
    grid: Array(5).fill(null).map(() => Array(5).fill(0)),
    marks: { 12: true }, // FREE center always marked
  },
  drawn: {
    lastSeq: 0,
    drawnSet: new Set([0]), // Include FREE
  },
  winners: [],
  status: {
    gameStatus: 'LOBBY',
  },
  connection: {
    online: navigator.onLine,
    reconnecting: false,
    reconnectAttempts: 0,
  },

  // Auth management
  setAuth: (auth) =>
    set((state) => ({
      auth: { ...state.auth, ...auth },
    })),

  // Card management
  setCard: (grid) =>
    set((state) => ({
      card: {
        ...state.card,
        grid,
        marks: { 12: true }, // Reset marks, keep FREE
      },
    })),

  toggleMark: async (position) => {
    const state = get();
    const { cardId } = state.auth;
    const { grid, marks } = state.card;
    const { drawnSet } = state.drawn;

    if (!cardId) return;

    // Get number at position
    const row = Math.floor(position / 5);
    const col = position % 5;
    const number = grid[row][col];

    // Only allow marking if number is drawn or FREE
    if (position !== 12 && !drawnSet.has(number)) {
      // Reject with visual feedback
      return;
    }

    // Optimistic update
    const newMarked = !marks[position];
    set((state) => ({
      card: {
        ...state.card,
        marks: {
          ...state.card.marks,
          [position]: newMarked,
        },
      },
    }));

    try {
      await api.markCell(cardId, position, newMarked);
    } catch (error) {
      // Revert on error
      set((state) => ({
        card: {
          ...state.card,
          marks: {
            ...state.card.marks,
            [position]: !newMarked,
          },
        },
      }));
      throw error;
    }
  },

  submitClaim: async (pattern) => {
    const { cardId } = get().auth;
    if (!cardId) throw new Error('No card ID');

    try {
      await api.submitClaim(cardId, pattern);
    } catch (error) {
      console.error('Claim failed:', error);
      throw error;
    }
  },

  hydrateFromSnapshot: (snapshot) => {
    set((state) => ({
      drawn: {
        lastSeq: snapshot.lastDrawSeq || 0,
        drawnSet: new Set([0, ...(snapshot.drawnNumbers || [])]),
      },
      winners: snapshot.winners || [],
      status: {
        ...state.status,
        gameStatus: snapshot.gameStatus || 'LOBBY',
      },
      card: snapshot.card ? {
        grid: snapshot.card.grid || state.card.grid,
        marks: snapshot.card.marks || { 12: true },
      } : state.card,
    }));
  },

  // Socket event handlers
  handleDrawNext: (data) => {
    set((state) => ({
      drawn: {
        lastSeq: data.seq,
        drawnSet: new Set([...state.drawn.drawnSet, data.value]),
      },
    }));
  },

  handleStateUpdate: (data) => {
    set((state) => ({
      drawn: {
        ...state.drawn,
        drawnSet: new Set([0, ...(data.drawnNumbers || [])]),
      },
      winners: data.winners || [],
      status: {
        ...state.status,
        gameStatus: (data.status as any) || 'LOBBY',
      },
    }));
  },

  handleClaimResult: (data) => {
    const { playerId } = get().auth;

    if (data.playerId === playerId && data.penalty) {
      // Apply penalty
      set((state) => ({
        status: {
          ...state.status,
          strikes: data.penalty.strikes,
          cooldownMs: data.penalty.cooldownMs,
          cooldownEndTime: data.penalty.cooldownMs
            ? Date.now() + data.penalty.cooldownMs
            : undefined,
        },
      }));
    }

    // Update winners if approved
    if (data.result === 'approved' && data.rank) {
      set((state) => ({
        winners: [
          ...state.winners,
          {
            playerId: data.playerId,
            nickname: data.nickname,
            rank: data.rank,
            pattern: data.pattern || '',
          },
        ],
      }));
    }
  },

  handlePlayerPenalty: (data) => {
    set((state) => ({
      status: {
        ...state.status,
        strikes: data.strikes,
        cooldownMs: data.cooldownMs,
        cooldownEndTime: Date.now() + data.cooldownMs,
      },
    }));
  },

  // Connection management
  setConnection: (online, reconnecting = false, reconnectAttempts = 0) =>
    set({ connection: { online, reconnecting, reconnectAttempts } }),

  connect: () => {
    const { sessionToken } = get().auth;
    if (!sessionToken) return;

    const socket = socketClient.connect(sessionToken);

    socket.on('connect', () => {
      get().setConnection(true, false);
    });

    socket.on('disconnect', () => {
      get().setConnection(false, false);
    });

    socket.io.on('reconnect_attempt', (attemptNumber) => {
      get().setConnection(false, true, attemptNumber);
    });

    socket.io.on('reconnect', async () => {
      get().setConnection(true, false, 0);
      // Fetch snapshot to close gaps
      const { gameId } = get().auth;
      if (gameId) {
        try {
          const snapshot = await api.getSnapshot(gameId);
          get().hydrateFromSnapshot(snapshot);
        } catch (error) {
          console.error('Failed to fetch snapshot on reconnect:', error);
        }
      }
    });

    // Event handlers
    socket.on('draw:next', get().handleDrawNext);
    socket.on('state:update', get().handleStateUpdate);
    socket.on('claim:result', get().handleClaimResult);
    socket.on('player:penalty', get().handlePlayerPenalty);
  },

  disconnect: () => {
    socketClient.disconnect();
    set({ connection: { online: false, reconnecting: false, reconnectAttempts: 0 } });
  },

  reconnect: () => {
    const state = get();
    if (!state.connection.online && !state.connection.reconnecting) {
      set({ connection: { online: false, reconnecting: true, reconnectAttempts: 0 } });
      socketClient.connect();
    }
  },

  // Auth flow
  join: async (pin, nickname) => {
    try {
      const response = await api.join(pin, nickname);

      // Store tokens
      if (response.resumeToken) {
        localStorage.setItem('resumeToken', response.resumeToken);
      }
      if (response.sessionToken) {
        sessionStorage.setItem('sessionToken', response.sessionToken);
      }

      // Update API auth
      api.setAuth({
        sessionToken: response.sessionToken,
        resumeToken: response.resumeToken,
      });

      // Update store
      set({
        auth: {
          sessionToken: response.sessionToken,
          resumeToken: response.resumeToken,
          playerId: response.player?.id,
          gameId: response.game?.id,
          cardId: response.card?.id,
          nickname: response.player?.nickname || nickname,
        },
        card: {
          grid: response.card?.grid || get().card.grid,
          marks: response.card?.marks || { 12: true },
        },
      });

      // Save to localStorage for resume
      localStorage.setItem('lastGameId', response.game?.id || '');

      // Connect socket
      if (response.sessionToken) {
        get().connect();
      }

      return true;
    } catch (error) {
      console.error('Join failed:', error);
      return false;
    }
  },

  resume: async () => {
    const resumeToken = localStorage.getItem('resumeToken');
    if (!resumeToken) return false;

    try {
      const response = await api.resume(resumeToken);
      if (!response) return false;

      // Update tokens
      if (response.sessionToken) {
        sessionStorage.setItem('sessionToken', response.sessionToken);
      }

      // Update API auth
      api.setAuth({
        sessionToken: response.sessionToken,
        resumeToken: resumeToken,
      });

      // Update store
      set({
        auth: {
          sessionToken: response.sessionToken,
          resumeToken: resumeToken,
          playerId: response.player?.id,
          gameId: response.game?.id,
          cardId: response.card?.id,
          nickname: response.player?.nickname,
        },
        card: {
          grid: response.card?.grid || get().card.grid,
          marks: response.card?.marks || { 12: true },
        },
      });

      // Hydrate from snapshot data
      get().hydrateFromSnapshot(response);

      // Connect socket
      if (response.sessionToken) {
        get().connect();
      }

      return true;
    } catch (error) {
      console.error('Resume failed:', error);
      return false;
    }
  },

  clearSession: () => {
    localStorage.removeItem('resumeToken');
    localStorage.removeItem('lastGameId');
    sessionStorage.removeItem('sessionToken');
    socketClient.disconnect();

    set({
      auth: {},
      card: {
        grid: Array(5).fill(null).map(() => Array(5).fill(0)),
        marks: { 12: true },
      },
      drawn: {
        lastSeq: 0,
        drawnSet: new Set([0]),
      },
      winners: [],
      status: {
        gameStatus: 'LOBBY',
      },
    });
  },
}));