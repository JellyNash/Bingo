/* eslint-disable @typescript-eslint/no-explicit-any */
import fp from 'fastify-plugin';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import crypto from 'crypto';
import { gameMasterSessionService } from '../services/gamemaster-session.js';

export type Role = 'player' | 'host' | 'screen';

interface JWKSKey {
  kid: string;
  alg: 'HS256' | 'HS384' | 'HS512';
  k: string;
  use?: 'sig';
}

interface JWKS {
  keys: JWKSKey[];
}

export interface JwtClaims {
  sub: string;
  role: Role;
  gameId: string;
  playerId?: string;
  iat: number;
  exp: number;
  iss?: string;
  aud?: string;
  jti?: string;
}

function loadLocalJwks(): JWKS {
  const path = process.env.JWT_JWKS_PATH ?? resolve(process.cwd(), 'config/jwks.local.json');
  try {
    const buf = readFileSync(path, 'utf8');
    const jwks = JSON.parse(buf) as JWKS;
    if (!jwks.keys?.length) throw new Error('JWKS has no keys');
    return jwks;
  } catch (error) {
    console.warn('JWKS file not found, using environment fallback');
    return {
      keys: [
        {
          kid: 'default-hs256-v1',
          alg: 'HS256',
          k: Buffer.from(process.env.JWT_SECRET || 'default-development-secret').toString('base64url'),
          use: 'sig',
        },
      ],
    };
  }
}

function keyByKid(jwks: JWKS) {
  const map = new Map<string, JWKSKey>();
  for (const k of jwks.keys) map.set(k.kid, k);
  return map;
}

const revokedTokens = new Set<string>();
const TOKEN_REVOCATION_TTL = 60 * 60 * 1000;

setInterval(() => {
  if (revokedTokens.size > 1000) revokedTokens.clear();
}, TOKEN_REVOCATION_TTL);

const authPlugin = fp(async (app: any) => {
  const fastify = app as FastifyInstance;
  const jwks = loadLocalJwks();
  const byKid = keyByKid(jwks);
  const activeKid = process.env.JWT_ACTIVE_KID ?? jwks.keys[0].kid;

  let authFailures = 0;
  let authSuccesses = 0;
  let invalidTokens = 0;
  let expiredTokens = 0;

  await fastify.register(fastifyJwt as any, {
    secret: async (_request: FastifyRequest, token: any) => {
      const kid = (token?.header as any)?.kid ?? activeKid;
      const key = byKid.get(kid);
      if (!key) {
        invalidTokens++;
        throw new Error(`Unknown kid: ${kid}`);
      }
      if (key.k.startsWith('b64:')) return Buffer.from(key.k.slice(4), 'base64url');
      if (key.k.match(/^[A-Za-z0-9_-]+$/)) return Buffer.from(key.k, 'base64url');
      return key.k;
    },
    sign: {
      key: async () => {
        const key = byKid.get(activeKid)!;
        if (key.k.startsWith('b64:')) return Buffer.from(key.k.slice(4), 'base64url');
        if (key.k.match(/^[A-Za-z0-9_-]+$/)) return Buffer.from(key.k, 'base64url');
        return key.k;
      },
      header: { kid: activeKid, typ: 'JWT' },
      algorithm: (byKid.get(activeKid)!.alg as any) ?? 'HS256',
      expiresIn: '30m',
      issuer: process.env.JWT_ISSUER ?? 'bingo-api',
    },
    verify: {
      allowedIss: process.env.JWT_ISSUER ? [process.env.JWT_ISSUER] : ['bingo-api'],
      maxAge: '30m',
      clockTolerance: 5,
    },
  });

  fastify.decorate('signSession', async (claims: Omit<JwtClaims, 'iat' | 'exp' | 'jti'>) => {
    const jti = crypto.randomBytes(16).toString('hex');
    authSuccesses++;
    return app.jwt.sign({ ...claims, jti } as any);
  });

  fastify.decorate('revokeToken', (jti: string) => {
    if (!jti) return;
    revokedTokens.add(jti);
    setTimeout(() => revokedTokens.delete(jti), TOKEN_REVOCATION_TTL);
  });

  if (!fastify.hasDecorator('isTokenRevoked')) {
    fastify.decorate('isTokenRevoked', (jti?: string) => (jti ? revokedTokens.has(jti) : false));
  }

  if (!fastify.hasRequestDecorator('user')) {
    fastify.decorateRequest('user', null);
  }

  fastify.addHook('preHandler', async (req) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return;

    try {
      const payload = (await req.jwtVerify()) as JwtClaims;
      if (payload.jti && fastify.isTokenRevoked(payload.jti)) {
        authFailures++;
        throw new Error('Token has been revoked');
      }
      (req as any).user = payload;
      authSuccesses++;
    } catch (err: any) {
      if (err.message?.includes('expired')) expiredTokens++;
      else invalidTokens++;
    }
  });

  fastify.decorate('requireAuth', () => {
    return async (req: FastifyRequest, reply: FastifyReply) => {
      if (!req.user) {
        try {
          const payload = (await req.jwtVerify()) as JwtClaims;
          if (payload.jti && fastify.isTokenRevoked(payload.jti)) {
            authFailures++;
            return reply.status(401).send({ error: 'Token has been revoked' });
          }
          authSuccesses++;
        } catch (err: any) {
          authFailures++;
          if (err.message?.includes('expired')) {
            expiredTokens++;
            return reply.status(401).send({ error: 'unauthorized', message: 'Token expired' });
          }
          return reply.status(401).send({ error: 'unauthorized', message: 'Invalid or missing token' });
        }
      }
    };
  });

  fastify.decorate('requireRole', (role: Role) => {
    return async (req: FastifyRequest, reply: FastifyReply) => {
      if (!req.user) {
        try {
          const payload = (await req.jwtVerify()) as JwtClaims;
          if (payload.jti && fastify.isTokenRevoked(payload.jti)) {
            authFailures++;
            return reply.status(401).send({ error: 'Token has been revoked' });
          }
        } catch (err: any) {
          authFailures++;
          return reply.status(401).send({ error: 'unauthorized', message: 'Invalid or missing token' });
        }
      }

      const payload = req.user as JwtClaims;
      if (payload.role !== role) {
        authFailures++;
        return reply.status(403).send({ error: 'forbidden', message: `Requires ${role} role` });
      }
      authSuccesses++;
    };
  });

  fastify.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    return fastify.requireAuth()(req, reply);
  });

  fastify.decorate('authorize', (role: Role) => fastify.requireRole(role));

  fastify.decorate('createGameMasterAuth', () => {
    return async (req: any, reply: any) => {
      let authenticated = false;
      let gameId: string | null = null;

      const auth = req.headers.authorization;
      if (auth?.startsWith('Bearer ')) {
        try {
          const payload = (await req.jwtVerify()) as JwtClaims;
          if (payload.jti && fastify.isTokenRevoked(payload.jti)) {
            throw new Error('Token revoked');
          }
          if (payload.role === 'host') {
            authenticated = true;
            gameId = payload.gameId;
            authSuccesses++;
          }
        } catch (err) {
          authFailures++;
        }
      }

      if (!authenticated) {
        const sessionId = req.cookies?.gm_session;
        if (sessionId) {
         const session = await gameMasterSessionService.validateSession(sessionId, req.ip);
          if (session) {
            authenticated = true;
            gameId = session.currentGameId ?? null;
            req.user = {
              sub: sessionId,
              role: 'host' as Role,
              gameId: gameId ?? 'none',
            };
            authSuccesses++;
          }
        }
      }

      if (!authenticated) {
        authFailures++;
        return reply.status(401).send({
          error: 'unauthorized',
          message: 'Valid GameMaster session required',
        });
      }

      if (!gameId) {
        gameId = (req.params as any)?.gameId ?? (req.params as any)?.id ?? null;
      }
      (req as any).gameId = gameId;
    };
  });

  fastify.get('/api/metrics/auth', async () => ({
    auth_failures_total: authFailures,
    auth_successes_total: authSuccesses,
    invalid_tokens_total: invalidTokens,
    expired_tokens_total: expiredTokens,
    revoked_tokens_count: revokedTokens.size,
    active_kid: activeKid,
    available_kids: Array.from(byKid.keys()),
  }));
});

export default authPlugin;

declare module 'fastify' {
  interface FastifyInstance {
    signSession: (claims: Omit<JwtClaims, 'iat' | 'exp' | 'jti'>) => Promise<string>;
    revokeToken: (jti: string) => void;
    isTokenRevoked: (jti?: string) => boolean;
    requireAuth: () => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (role: Role) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorize: (role: Role) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    createGameMasterAuth: () => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
