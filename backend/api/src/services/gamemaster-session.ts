import bcrypt from 'bcrypt';
import crypto from 'crypto';
import type { FastifyInstance } from 'fastify';
import type { GameMasterSession } from '@prisma/client';
import { prisma } from './prisma.js';
import { config } from '../config.js';

const PIN_HASH = process.env.GAMEMASTER_PIN_HASH || bcrypt.hashSync(config.gameMasterPin, 10);
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;
const TOKEN_DURATION_MS = 60 * 60 * 1000;

export class GameMasterSessionService {
  async authenticatePin(pin: string, ipAddress: string): Promise<{ success: boolean; sessionId?: string }> {
    const valid = await bcrypt.compare(pin, PIN_HASH);
    if (!valid) {
      return { success: false };
    }

    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await prisma.gameMasterSession.create({
      data: {
        sessionId,
        pinHash: PIN_HASH,
        ipAddress,
        expiresAt,
        lastActivity: new Date(),
      },
    });

    return { success: true, sessionId };
  }

  async validateSession(sessionId: string, ipAddress?: string): Promise<GameMasterSession | null> {
    const session = await prisma.gameMasterSession.findUnique({
      where: { sessionId },
      include: { currentGame: true },
    });
    if (!session) return null;

    if (session.expiresAt < new Date()) {
      await prisma.gameMasterSession.delete({ where: { id: session.id } });
      return null;
    }

    await prisma.gameMasterSession.update({
      where: { id: session.id },
      data: {
        lastActivity: new Date(),
        ...(ipAddress && ipAddress !== session.ipAddress
          ? { lastScreenIp: ipAddress, lastScreenAccess: new Date() }
          : {}),
      },
    });

    return session;
  }

  async bindGameToSession(sessionId: string, gameId: string, app: FastifyInstance): Promise<{ hostToken: string; screenToken: string }> {
    const session = await this.validateSession(sessionId);
    if (!session) throw new Error('Invalid session');

    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) throw new Error('Game not found');

    const tokenExpiresAt = new Date(Date.now() + TOKEN_DURATION_MS);

    const hostToken = await app.signSession({
      sub: sessionId,
      role: 'host',
      gameId,
    });

    const screenToken = await app.signSession({
      sub: `${sessionId}:screen`,
      role: 'host',
      gameId,
    });

    await prisma.gameMasterSession.update({
      where: { sessionId },
      data: {
        currentGameId: gameId,
        hostToken,
        screenToken,
        tokenExpiresAt,
      },
    });

    return { hostToken, screenToken };
  }

  async refreshTokens(sessionId: string, gameId: string, app: FastifyInstance) {
    return this.bindGameToSession(sessionId, gameId, app);
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await prisma.gameMasterSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { lastActivity: { lt: new Date(Date.now() - SESSION_DURATION_MS) } },
        ],
      },
    });
    return result.count;
  }
}

export const gameMasterSessionService = new GameMasterSessionService();
