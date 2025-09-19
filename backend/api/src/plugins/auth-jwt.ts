import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config.js';

type UserRole = 'host' | 'player';

export interface JwtPayload {
  sub: string;
  gameId?: string;
  role: UserRole;
  sessionId?: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorize: (role: UserRole | UserRole[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

const authPlugin = fp(async (fastify: any) => {
  fastify.register(fastifyJwt, {
    secret: config.jwtSecret,
    sign: {
      expiresIn: `${config.tokenTtlMin}m`,
    },
  });

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify<JwtPayload>();
    } catch (err) {
      request.log.warn({ err }, 'JWT verification failed');
      reply.code(401).send({ error: 'unauthorized', message: 'Invalid or missing token' });
    }
  });

  fastify.decorate('authorize', (roles: UserRole | UserRole[]) => {
    const targetRoles = Array.isArray(roles) ? roles : [roles];
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user as JwtPayload | undefined;
      if (!user || !targetRoles.includes(user.role)) {
        reply.code(403).send({ error: 'forbidden', message: 'Insufficient permissions' });
      }
    };
  });
});

export default authPlugin;
