import fastify from 'fastify';
import jwt from '@fastify/jwt';
import { describe, it, expect, vi } from 'vitest';
import drawRoute from '../../src/routes/games.draw.js';

const orchestratorMock = {
  drawNextNumber: vi.fn(),
};

vi.mock('../../src/services/orchestrator.adapter.js', () => ({ orchestrator: orchestratorMock }));
vi.mock('../../src/services/prisma.js', () => ({ prisma: { draw: { findUnique: vi.fn() } } }));
vi.mock('../../src/services/events.pubsub.js', () => ({ publishGameState: vi.fn() }));

describe('draw route', () => {
  it('returns 404 when orchestrator throws game not found', async () => {
    orchestratorMock.drawNextNumber.mockRejectedValue(new Error('Game not found'));
    const app = fastify();
    await app.register(jwt, { secret: 'test' });
    app.decorate('authenticate', async (req) => {
      req.user = { sub: 'gm1', role: 'gamemaster' } as any;
    });
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
    await app.register(drawRoute);

    const token = app.jwt.sign({ sub: 'gm1', role: 'gamemaster' });
    const response = await app.inject({
      method: 'POST',
      url: '/games/game1/draw',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(404);
    await app.close();
  });
});
