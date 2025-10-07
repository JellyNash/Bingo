import type { BingoCard as BingoCardModel } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../services/prisma.js';
import { eligiblePatterns } from '../utils/patterns.js';
import { publishGameState } from '../services/events.pubsub.js';
import { getIdempotentResponse, saveIdempotentResponse } from '../services/idempotency.js';

const paramsSchema = z.object({
  cardId: z.string().cuid(),
});

const bodySchema = z.object({
  position: z.number().int().min(0).max(24),
  marked: z.boolean(),
  idempotencyKey: z.string().max(128).optional(),
});

export default async function markRoute(fastify: FastifyInstance) {
  fastify.post('/cards/:cardId/mark', {
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

    // Enforce per-user mark rate limits
    await (fastify as any).rateLimit.enforceMark(request, reply);
    if (reply.sent) return;

    const card = await prisma.bingoCard.findUnique({
      where: { id: cardId },
      include: { player: { select: { id: true, gameId: true, nickname: true } } },
    });
    if (!card || !card.player || !card.player.gameId) {
      return reply.status(404).send({ error: 'card_not_found', message: 'Card or game not found' });
    }

    const user = request.user as { sub?: string };
    if (user.sub !== card.playerId) {
      return reply.status(403).send({ error: 'forbidden', message: 'Cannot mark on another card' });
    }

    const gameId = card.player.gameId;

    const marks = { ...((card.marks as unknown as Record<string, boolean>) ?? {}) };
    marks['12'] = true;

    const grid = card.numbers as number[][];
    const position = body.position;
    const rowIndex = Math.floor(position / 5);
    const colIndex = position % 5;

    if (rowIndex < 0 || rowIndex >= grid.length || colIndex < 0 || colIndex >= grid[rowIndex].length) {
      return reply.status(400).send({ error: 'invalid_position', message: 'Position is not valid for bingo card' });
    }

    const cellNumber = grid[rowIndex][colIndex];

    const draws = await prisma.draw.findMany({ where: { gameId }, orderBy: { sequence: 'asc' } });
    const drawnNumbers = new Set<number>(draws.map((d: { number: number }) => d.number));

    if (position !== 12) {
      if (cellNumber === 0) {
        return reply.status(400).send({ error: 'invalid_position', message: 'Position does not belong to this card' });
      }

      if (body.marked && !drawnNumbers.has(cellNumber)) {
        return reply.status(400).send({ error: 'number_not_drawn', message: 'Number has not been drawn yet' });
      }

      if (body.marked) {
        marks[String(position)] = true;
      } else {
        delete marks[String(position)];
      }
    } else {
      marks['12'] = true;
    }

    const cardWithMarks = { ...card, marks } as unknown as BingoCardModel;
    const eligible = eligiblePatterns(cardWithMarks, drawnNumbers);

    await prisma.bingoCard.update({
      where: { id: cardId },
      data: {
        marks,
      },
    });

    await publishGameState(gameId);

    const response = {
      success: true,
      marks,
      eligiblePatterns: eligible,
    };

    if (body.idempotencyKey) {
      await saveIdempotentResponse(body.idempotencyKey, { statusCode: 200, body: response });
    }

    reply.send(response);

  });
}
