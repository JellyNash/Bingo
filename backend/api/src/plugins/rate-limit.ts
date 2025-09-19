import fp from 'fastify-plugin';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config.js';
import { consumeRateLimit } from '../services/redis';

export interface RateLimitDecorations {
  rateLimit: {
    enforceJoin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    enforceClaim: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    enforceMark: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  };
}

declare module 'fastify' {
  interface FastifyInstance extends RateLimitDecorations {}
}

const MINUTE = 60_000;

const rateLimitPlugin = fp(async (fastify) => {
  async function enforce(
    type: 'join' | 'claim' | 'mark',
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const identity = type === 'join' ? request.ip : `${request.user?.sub ?? request.ip}`;
    const { limit, windowMs, lockoutMs } = (() => {
      if (type === 'join') {
        return { limit: config.rateLimitJoinPerMin, windowMs: MINUTE, lockoutMs: undefined as number | undefined };
      }
      if (type === 'claim') {
        return { limit: config.rateLimitClaimPerMin, windowMs: MINUTE, lockoutMs: config.rlLockoutMs };
      }
      return {
        limit: config.rateLimitMarkPerWindow,
        windowMs: config.rateLimitMarkWindowMs,
        lockoutMs: config.rlLockoutMs,
      };
    })();

    const key = `${type}:${identity}`;
    const result = await consumeRateLimit(key, limit, windowMs, lockoutMs);
    if (!result.allowed) {
      reply.code(429).send({
        error: 'rate_limited',
        message:
          type === 'join'
            ? 'Join attempts exceeded'
            : type === 'claim'
              ? 'Claim attempts exceeded'
              : 'Mark attempts exceeded',
        resetMs: result.resetMs,
        lockedUntil: result.lockedUntil,
      });
    }
  }

  fastify.decorate('rateLimit', {
    enforceJoin: (request: FastifyRequest, reply: FastifyReply) => enforce('join', request, reply),
    enforceClaim: (request: FastifyRequest, reply: FastifyReply) => enforce('claim', request, reply),
    enforceMark: (request: FastifyRequest, reply: FastifyReply) => enforce('mark', request, reply),
  });
});

export default rateLimitPlugin;
