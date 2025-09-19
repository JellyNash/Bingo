import type { Game, Player, BingoCard, Draw, Claim, Penalty } from '@prisma/client';
import type { ApiGame, ApiPlayer, ApiBingoCard, ApiDraw, ApiClaim, ApiPenalty, GameSnapshot } from '../types/api.js';

export function mapGame(game: Game): ApiGame {
  return {
    id: game.id,
    pin: game.pin,
    name: game.name,
    status: game.status as ApiGame['status'],
    maxPlayers: game.maxPlayers,
    allowLateJoin: game.allowLateJoin,
    autoDrawInterval: game.autoDrawInterval,
    autoDrawEnabled: (game as any).autoDrawEnabled ?? false,
    winnerLimit: game.winnerLimit,
    currentSequence: game.currentSequence,
    lastDrawAt: game.lastDrawAt?.toISOString() ?? null,
    startedAt: game.startedAt?.toISOString() ?? null,
    completedAt: game.completedAt?.toISOString() ?? null,
    pausedAt: (game as any).pausedAt ? (game as any).pausedAt.toISOString() : null,
    createdAt: game.createdAt.toISOString(),
    createdBy: game.createdBy,
  };
}

export function mapPlayer(player: Player): ApiPlayer {
  return {
    id: player.id,
    gameId: player.gameId,
    nickname: player.nickname,
    status: player.status as ApiPlayer['status'],
    strikes: player.strikes,
    isDisqualified: player.isDisqualified,
    cooldownUntil: player.cooldownUntil?.toISOString() ?? null,
    joinedAt: player.joinedAt.toISOString(),
    lastSeenAt: player.lastSeenAt.toISOString(),
  };
}

export function mapCard(card: BingoCard): ApiBingoCard {
  const numbers = card.numbers as number[][];
  const grid = numbers.map((row, rIdx) =>
    row.map((value, cIdx) => (rIdx === 2 && cIdx === 2 ? 'FREE' : value)),
  );
  return {
    id: card.id,
    playerId: card.playerId,
    numbers: grid,
    cardSignature: card.cardSignature,
    marks: card.marks as Record<string, boolean>,
    generatedAt: card.generatedAt.toISOString(),
  };
}

export function mapDraw(draw: Draw): ApiDraw {
  return {
    id: draw.id,
    gameId: draw.gameId,
    sequence: draw.sequence,
    letter: draw.letter as ApiDraw['letter'],
    number: draw.number,
    drawnAt: draw.drawnAt.toISOString(),
    drawnBy: draw.drawnBy,
    drawSignature: draw.drawSignature ?? undefined,
  };
}

export function mapClaim(claim: Claim): ApiClaim {
  return {
    id: claim.id,
    gameId: claim.gameId,
    playerId: claim.playerId,
    pattern: claim.pattern as ApiClaim['pattern'],
    isValid: claim.isValid,
    timestamp: claim.timestamp.toISOString(),
    status: claim.status as ApiClaim['status'],
    validatedAt: claim.validatedAt?.toISOString() ?? null,
    validatedBy: claim.validatedBy ?? null,
    denialReason: claim.denialReason ?? null,
    isWinner: claim.isWinner,
    winPosition: claim.winPosition ?? null,
  };
}

export function mapPenalty(penalty: Penalty): ApiPenalty {
  return {
    id: penalty.id,
    gameId: penalty.gameId,
    playerId: penalty.playerId,
    type: penalty.type,
    reason: penalty.reason,
    severity: penalty.severity,
    appliedAt: penalty.appliedAt.toISOString(),
    expiresAt: penalty.expiresAt?.toISOString() ?? null,
    isActive: penalty.isActive,
  };
}

export function buildSnapshot(args: {
  game: Game;
  draws: Draw[];
  players: Player[];
  claims: Claim[];
}): GameSnapshot {
  const { game, draws, players, claims } = args;
  const mappedPlayers = players.map(mapPlayer);
  const claimMap = claims.map(mapClaim);
  const winners = claimMap
    .filter((c) => c.status === 'ACCEPTED' && c.isWinner)
    .map((claim) => ({
      player: mappedPlayers.find((p) => p.id === claim.playerId)!,
      claim,
    }));
  return {
    game: mapGame(game),
    draws: draws.map(mapDraw),
    players: mappedPlayers,
    recentClaims: claimMap.slice(-10),
    winners,
  };
}
