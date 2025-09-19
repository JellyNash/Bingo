import fastify from 'fastify';
import jwt from '@fastify/jwt';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import joinRoute from '../../src/routes/join.js';

const gameFindUnique = vi.fn();

vi.mock('../../src/services/prisma.js', () => ({
  prisma: {
    game: { findUnique: gameFindUnique },
    player: {},
    bingoCard: {},
    claim: {},
    session: {},
  },
}));

vi.mock('../../src/services/orchestrator.adapter.js', () => ({
  orchestrator: {
    generateCard: vi.fn(),
    drawNextNumber: vi.fn(),
    validateClaim: vi.fn(),
  },
}));

vi.mock('../../src/services/idempotency.js', () => ({
  getIdempotentResponse: vi.fn().mockResolvedValue(null),
  saveIdempotentResponse: vi.fn(),
}));

vi.mock('../../src/services/events.pubsub.js', () => ({
  publishGameState: vi.fn(),
}));

describe('join route', () => {
  beforeEach(() => {
    gameFindUnique.mockReset();
  });

  it('returns 404 when game not found', async () => {
    gameFindUnique.mockResolvedValue(null);
    const app = fastify();
    await app.register(jwt, { secret: 'test' });
    app.decorate('authenticate', async () => {});
    app.decorate('authorize', () => async () => {});
    app.decorate('rateLimit', {
      enforceJoin: async () => {},
      enforceClaim: async () => {},
    });
    app.decorate('metrics', {
      registry: { contentType: 'text/plain', metrics: async () => '' },
      requestCounter: { inc: () => {} },
      requestDuration: { observe: () => {} },
      claimValidationDuration: { observe: () => {} },
    });
    await app.register(joinRoute);

    const response = await app.inject({
      method: 'POST',
      url: '/games/123456/join',
      payload: { nickname: 'Tester' },
    });

    expect(response.statusCode).toBe(404);
    await app.close();
  });
});
