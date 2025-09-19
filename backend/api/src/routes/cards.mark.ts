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
  position: z.string().regex(/^(FREE|[BINGO][0-9]{1,2})$/),
  marked: z.boolean(),
  idempotencyKey: z.string().max(128).optional(),
});

function resolveTarget(position: string) {
  if (position === 'FREE') {
    return { letter: 'FREE', number: 0, key: 'FREE' as const };
  }

  const letter = position[0] as 'B' | 'I' | 'N' | 'G' | 'O';
  const value = Number.parseInt(position.slice(1), 10);
  if (Number.isNaN(value)) {
    throw new Error('invalid_position');
  }

  const ranges: Record<typeof letter, [number, number]> = {
    B: [1, 15],
    I: [16, 30],
    N: [31, 45],
    G: [46, 60],
    O: [61, 75],
  };

  const [min, max] = ranges[letter];
  if (value < min || value > max) {
    throw new Error('invalid_position');
  }

  return { letter, number: value, key: String(value) };
}

export default async function markRoute(fastify: FastifyInstance) {
  fastify.post('/cards/:cardId/mark', {
    preHandler: [fastify.authenticate, fastify.authorize('player')],
  }, async (request, reply) => {
    const { cardId } = paramsSchema.parse(request.params);
    const body = bodySchema.parse(request.body);

    if (body.idempotencyKey) {
      const cached = await getIdempotentResponse(body.idempotencyKey);
      if (cached) {
        reply.code(cached.statusCode).headers(cached.headers ?? {}).send(cached.body);
        return;
      }
    }

    await fastify.rateLimit.enforceMark(request, reply);
    if (reply.sent) return;

    const card = await prisma.bingoCard.findUnique({
      where: { id: cardId },
      include: { player: true, game: true },
    });
    if (!card || !card.player || !card.game) {
      return reply.code(404).send({ error: 'card_not_found', message: 'Card not found' });
    }

    const user = request.user as { sub?: string };
    if (user.sub !== card.playerId) {
      return reply.code(403).send({ error: 'forbidden', message: 'Cannot mark on another card' });
    }

    const gameId = card.gameId;

    let target;
    try {
      target = resolveTarget(body.position);
    } catch (error) {
      return reply.code(400).send({ error: 'invalid_position', message: 'Position is not valid for bingo card' });
    }

    const marks = { ...(card.marks as Record<string, boolean>) };
    if (!marks.FREE) marks.FREE = true;

    const grid = card.numbers as number[][];
    const draws = await prisma.draw.findMany({ where: { gameId }, orderBy: { sequence: 'asc' } });
    const drawnNumbers = new Set<number>(draws.map((d) => d.number));

    if (target.letter !== 'FREE') {
      const columnIndex = { B: 0, I: 1, N: 2, G: 3, O: 4 }[target.letter];
      const existsInColumn = grid.some((row) => row[columnIndex] === target.number);
      if (!existsInColumn) {
        return reply.code(400).send({ error: 'invalid_position', message: 'Position does not belong to this card' });
      }

      if (body.marked && !drawnNumbers.has(target.number)) {
        return reply.code(400).send({ error: 'number_not_drawn', message: 'Number has not been drawn yet' });
      }

      if (body.marked) {
        marks[target.key] = true;
      } else {
        delete marks[target.key];
      }
    } else {
      marks.FREE = true;
    }

    const drawnWithFree = new Set(drawnNumbers);
    drawnWithFree.add(0);
    const cardWithMarks = { ...card, marks } as unknown as BingoCardModel;
    const eligible = eligiblePatterns(cardWithMarks, drawnWithFree);

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
