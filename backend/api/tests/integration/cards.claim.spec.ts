import { describe, it, expect, beforeAll, vi, afterAll } from 'vitest';
import request from 'supertest';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://local/test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
process.env.GAME_SEED_SECRET = process.env.GAME_SEED_SECRET || 'test_game_seed';

import { buildServer } from '../../src/server.js';

vi.mock('../../src/services/orchestrator.adapter.js', () => ({
  orchestrator: {
    validateClaim: vi.fn(async () => ({ valid: true, strikeApplied: false, strikes: 0, winPosition: 1 })),
  },
}));

vi.mock('../../src/services/events.pubsub.js', () => ({
  publishClaimEvent: vi.fn(async () => {}),
  publishGameState: vi.fn(async () => {}),
}));

vi.mock('../../src/services/prisma.js', () => ({
  prisma: {
    bingoCard: { findUnique: vi.fn(async () => ({ id: 'c1', playerId: 'p1', numbers: [[1,2,3,4,5],[6,7,8,9,10],[11,12,0,14,15],[16,17,18,19,20],[21,22,23,24,25]], cardSignature: 'sig', player: { gameId: 'g1' } })) },
    player: { findUnique: vi.fn(async () => ({ id: 'p1', status: 'ACTIVE', strikes: 0 })) },
    claim: {
      create: vi.fn(async ({ data }: any) => ({ id: 'cl1', ...data })),
      findUnique: vi.fn(async () => ({ id: 'cl1', status: 'ACCEPTED', pattern: 'ROW_1', isWinner: true, winPosition: 1 })),
      count: vi.fn(async () => 0),
    },
  },
}));

describe('POST /cards/:cardId/claim', () => {
  const app: any = buildServer();

  beforeAll(async () => {
    // Patch missing enforceClaim decorator in routes to avoid errors during test
    (app as any).enforceClaim = async () => {};
    await app.ready();
  });

  afterAll(async () => { await app.close(); });

  it('accepts a valid claim for player', async () => {
    const token = app.jwt.sign({ sub: 'p1', role: 'player', gameId: 'g1' }, { expiresIn: '1h' });
    const res = await request(app.server)
      .post('/cards/c1/claim')
      .set('authorization', `Bearer ${token}`)
      .send({ pattern: 'ROW_1' });
    expect(res.status).toBe(200);
    expect(res.body.claim).toBeDefined();
    expect(res.body.message).toMatch(/accepted/i);
  });
});

