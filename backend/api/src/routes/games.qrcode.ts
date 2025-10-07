import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { qrCodeService } from '../services/qr-code.js';
import { gameMasterSessionService } from '../services/gamemaster-session.js';

const qrCodeRoute = fp(async (fastify: FastifyInstance) => {
  fastify.get('/games/qr/:pin', async (request, reply) => {
    const { pin } = request.params as { pin: string };
    const qrCode = await qrCodeService.generateGameQRCode(pin);
    return reply.send({ qrCode });
  });

  fastify.post('/screen/establish-session', async (request, reply) => {
    const { launchToken } = request.body as { launchToken?: string };
    if (!launchToken) {
      return reply.status(400).send({ error: 'Launch token required' });
    }

    try {
      const payload = await fastify.jwt.verify<{ purpose?: string; sessionId?: string; gameId?: string }>(launchToken);
      if (payload.purpose !== 'screen_launch' || !payload.sessionId || !payload.gameId) {
        throw new Error('Invalid launch token');
      }

      const session = await gameMasterSessionService.validateSession(payload.sessionId);
      if (!session) {
        return reply.status(401).send({ error: 'GameMaster session expired' });
      }

      const { screenToken } = await gameMasterSessionService.bindGameToSession(payload.sessionId, payload.gameId, fastify);

      return reply.send({ token: screenToken, gameId: payload.gameId });
    } catch (error) {
      request.log.error({ error }, 'Failed to establish screen session');
      return reply.status(401).send({ error: 'Invalid or expired launch token' });
    }
  });
});

export default qrCodeRoute;
