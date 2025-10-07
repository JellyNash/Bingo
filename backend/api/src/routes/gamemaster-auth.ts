import type { FastifyInstance } from 'fastify';
import { gameMasterSessionService } from '../services/gamemaster-session.js';
import { config } from '../config.js';

interface PinBody { pin: string }
interface BindBody { gameId: string }
interface LaunchBody { gameId: string }

const SCREEN_LAUNCH_TTL_SECONDS = 5 * 60;

export default async function gameMasterAuthRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: PinBody }>('/gamemaster/auth', async (request, reply) => {
    const { pin } = request.body;
    const { success, sessionId } = await gameMasterSessionService.authenticatePin(pin, request.ip);
    if (!success || !sessionId) {
      return reply.status(401).send({ error: 'unauthorized', message: 'Invalid PIN' });
    }

    reply.setCookie('gm_session', sessionId, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/',
    });

    return reply.send({ success: true });
  });

  fastify.get('/gamemaster/session', {
    preHandler: fastify.createGameMasterAuth(),
  }, async (request, reply) => {
    const sessionId = request.cookies.gm_session ?? ((request.user as any)?.sub as string | undefined);
    if (!sessionId) {
      return reply.status(401).send({ error: 'unauthorized', message: 'Session missing' });
    }

    const session = await gameMasterSessionService.validateSession(sessionId);
    if (!session) {
      reply.clearCookie('gm_session');
      return reply.status(401).send({ error: 'unauthorized', message: 'Session expired' });
    }

    const hasValidTokens = Boolean(session.hostToken && session.tokenExpiresAt && session.tokenExpiresAt > new Date());

    return reply.send({
      sessionId,
      currentGameId: session.currentGameId ?? null,
      hasValidTokens,
      hostToken: hasValidTokens ? session.hostToken : undefined,
      screenToken: hasValidTokens ? session.screenToken : undefined,
    });
  });

  fastify.post<{ Body: BindBody }>('/gamemaster/session/bind', {
    preHandler: fastify.createGameMasterAuth(),
  }, async (request, reply) => {
    const { gameId } = request.body;
    const sessionId = request.cookies.gm_session ?? ((request.user as any)?.sub as string | undefined);
    if (!sessionId) {
      return reply.status(401).send({ error: 'unauthorized', message: 'Session missing' });
    }

    const tokens = await gameMasterSessionService.bindGameToSession(sessionId, gameId, fastify);
    return reply.send(tokens);
  });

  fastify.post<{ Body: LaunchBody }>('/gamemaster/launch-screen', {
    preHandler: fastify.createGameMasterAuth(),
  }, async (request, reply) => {
    const { gameId } = request.body;
    const sessionId = request.cookies.gm_session ?? ((request.user as any)?.sub as string | undefined);
    if (!sessionId) {
      return reply.status(401).send({ error: 'unauthorized', message: 'Session missing' });
    }

    const tokens = await gameMasterSessionService.bindGameToSession(sessionId, gameId, fastify);

    const launchToken = await fastify.jwt.sign({
      purpose: 'screen_launch',
      sessionId,
      gameId,
    }, { expiresIn: SCREEN_LAUNCH_TTL_SECONDS });

    const screenUrl = `${config.screenAppUrl.replace(/\/$/, '')}?launch=${encodeURIComponent(launchToken)}`;

    return reply.send({
      launchToken,
      screenUrl,
      hostToken: tokens.hostToken,
      screenToken: tokens.screenToken,
    });
  });
}
