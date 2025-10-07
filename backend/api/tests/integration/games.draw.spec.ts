import { describe, it, expect, beforeAll, vi, afterAll } from 'vitest';
import request from 'supertest';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://local/test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
process.env.GAME_SEED_SECRET = process.env.GAME_SEED_SECRET || 'test_game_seed';

import { buildServer } from '../../src/server.js';

vi.mock('../../src/services/orchestrator.adapter.js', () => ({
  orchestrator: {
    drawNextNumber: vi.fn(async () => ({ id: 'd1' })),
  },
}));

vi.mock('../../src/services/prisma.js', () => ({
  prisma: {
    draw: { findUnique: vi.fn(async () => ({ id: 'd1', sequence: 1, letter: 'B', number: 7, drawnAt: new Date(), drawSignature: 'sig' })) },
  },
}));

describe('POST /games/:id/draw', () => {
  const app = buildServer();

  beforeAll(async () => { await app.ready(); });
  afterAll(async () => { await app.close(); });

  it('allows host to draw next number', async () => {
    // Sign a host token bound to game
    const token = app.jwt.sign({ sub: 'host1', role: 'host', gameId: 'g1' }, { expiresIn: '1h' });
    const res = await request(app.server)
      .post('/games/g1/draw')
      .set('authorization', `Bearer ${token}`)
      .send();
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ sequence: 1, number: 7 });
  });
});

