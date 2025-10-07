import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
// Use shared Prisma client to avoid extra pools in tests/runtime
import { prisma } from '../services/prisma.js';
import crypto from 'node:crypto';
import manifest from '../../../../analytics/schema/v1/manifest.json' with { type: 'json' };


interface IngestEvent {
  id: string;                 // uuid v4 from client
  ts: number;                 // ms since epoch (client)
  app: 'player' | 'console' | 'screen' | 'api' | 'realtime';
  name: string;               // must exist in manifest
  gameId?: string;
  playerId?: string;
  cardId?: string;
  sessionId?: string;
  env?: 'offline' | 'cloud';
  traceId?: string;
  dnt?: boolean;
  ctx?: Record<string, unknown>;
  props?: Record<string, unknown>;
}

interface IngestBatch {
  Body: IngestEvent[];
}

export default async function analyticsIngest(app: FastifyInstance) {
  // Rate limiting for analytics endpoint
  await app.register(import('@fastify/rate-limit'), {
    max: 60,
    timeWindow: '1 minute',
    hook: 'preHandler',
    keyGenerator: (req: FastifyRequest) => {
      // Rate limit by IP address
      return req.ip;
    }
  });

  app.post<IngestBatch>('/analytics/events', {
    schema: {
      body: {
        type: 'array',
        maxItems: 100, // Prevent huge batches
        items: {
          type: 'object',
          required: ['id', 'ts', 'app', 'name'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            ts: { type: 'number', minimum: 0 },
            app: {
              type: 'string',
              enum: ['player', 'console', 'screen', 'api', 'realtime']
            },
            name: { type: 'string', maxLength: 50 },
            gameId: { type: 'string', maxLength: 32 },
            playerId: { type: 'string', maxLength: 32 },
            cardId: { type: 'string', maxLength: 32 },
            sessionId: { type: 'string', maxLength: 64 },
            env: {
              type: 'string',
              enum: ['offline', 'cloud']
            },
            traceId: { type: 'string', maxLength: 64 },
            dnt: { type: 'boolean' },
            ctx: {
              type: 'object',
              additionalProperties: true
            },
            props: {
              type: 'object',
              additionalProperties: true
            }
          },
          additionalProperties: false
        }
      },
      response: {
        202: {
          type: 'object',
          properties: {
            accepted: { type: 'number' },
            rejected: { type: 'number' }
          }
        },
        204: {
          type: 'null',
          description: 'Analytics disabled'
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (req: FastifyRequest<IngestBatch>, reply: FastifyReply) => {
    // Check if analytics is enabled
    if (process.env.ANALYTICS_ENABLED !== 'true') {
      return reply.status(204).send();
    }

    const events = req.body;

    // Optional HMAC validation
    let sigValid: boolean | null = null;
    const hmacKey = process.env.ANALYTICS_HMAC_KEY || '';
    
    if (hmacKey) {
      const signature = req.headers['x-analytics-signature'] as string;
      
      if (!signature) {
        app.log.warn('Analytics request missing signature when HMAC key is configured');
        return reply.status(401).send({ error: 'missing_signature' });
      }

      try {
        // Get raw body for HMAC validation
        const bodyRaw = JSON.stringify(events);
        const mac = crypto
          .createHmac('sha256', hmacKey)
          .update(bodyRaw)
          .digest('hex');
        
        sigValid = signature === `sha256=${mac}`;
        
        if (!sigValid) {
          app.log.warn('Analytics request failed HMAC validation');
          return reply.status(401).send({ error: 'bad_signature' });
        }
      } catch (err) {
        app.log.error({ err }, 'HMAC validation error');
        sigValid = false;
      }
    }

    // Validate event names against manifest
    const validEvents = manifest.events as string[];
    const sampling = Number(process.env.ANALYTICS_SAMPLING_API_REQUEST || '0.1');
    
    const filtered = events.filter((e: IngestEvent) => {
      // Check if event name is valid
      if (!validEvents.includes(e.name)) {
        app.log.warn(`Invalid analytics event name: ${e.name}`);
        return false;
      }
      
      // Apply sampling to noisy events
      if (e.name === 'api.request' && Math.random() > sampling) {
        return false;
      }
      
      // Validate timestamp is reasonable (not too old, not in future)
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      const maxFuture = 5 * 60 * 1000; // 5 minutes
      
      if (e.ts < now - maxAge || e.ts > now + maxFuture) {
        app.log.warn(`Analytics event timestamp out of range: ${e.ts}`);
        return false;
      }
      
      return true;
    });

    if (filtered.length === 0) {
      return reply.status(202).send({ accepted: 0, rejected: events.length });
    }

    try {
      // Batch insert events
      await prisma.analyticsEventRaw.createMany({
        data: filtered.map((e: IngestEvent) => ({
          id: e.id,
          ts: new Date(e.ts),
          app: e.app,
          name: e.name,
          gameId: e.gameId ?? null,
          playerId: e.playerId ?? null,
          cardId: e.cardId ?? null,
          sessionId: e.sessionId ?? null,
          env: e.env ?? process.env.SERVICE_ENV ?? 'offline',
          traceId: e.traceId ?? null,
          dnt: e.dnt ?? false,
          ctx: (e.ctx ?? {}) as any,
          props: (e.props ?? {}) as any,
          sigValid
        })),
        skipDuplicates: true // Skip events with duplicate IDs (idempotency)
      });

      app.log.info(`Analytics: accepted ${filtered.length} events`);
      
      return reply.status(202).send({
        accepted: filtered.length,
        rejected: events.length - filtered.length
      });
    } catch (err) {
      app.log.error({ err }, 'Analytics ingestion error');
      return reply.status(500).send({ error: 'Failed to ingest analytics events' });
    }
  });
}
