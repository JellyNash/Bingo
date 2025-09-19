import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../services/prisma.js';
import { mapPenalty } from '../utils/mappers.js';
import { publishGameState } from '../services/events.pubsub.js';

const bodySchema = z.object({
  playerId: z.string().cuid(),
  type: z.enum(['FALSE_CLAIM', 'RATE_LIMIT', 'SUSPICIOUS', 'MANUAL', 'AUTO_STRIKE']),
  reason: z.string().max(200),
  severity: z.number().int().min(1).max(3).default(1),
  durationMinutes: z.number().int().min(1).max(1440).optional(),
});

export default async function penaltyRoute(fastify: FastifyInstance) {
  fastify.post('/games/:gameId/penalty', {
    preHandler: [fastify.authenticate, fastify.authorize('host')],
  }, async (request, reply) => {
    const { gameId } = z.object({ gameId: z.string().cuid() }).parse(request.params);
    const body = bodySchema.parse(request.body);
    const { playerId } = body;

    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) return reply.code(404).send({ error: 'player_not_found', message: 'Player not found' });

    const expiresAt = body.durationMinutes ? new Date(Date.now() + body.durationMinutes * 60_000) : null;
    const user = request.user as { sub?: string } | undefined;

    const penalty = await prisma.penalty.create({
      data: {
        gameId,
        playerId,
        type: body.type,
        reason: body.reason,
        severity: body.severity,
        expiresAt,
        appliedBy: user?.sub ?? 'SYSTEM',
      },
    });

    await prisma.player.update({
      where: { id: playerId },
      data: {
        status: 'COOLDOWN',
        cooldownUntil: expiresAt,
        strikes: player.strikes + body.severity,
      },
    });

    await publishGameState(gameId);
    reply.code(201).send(mapPenalty(penalty));
  });
}
