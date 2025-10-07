import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../services/prisma.js';
import { mapGame } from '../utils/mappers.js';
import { publishGameState, publishMediaCue } from '../services/events.pubsub.js';

const paramsSchema = z.object({ gameId: z.string().cuid() });
const bodySchema = z.object({
  startCountdown: z.boolean().optional().default(false),
}).optional();

export default async function gamesOpen(fastify: FastifyInstance) {
  fastify.post('/games/:gameId/open', {
    preHandler: [fastify.createGameMasterAuth()],
  }, async (request, reply) => {
    const { gameId } = paramsSchema.parse(request.params);
    const body = bodySchema ? bodySchema.parse(request.body || {}) : { startCountdown: false };

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { audioSettings: true }
    });

    if (!game) {
      return reply.status(404).send({ error: 'not_found', message: 'Game not found' });
    }

    if (!['LOBBY', 'OPEN', 'PAUSED', 'ACTIVE'].includes(game.status)) {
      return reply.status(400).send({ error: 'invalid_state', message: 'Game cannot be opened in current state' });
    }

    let updated: any = game;

    if (game.status === 'LOBBY') {
      const updateData: any = {
        status: 'OPEN',
        pausedAt: null,
      };

      // If countdown is requested and audio settings exist
      if (body.startCountdown && game.audioSettings?.countdownEnabled) {
        const countdownStart = new Date();
        updateData.countdownStartAt = countdownStart;
        updateData.countdownDurationSeconds = game.audioSettings.countdownDurationSeconds;
      }

      updated = await prisma.game.update({
        where: { id: gameId },
        data: updateData,
      });

      // Publish audio cues for lobby to in-game transition
      if (game.audioSettings) {
        await publishMediaCue(gameId, {
          type: 'music:in-game:start',
          packId: game.audioSettings.inGameMusicPackId || undefined,
          timestamp: Date.now(),
        });

        if (body.startCountdown && game.audioSettings.countdownEnabled) {
          await publishMediaCue(gameId, {
            type: 'sfx:countdown:start',
            packId: game.audioSettings.sfxPackId || undefined,
            duration: game.audioSettings.countdownDurationSeconds,
            message: game.audioSettings.countdownMessage || undefined,
            timestamp: Date.now(),
          });
        }
      }
    } else if (game.status === 'PAUSED') {
      updated = await prisma.game.update({
        where: { id: gameId },
        data: {
          status: 'ACTIVE',
          pausedAt: null,
        },
      });

      // Publish resume audio cue
      if (game.audioSettings?.sfxPackId) {
        await publishMediaCue(gameId, {
          type: 'sfx:game:resume',
          packId: game.audioSettings.sfxPackId || undefined,
          timestamp: Date.now(),
        });
      }
    }

    await publishGameState(gameId);
    reply.send(mapGame(updated));
  });
}
