import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../services/prisma.js';
import { mapGame } from '../utils/mappers.js';
import { publishGameState } from '../services/events.pubsub.js';
import { stopAutoDraw } from '../services/auto-draw.js';

const paramsSchema = z.object({ gameId: z.string().cuid() });

export default async function gamesPause(fastify: FastifyInstance) {
  fastify.post('/games/:gameId/pause', {
    preHandler: [fastify.createGameMasterAuth()],
  }, async (request, reply) => {
    const { gameId } = paramsSchema.parse(request.params);
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) return reply.status(404).send({ error: 'not_found', message: 'Game not found' });
    if (game.status !== 'ACTIVE') {
      return reply.status(400).send({ error: 'invalid_state', message: 'Game is not active' });
    }

    const updated = await prisma.game.update({
      where: { id: gameId },
      data: {
        status: 'PAUSED',
        pausedAt: new Date(),
      },
    });

    stopAutoDraw(gameId);

    await publishGameState(gameId);
    reply.send(mapGame(updated));
  });
}
