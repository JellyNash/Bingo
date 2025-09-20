import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayerStore } from './store';

describe('PlayerStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    usePlayerStore.setState({
      auth: {
        sessionToken: '',
        resumeToken: '',
        gameId: '',
        cardId: '',
        playerId: '',
        nickname: '',
      },
      card: {
        grid: [],
        marks: 0,
      },
      drawn: {
        drawnNumbers: [],
        drawnSet: new Set([0]),
        lastDrawn: 0,
      },
      winners: [],
      status: {
        gameStatus: 'LOBBY',
      },
      connection: {
        online: true,
        reconnecting: false,
        reconnectAttempts: 0,
      },
    });

    // Clear localStorage
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('auth management', () => {
    it('should update auth state', () => {
      const authData = {
        sessionToken: 'session123',
        gameId: 'game456',
        nickname: 'TestPlayer',
      };

      usePlayerStore.getState().setAuth(authData);

      const state = usePlayerStore.getState();
      expect(state.auth.sessionToken).toBe('session123');
      expect(state.auth.gameId).toBe('game456');
      expect(state.auth.nickname).toBe('TestPlayer');
    });

    it('should clear session', () => {
      // Set initial auth state
      usePlayerStore.setState({
        auth: {
          sessionToken: 'token123',
          resumeToken: 'resume123',
          gameId: 'game123',
          cardId: 'card123',
          playerId: 'player123',
          nickname: 'TestPlayer',
        },
      });

      localStorage.setItem('resumeToken', 'resume123');
      sessionStorage.setItem('sessionToken', 'token123');

      usePlayerStore.getState().clearSession();

      const state = usePlayerStore.getState();
      expect(state.auth.sessionToken).toBe('');
      expect(state.auth.resumeToken).toBe('');
      expect(localStorage.getItem('resumeToken')).toBeNull();
      expect(sessionStorage.getItem('sessionToken')).toBeNull();
    });
  });

  describe('card management', () => {
    it('should set card grid and initialize marks with FREE space', () => {
      const grid = [
        [1, 16, 31, 46, 61],
        [2, 17, 32, 47, 62],
        [3, 18, 0, 48, 63], // FREE space at position 12
        [4, 19, 33, 49, 64],
        [5, 20, 34, 50, 65],
      ];

      usePlayerStore.getState().setCard(grid);

      const state = usePlayerStore.getState();
      expect(state.card.grid).toEqual(grid);
      expect(state.card.marks).toBe(0b1000000000000); // Position 12 marked
    });
  });

  describe('event handlers', () => {
    it('should handle draw:next event', () => {
      usePlayerStore.getState().handleDrawNext({
        number: 42,
        index: 5,
        timestamp: Date.now(),
      });

      const state = usePlayerStore.getState();
      expect(state.drawn.drawnNumbers).toContain(42);
      expect(state.drawn.drawnSet.has(42)).toBe(true);
      expect(state.drawn.lastDrawn).toBe(42);
    });

    it('should handle state:update event', () => {
      usePlayerStore.getState().handleStateUpdate({
        gameStatus: 'ACTIVE',
        drawnNumbers: [1, 2, 3],
        winners: [{ playerId: 'p1', nickname: 'Winner', rank: 1, pattern: 'H1' }],
      });

      const state = usePlayerStore.getState();
      expect(state.status.gameStatus).toBe('ACTIVE');
      expect(state.drawn.drawnSet.has(1)).toBe(true);
      expect(state.drawn.drawnSet.has(2)).toBe(true);
      expect(state.winners).toHaveLength(1);
    });

    it('should handle claim:result event for valid claim', () => {
      usePlayerStore.setState({
        auth: { playerId: 'player123', nickname: 'TestPlayer' },
      });

      usePlayerStore.getState().handleClaimResult({
        playerId: 'player123',
        valid: true,
        rank: 2,
        pattern: 'V3',
      });

      const state = usePlayerStore.getState();
      expect(state.winners).toContainEqual({
        playerId: 'player123',
        nickname: 'TestPlayer',
        rank: 2,
        pattern: 'V3',
      });
    });

    it('should handle player:penalty event', () => {
      usePlayerStore.setState({
        auth: { playerId: 'player123' },
        status: { strikes: 0 },
      });

      usePlayerStore.getState().handlePlayerPenalty({
        playerId: 'player123',
        reason: 'INVALID_CLAIM',
        strikes: 1,
        cooldownMs: 5000,
      });

      const state = usePlayerStore.getState();
      expect(state.status.strikes).toBe(1);
      expect(state.status.cooldownEndTime).toBeGreaterThan(Date.now());
    });
  });

  describe('connection management', () => {
    it('should update connection state', () => {
      usePlayerStore.getState().setConnection(false, true, 3);

      const state = usePlayerStore.getState();
      expect(state.connection.online).toBe(false);
      expect(state.connection.reconnecting).toBe(true);
      expect(state.connection.reconnectAttempts).toBe(3);
    });
  });
});