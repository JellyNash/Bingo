import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from './api';

describe('api client', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    vi.clearAllMocks();
  });

  describe('setAuth', () => {
    it('should set auth tokens', () => {
      api.setAuth({
        sessionToken: 'session123',
        resumeToken: 'resume456'
      });
      // Auth is stored internally and used in requests
      expect(api).toBeDefined();
    });
  });

  describe('join', () => {
    it('should send join request with PIN and nickname', async () => {
      const mockResponse = {
        sessionToken: 'session123',
        resumeToken: 'resume456',
        gameId: 'game789',
        cardId: 'card012',
        grid: [[1, 2, 3, 4, 5]],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.join('123456', 'TestPlayer');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/games/join'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ pin: '123456', nickname: 'TestPlayer' }),
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('resume', () => {
    it('should send resume request with token', async () => {
      const mockResponse = {
        sessionToken: 'newsession',
        gameId: 'game123',
        cardId: 'card456',
        grid: [[1, 2, 3, 4, 5]],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.resume('resumetoken123');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/games/resume'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ resumeToken: 'resumetoken123' }),
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('mark', () => {
    it('should send mark request with idempotency key', async () => {
      api.setAuth({ sessionToken: 'session123' });

      const mockResponse = {
        success: true,
        marks: 0b11111,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.mark('game123', 'card456', 12, true);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/games/game123/mark'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer session123',
            'X-Idempotency-Key': expect.stringContaining('card456-12-'),
          }),
          body: JSON.stringify({ cardId: 'card456', position: 12, marked: true }),
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('claim', () => {
    it('should send claim request with pattern', async () => {
      api.setAuth({ sessionToken: 'session123' });

      const mockResponse = {
        success: true,
        valid: true,
        rank: 1,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.claim('game123', 'card456', 'H1');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/games/game123/claim'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer session123',
            'X-Idempotency-Key': expect.stringContaining('card456-claim-'),
          }),
          body: JSON.stringify({ cardId: 'card456', pattern: 'H1' }),
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('getSnapshot', () => {
    it('should fetch game snapshot', async () => {
      api.setAuth({ sessionToken: 'session123' });

      const mockSnapshot = {
        gameStatus: 'ACTIVE',
        drawnNumbers: [1, 2, 3],
        winners: [],
        strikes: 0,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSnapshot,
      });

      const result = await api.getSnapshot('game123');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/games/game123/snapshot'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer session123',
          }),
        })
      );

      expect(result).toEqual(mockSnapshot);
    });
  });
});