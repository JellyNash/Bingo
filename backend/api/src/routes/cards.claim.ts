import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { prisma } from '../services/prisma.js';
import { orchestrator } from '../services/orchestrator.adapter.js';
import { mapClaim } from '../utils/mappers.js';
import { getIdempotentResponse, saveIdempotentResponse } from '../services/idempotency.js';

const tracer = trace.getTracer('api');
const paramsSchema = z.object({
  cardId: z.string().cuid(),
});

const bodySchema = z.object({
  pattern: z.enum([
    'ROW_1',
    'ROW_2',
    'ROW_3',
    'ROW_4',
    'ROW_5',
    'COL_1',
    'COL_2',
    'COL_3',
    'COL_4',
    'COL_5',
    'DIAGONAL_1',
    'DIAGONAL_2',
    'FOUR_CORNERS',
  ]),
  idempotencyKey: z.string().max(128).optional(),
});

export default async function claimRoute(fastify: FastifyInstance) {
  fastify.post('/cards/:cardId/claim', {
    preHandler: [fastify.authenticate, fastify.authorize('player')],
  }, async (request, reply) => {
    const { cardId } = paramsSchema.parse(request.params);
    const body = bodySchema.parse(request.body);

    if (body.idempotencyKey) {
      const cached = await getIdempotentResponse(body.idempotencyKey);
      if (cached) {
        reply.status(cached.statusCode).headers(cached.headers ?? {}).send(cached.body);
        return;
      }
    }

    // Enforce per-user claim rate limits
    await (fastify as any).rateLimit.enforceClaim(request, reply);
    if (reply.sent) return;

    const card = await prisma.bingoCard.findUnique({
      where: { id: cardId },
      include: {
        player: true,
      },
    });
    if (!card || !card.player) {
      return reply.status(404).send({ error: 'card_not_found', message: 'Card not found' });
    }

    const user = request.user as { sub?: string };
    if (user.sub !== card.playerId) {
      return reply.status(403).send({ error: 'forbidden', message: 'Cannot claim for another player' });
    }

    const { gameId } = card.player;
    if (!gameId) {
      return reply.status(404).send({ error: 'game_not_found', message: 'Game not found' });
    }

    const player = await prisma.player.findUnique({ where: { id: card.playerId } });
    if (!player) return reply.status(404).send({ error: 'player_not_found', message: 'Player not found' });

    if (player.status === 'COOLDOWN' && player.cooldownUntil && player.cooldownUntil.getTime() > Date.now()) {
      return reply.status(400).send({ error: 'cooldown', message: 'Player in cooldown due to penalty' });
    }

    const claim = await prisma.claim.create({
      data: {
        gameId,
        playerId: card.playerId,
        pattern: body.pattern,
        status: 'PENDING',
        timestamp: new Date(),
      },
    });

    const span = tracer.startSpan('claim.validate');
    const start = Date.now();

    const result = await orchestrator.validateClaim({
      gameId,
      playerId: card.playerId,
      claimId: claim.id,
      pattern: body.pattern,
    });

    const duration = Date.now() - start;
    fastify.metrics.claimValidationDuration.observe(duration);
    span.setAttribute('claim.valid', result.valid);
    span.setAttribute('claim.strikes', result.strikes);
    span.end();

    const updatedClaim = await prisma.claim.findUnique({ where: { id: claim.id } });
    if (!updatedClaim) throw new Error('Claim missing after validation');

    const responseBody = {
      claim: mapClaim(updatedClaim),
      message: result.valid ? 'Claim accepted' : 'Claim denied',
      strikes: result.strikes,
      cooldownMs: result.cooldownMs,
    };

    if (body.idempotencyKey) {
      await saveIdempotentResponse(body.idempotencyKey, { statusCode: 200, body: responseBody });
    }

    reply.send(responseBody);
  });
}
