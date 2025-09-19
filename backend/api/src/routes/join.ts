import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { trace } from '@opentelemetry/api';
import { prisma } from '../services/prisma.js';
import { orchestrator } from '../services/orchestrator.adapter.js';
import { getIdempotentResponse, saveIdempotentResponse } from '../services/idempotency.js';
import { mapCard, mapPlayer, buildSnapshot } from '../utils/mappers.js';
import { publishGameState } from '../services/events.pubsub.js';
import { genOpaqueToken, sha256Hex } from '../utils/tokens.js';

const tracer = trace.getTracer('api');
const bodySchema = z.object({
  pin: z.string().regex(/^[0-9]{6}$/),
  nickname: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9_\-\s]+$/),
  idempotencyKey: z.string().max(128).optional(),
});

export default async function joinRoute(fastify: FastifyInstance) {
  fastify.post('/join', async (request, reply) => {
    const body = bodySchema.parse(request.body);

    if (body.idempotencyKey) {
      const cached = await getIdempotentResponse(body.idempotencyKey);
      if (cached) {
        reply.code(cached.statusCode).headers(cached.headers ?? {}).send(cached.body);
        return;
      }
    }

    await fastify.rateLimit.enforceJoin(request, reply);
    if (reply.sent) return;

    const span = tracer.startSpan('player.join');
    const game = await prisma.game.findUnique({ where: { pin: body.pin } });
    if (!game) {
      span.setStatus({ code: 2, message: 'Game unavailable' });
      span.end();
      return reply.code(404).send({ error: 'game_not_found', message: 'Game not found' });
    }

    const joinableStatuses = game.allowLateJoin ? ['LOBBY', 'OPEN', 'ACTIVE'] : ['LOBBY', 'OPEN'];
    if (!joinableStatuses.includes(game.status)) {
      span.setStatus({ code: 2, message: 'Game unavailable' });
      span.end();
      return reply.code(404).send({ error: 'game_not_joinable', message: 'Game not accepting players' });
    }

    const playerCount = await prisma.player.count({ where: { gameId: game.id } });
    if (playerCount >= game.maxPlayers) {
      span.setStatus({ code: 2, message: 'Game full' });
      span.end();
      return reply.code(400).send({ error: 'game_full', message: 'Game has reached capacity' });
    }

    const existingNickname = await prisma.player.findFirst({ where: { gameId: game.id, nickname: body.nickname } });
    if (existingNickname) {
      span.setStatus({ code: 2, message: 'Nickname taken' });
      span.end();
      return reply.code(400).send({ error: 'nickname_taken', message: 'Nickname already in use' });
    }

    const player = await prisma.player.create({
      data: {
        gameId: game.id,
        nickname: body.nickname.trim(),
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      },
    });

    const { cardId } = await orchestrator.generateCard({
      gameId: game.id,
      playerId: player.id,
      nickname: player.nickname,
    });

    // Generate secure tokens
    const resumeToken = genOpaqueToken(32);
    const sessionToken = fastify.jwt.sign(
      { sub: player.id, gameId: game.id, role: 'player' },
      { expiresIn: '12h' }
    );

    const resumeTokenHash = sha256Hex(resumeToken);
    const sessionTokenHash = sha256Hex(sessionToken);

    // Create session with hashes
    const session = await prisma.session.create({
      data: {
        gameId: game.id,
        playerId: player.id,
        ipAddress: request.ip,
        namespace: `game:${game.id}`,
        resumeTokenHash,
        sessionTokenHash,
        // Optionally keep raw copies (non-unique)
        resumeToken,
        sessionToken,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
      },
    });

    const snapshot = await prisma.game.findUnique({
      where: { id: game.id },
      include: {
        draws: true,
        players: true,
        claims: true,
      },
    });

    if (!snapshot) throw new Error('Snapshot failed');

    const cardRecord = await prisma.bingoCard.findUnique({ where: { id: cardId } });
    if (!cardRecord) throw new Error('Card generation failed');

    const responseBody = {
      player: mapPlayer(player),
      bingoCard: mapCard(cardRecord),
      sessionToken,
      resumeToken,
      gameState: buildSnapshot({
        game: snapshot,
        draws: snapshot.draws,
        players: snapshot.players,
        claims: snapshot.claims,
      }),
    };

    span.setAttribute('player.id', player.id);
    span.end();

    await publishGameState(game.id);

    if (body.idempotencyKey) {
      await saveIdempotentResponse(body.idempotencyKey, { statusCode: 201, body: responseBody });
    }

    reply.code(201).send(responseBody);
  });
}
