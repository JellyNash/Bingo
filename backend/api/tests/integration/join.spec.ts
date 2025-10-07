import { describe, it, expect, beforeAll, vi, afterAll } from 'vitest';
import request from 'supertest';

// Ensure required env vars for config.ts
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://local/test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
process.env.GAME_SEED_SECRET = process.env.GAME_SEED_SECRET || 'test_game_seed';

import { buildServer } from '../../src/server.js';

// Mocks
vi.mock('../../src/services/orchestrator.adapter.js', () => ({
  orchestrator: {
    generateCard: vi.fn(async () => ({ cardId: 'card1' })),
  },
}));

vi.mock('../../src/services/events.pubsub.js', () => ({
  publishPlayerJoin: vi.fn(async () => {}),
  publishGameState: vi.fn(async () => {}),
}));

vi.mock('../../src/services/prisma.js', async () => {
  const players: any[] = [];
  return {
    prisma: {
      game: { findUnique: vi.fn(async ({ where: { pin } }: any) => (pin === '123456' ? ({
        id: 'g1', pin: '123456', status: 'OPEN', allowLateJoin: true, maxPlayers: 1000,
      }) : null)) },
      player: {
        count: vi.fn(async () => players.length),
        findFirst: vi.fn(async () => null),
        create: vi.fn(async ({ data }: any) => { const p = { id: 'p1', ...data }; players.push(p); return p; }),
      },
      bingoCard: { findUnique: vi.fn(async () => ({ id: 'card1', numbers: [[1,2,3,4,5],[6,7,8,9,10],[11,12,0,14,15],[16,17,18,19,20],[21,22,23,24,25]], cardSignature: 'sig' })) },
      session: { create: vi.fn(async ({ data }: any) => ({ id: 's1', ...data })) },
      draw: { findMany: vi.fn(async () => []) },
      claim: { findMany: vi.fn(async () => []) },
    },
  };
});

describe('POST /join', () => {
  const app = buildServer();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates player session and returns snapshot', async () => {
    const res = await request(app.server)
      .post('/join')
      .send({ pin: '123456', nickname: 'Player1' })
      .set('content-type', 'application/json');

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('player');
    expect(res.body).toHaveProperty('sessionToken');
    expect(res.body).toHaveProperty('bingoCard');
    expect(res.body).toHaveProperty('gameState');
  });
});

