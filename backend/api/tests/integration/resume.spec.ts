import { describe, it, expect, beforeAll, vi, afterAll } from 'vitest';
import request from 'supertest';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://local/test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
process.env.GAME_SEED_SECRET = process.env.GAME_SEED_SECRET || 'test_game_seed';

import { buildServer } from '../../src/server.js';

vi.mock('../../src/services/prisma.js', async () => {
  const session = { id: 's1', gameId: 'g1', playerId: 'p1' };
  return {
    prisma: {
      session: {
        findFirst: vi.fn(async ({ where: { resumeTokenHash } }: any) => (resumeTokenHash ? session : null)),
        update: vi.fn(async ({ data }: any) => ({ ...session, ...data })),
      },
      player: { findUnique: vi.fn(async () => ({ id: 'p1', nickname: 'Player1' })) },
      game: {
        findUnique: vi.fn(async () => ({
          id: 'g1', status: 'OPEN', draws: [], claims: [],
        })),
      },
    },
  };
});

describe('POST /resume', () => {
  const app = buildServer();

  beforeAll(async () => { await app.ready(); });
  afterAll(async () => { await app.close(); });

  it('rotates session token and returns snapshot', async () => {
    const res = await request(app.server)
      .post('/resume')
      .send({ resumeToken: 'opaque' })
      .set('content-type', 'application/json');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('sessionToken');
    expect(res.body).toHaveProperty('player');
    expect(res.body).toHaveProperty('game');
  });
});

