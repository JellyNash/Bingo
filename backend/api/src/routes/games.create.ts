import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
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
    const requester = request.user as { sub?: string };

    // Transaction to ensure atomicity
    const game = await prisma.$transaction(async (tx) => {
      // First create the game to get the CUID
      const newGame = await tx.game.create({
        data: {
          pin,
          name: body.name,
          maxPlayers: body.maxPlayers,
          allowLateJoin: body.allowLateJoin,
          autoDrawInterval: body.autoDrawInterval,
          winnerLimit: body.winnerLimit,
          rngSeed: 'pending', // temporary value
          gameSignature: 'pending', // temporary value
          createdBy: requester.sub,
        },
      });

      // Generate secrets with the actual CUID
      const { rngSeed, gameSignature } = generateGameSecrets(newGame.id);

      // Update with the correct secrets
      return await tx.game.update({
        where: { id: newGame.id },
        data: { rngSeed, gameSignature },
      });
    });

    reply.code(201).send(mapGame(game));
  });
}
