import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { generateGameSecrets, generateUniquePin } from '../utils/game.js';
import { prisma } from '../services/prisma.js';
import { mapGame } from '../utils/mappers.js';

const createGameBody = z.object({
  name: z.string().max(100).optional(),
  maxPlayers: z.number().int().min(1).max(10_000).default(1000),
  allowLateJoin: z.boolean().default(true),
  autoDrawInterval: z.number().int().min(5).max(20).default(8),
  winnerLimit: z.number().int().min(1).default(1),
});

export default async function gamesCreate(fastify: FastifyInstance) {
  fastify.post('/games', {
    preHandler: [fastify.authenticate, fastify.authorize('host')],
  }, async (request, reply) => {
    const body = createGameBody.parse(request.body ?? {});

    const pin = await generateUniquePin();
    const gameId = randomUUID();
    const { rngSeed, gameSignature } = generateGameSecrets(gameId);

    const requester = request.user as { sub?: string };

    const game = await prisma.game.create({
      data: {
        id: gameId,
        pin,
        name: body.name,
        maxPlayers: body.maxPlayers,
        allowLateJoin: body.allowLateJoin,
        autoDrawInterval: body.autoDrawInterval,
        winnerLimit: body.winnerLimit,
        rngSeed,
        gameSignature,
        createdBy: requester.sub,
      },
    });

    reply.code(201).send(mapGame(game));
  });
}
