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

    // Hash the opaque token to find the session
    const resumeTokenHash = sha256Hex(resumeToken);
    const session = await prisma.session.findFirst({ where: { resumeTokenHash } });
    if (!session) return reply.code(404).send({ error: "session_not_found", message: "Session not found" });

    const { playerId, gameId } = session;

    if (!playerId || !gameId) {
      return reply.code(400).send({ error: "invalid_session", message: "Session missing required data" });
    }

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

    if (!player || !player.id) return reply.code(404).send({ error: "player_not_found", message: "Player not found" });
    if (!game || !game.id) return reply.code(404).send({ error: "game_not_found", message: "Game not found" });

    const drawnNumbers = game.draws.map(d => ({ seq: d.sequence, num: d.number }));
    const winners = game.claims
      .filter(c => c.status === "ACCEPTED" && (c as any).isWinner)
      .map(c => ({ playerId: c.playerId, rank: (c as any).winPosition ?? 0, pattern: c.pattern }));

    // Rotate session token on resume
    const newSessionToken = fastify.jwt.sign(
      { sub: player.id, gameId: game.id, role: "player", sessionId: session.id },
      { expiresIn: "12h" }
    );
    const sessionTokenHash = sha256Hex(newSessionToken);

    await prisma.session.update({
      where: { id: session.id },
      data: {
        lastSeenAt: new Date(),
        sessionToken: newSessionToken,
        sessionTokenHash
      },
    });

    return reply.send({
      sessionToken: newSessionToken,
      player: { id: player.id, nickname: player.nickname },
      game: { id: game.id, status: game.status },
      drawnNumbers,
      winners,
    });
  });
}