import fastify from 'fastify';
import jwt from '@fastify/jwt';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import claimRoute from '../../src/routes/cards.claim.js';

const prismaMock = {
  player: {
    findUnique: vi.fn(),
  },
  bingoCard: {
    findUnique: vi.fn(),
  },
  claim: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  draw: {
    findMany: vi.fn(),
  },
};

vi.mock('../../src/services/prisma.js', () => ({ prisma: prismaMock }));

vi.mock('../../src/services/orchestrator.adapter.js', () => ({
  orchestrator: {
    validateClaim: vi.fn().mockResolvedValue({ valid: false, strikeApplied: true, strikes: 3, cooldownMs: 30000 }),
  },
}));

vi.mock('../../src/services/idempotency.js', () => ({
  getIdempotentResponse: vi.fn().mockResolvedValue(null),
  saveIdempotentResponse: vi.fn(),
}));

vi.mock('../../src/services/events.pubsub.js', () => ({
  publishGameState: vi.fn(),
}));

describe('claim route', () => {
  beforeEach(() => {
    prismaMock.player.findUnique.mockReset();
    prismaMock.bingoCard.findUnique.mockReset();
    prismaMock.claim.create.mockReset();
    prismaMock.claim.findUnique.mockReset();
  });

  it('rejects claim when player in cooldown', async () => {
    const player = {
      id: 'player1',
      status: 'COOLDOWN',
      cooldownUntil: new Date(Date.now() + 10000),
    };
    prismaMock.player.findUnique.mockResolvedValue(player as any);

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
    await app.register(claimRoute);

    const token = app.jwt.sign({ sub: 'player1', role: 'player', gameId: 'game1' });

    const response = await app.inject({
      method: 'POST',
      url: '/games/game1/players/player1/claim',
      headers: { authorization: `Bearer ${token}` },
      payload: { pattern: 'ROW_1' },
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });
});
