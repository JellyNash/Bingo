import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const paramsSchema = z.object({ gameId: z.string().cuid() });

export default async function gamesUndo(fastify: FastifyInstance) {
  fastify.post('/games/:gameId/undo', {
    preHandler: [fastify.authenticate, fastify.authorize('host')],
  }, async (request, reply) => {
    paramsSchema.parse(request.params);
    reply.code(501).send({
      error: 'not_implemented',
      message: 'Undo last draw is not part of MVP scope. Refer to Phase 2 backlog.',
    });
  });
}
