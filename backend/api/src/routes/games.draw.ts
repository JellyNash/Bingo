import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { orchestrator } from '../services/orchestrator.adapter.js';
import { prisma } from '../services/prisma.js';
import { mapDraw } from '../utils/mappers.js';

const paramsSchema = z.object({ gameId: z.string().cuid() });
const tracer = trace.getTracer('api');

export default async function gamesDraw(fastify: FastifyInstance) {
  fastify.post('/games/:gameId/draw', {
    preHandler: [fastify.authenticate, fastify.authorize('host')],
  }, async (request, reply) => {
    const { gameId } = paramsSchema.parse(request.params);

    const span = tracer.startSpan('drawNumber');
    try {
      const user = request.user as { sub?: string };
      const result = await orchestrator.drawNextNumber(gameId, user.sub ?? 'HOST');
      const drawRecord = await prisma.draw.findUnique({ where: { id: result.id } });
      if (!drawRecord) {
        throw new Error('Draw record missing');
      }
      reply.send(mapDraw(drawRecord));
    } catch (error: any) {
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      if (error.message === 'Game not found') {
        reply.code(404).send({ error: 'not_found', message: 'Game not found' });
      } else if (error.message === 'Game is not active') {
        reply.code(400).send({ error: 'invalid_state', message: 'Game not active' });
      } else {
        reply.code(400).send({ error: 'draw_failed', message: error.message });
      }
    } finally {
      span.end();
    }
  });
}
