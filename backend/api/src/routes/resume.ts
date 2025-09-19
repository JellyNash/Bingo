import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../services/prisma.js";
import { genOpaqueToken, sha256Hex } from "../utils/tokens.js";

const bodySchema = z.object({
  resumeToken: z.string(),
});

export default async function resumeRoute(fastify: FastifyInstance) {
  fastify.post("/resume", async (request, reply) => {
    const { resumeToken } = bodySchema.parse(request.body);

    let payload: any;
    try {
      payload = fastify.jwt.verify(resumeToken);
    } catch {
      return reply.code(400).send({ error: "invalid_token", message: "Resume token invalid or expired" });
    }

    const playerId = payload.sub as string | undefined;
    const gameId = payload.gameId as string | undefined;
    if (!playerId || !gameId) {
      return reply.code(400).send({ error: "token_mismatch", message: "Resume token missing identifiers" });
    }

    // Hash the token to find the session
    const resumeTokenHash = sha256Hex(resumeToken);
    const session = await prisma.session.findFirst({ where: { gameId, playerId, resumeTokenHash } });
    if (!session) return reply.code(404).send({ error: "session_not_found", message: "Session not found" });

    const [player, game] = await Promise.all([
      prisma.player.findUnique({ where: { id: playerId } }),
      prisma.game.findUnique({
        where: { id: gameId },
        include: {
          draws: { orderBy: { sequence: "asc" } },
          claims: true,
        },
      }),
    ]);

    if (!player) return reply.code(404).send({ error: "player_not_found", message: "Player not found" });
    if (!game) return reply.code(404).send({ error: "game_not_found", message: "Game not found" });

    const drawnNumbers = game.draws.map(d => ({ seq: d.sequence, num: d.number }));
    const winners = game.claims
      .filter(c => c.status === "ACCEPTED" && (c as any).isWinner)
      .map(c => ({ playerId: c.playerId, rank: (c as any).winPosition ?? 0, pattern: c.pattern }));

    // Generate new tokens
    const sessionToken = fastify.jwt.sign({ sub: playerId, gameId, role: "player", sessionId: session.id }, { expiresIn: "12h" });
    const newResumeToken = genOpaqueToken(32);

    const sessionTokenHash = sha256Hex(sessionToken);
    const newResumeTokenHash = sha256Hex(newResumeToken);

    await prisma.session.update({
      where: { id: session.id },
      data: {
        lastSeenAt: new Date(),
        resumeToken: newResumeToken,
        resumeTokenHash: newResumeTokenHash,
        sessionToken,
        sessionTokenHash
      },
    });

    return reply.send({
      sessionToken,
      resumeToken: newResumeToken,
      player: { id: player.id, nickname: player.nickname },
      game: { id: game.id, status: game.status },
      drawnNumbers,
      winners,
    });
  });
}