import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../services/prisma.js';
import { mapGame } from '../utils/mappers.js';
import { publishGameState } from '../services/events.pubsub.js';
import { startAutoDraw, stopAutoDraw } from '../services/auto-draw.js';

const paramsSchema = z.object({ gameId: z.string().cuid() });
const bodySchema = z.object({
  enabled: z.boolean(),
  intervalMs: z.number().int().min(5_000).max(20_000).optional(),
});

export default async function gamesAuto(fastify: FastifyInstance) {
  fastify.post('/games/:gameId/auto-draw', {
    preHandler: [fastify.authenticate, fastify.authorize('host')],
  }, async (request, reply) => {
    const { gameId } = paramsSchema.parse(request.params);
    const body = bodySchema.parse(request.body);

    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) return reply.code(404).send({ error: 'not_found', message: 'Game not found' });

    const intervalMs = body.intervalMs ?? game.autoDrawInterval * 1000;

    const updated = await prisma.game.update({
      where: { id: gameId },
      data: {
        autoDrawEnabled: body.enabled,
        autoDrawInterval: Math.round(intervalMs / 1000),
      },
    });

    if (body.enabled) {
      startAutoDraw(gameId, intervalMs);
    } else {
      stopAutoDraw(gameId);
    }

    await publishGameState(gameId);
    reply.send(mapGame(updated));
  });
}
