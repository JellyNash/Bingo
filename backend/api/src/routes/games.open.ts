import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../services/prisma.js';
import { mapGame } from '../utils/mappers.js';
import { publishGameState } from '../services/events.pubsub.js';

const paramsSchema = z.object({ gameId: z.string().cuid() });

export default async function gamesOpen(fastify: FastifyInstance) {
  fastify.post('/games/:gameId/open', {
    preHandler: [fastify.authenticate, fastify.authorize('host')],
  }, async (request, reply) => {
    const { gameId } = paramsSchema.parse(request.params);
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      return reply.code(404).send({ error: 'not_found', message: 'Game not found' });
    }

    if (!['LOBBY', 'OPEN', 'PAUSED', 'ACTIVE'].includes(game.status)) {
      return reply.code(400).send({ error: 'invalid_state', message: 'Game cannot be opened in current state' });
    }

    let updated = game;

    if (game.status === 'LOBBY') {
      updated = await prisma.game.update({
        where: { id: gameId },
        data: {
          status: 'OPEN',
          pausedAt: null,
        },
      });
    } else if (game.status === 'PAUSED') {
      updated = await prisma.game.update({
        where: { id: gameId },
        data: {
          status: 'ACTIVE',
          pausedAt: null,
        },
      });
    }

    await publishGameState(gameId);
    reply.send(mapGame(updated));
  });
}
