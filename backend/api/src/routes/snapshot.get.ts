import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../services/prisma.js';
import { buildSnapshot } from '../utils/mappers.js';

const paramsSchema = z.object({ gameId: z.string().cuid() });

export default async function snapshotRoute(fastify: FastifyInstance) {
  fastify.get('/games/:gameId/snapshot', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { gameId } = paramsSchema.parse(request.params);

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        draws: true,
        players: true,
        claims: true,
      },
    });
    if (!game) return reply.code(404).send({ error: 'not_found', message: 'Game not found' });

    reply.send(
      buildSnapshot({
        game,
        draws: game.draws,
        players: game.players,
        claims: game.claims,
      }),
    );
  });
}
