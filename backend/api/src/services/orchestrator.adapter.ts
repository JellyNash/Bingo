import { createHmac } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import type { CardLayout } from '@bingo/orchestrator';
import {
  applyPenalty as orchestratorApplyPenalty,
  generateCard as orchestratorGenerateCard,
  marksFromDraws,
  newShuffledDeck,
  prngFromSeedHex,
  standardPatterns,
  validateClaim as orchestratorValidateClaim,
} from '@bingo/orchestrator';
import { prisma } from './prisma.js';
import { publishClaimEvent, publishDrawEvent, publishGameState } from './events.pubsub.js';
import { config } from '../config.js';

const PATTERN_MASKS: Record<string, number> = (() => {
  const base = standardPatterns();
  const normalized: Record<string, number> = {};
  for (const [key, value] of Object.entries(base)) {
    normalized[key.toUpperCase()] = value as number;
  }
  return normalized;
})();

function numberToLetter(num: number): 'B' | 'I' | 'N' | 'G' | 'O' {
  if (num <= 15) return 'B';
  if (num <= 30) return 'I';
  if (num <= 45) return 'N';
  if (num <= 60) return 'G';
  return 'O';
}

function deckFromSeed(seedHex: string): number[] {
  return newShuffledDeck(prngFromSeedHex(seedHex));
}

function playerCardSeed(gameSeed: string, playerId: string): string {
  return createHmac('sha256', gameSeed).update(`card:${playerId}`).digest('hex');
}

function expandGrid(flat: number[]): number[][] {
  const rows: number[][] = [];
  for (let r = 0; r < 5; r += 1) {
    rows.push(flat.slice(r * 5, r * 5 + 5));
  }
  rows[2][2] = 0;
  return rows;
}

function flattenGrid(grid: number[][]): number[] {
  const flat: number[] = [];
  for (const row of grid) {
    flat.push(...row);
  }
  return flat;
}

type LocalCardLayout = {
  id: string;
  grid: number[];
  freeCenter: boolean;
  signature: string;
};

function buildCardLayout(cardId: string, grid: number[][], signature: string): LocalCardLayout {
  return {
    id: cardId,
    grid: flattenGrid(grid),
    freeCenter: true,
    signature,
  };
}

export type DrawResult = {
  id: string;
  sequence: number;
  letter: 'B' | 'I' | 'N' | 'G' | 'O';
  number: number;
  drawSignature: string;
  drawnAt: Date;
};

export type ClaimValidationResult = {
  valid: boolean;
  strikeApplied: boolean;
  strikes: number;
  cooldownMs?: number;
  denialReason?: string;
  winPosition?: number;
};

export class OrchestratorAdapter {
  async drawNextNumber(gameId: string, actorId: string): Promise<DrawResult> {
    return prisma.$transaction(async (tx: any) => {
      const game = await tx.game.findUnique({
        where: { id: gameId },
        select: {
          id: true,
          status: true,
          currentSequence: true,
          rngSeed: true,
          gameSignature: true,
          startedAt: true,
        },
      });
      if (!game) throw new Error('Game not found');
      const canActivate = game.status === 'OPEN';
      if (!canActivate && game.status !== 'ACTIVE') throw new Error('Game is not active');

      if (game.currentSequence >= 75) {
        throw new Error('No numbers remaining');
      }

      const deck = deckFromSeed(game.rngSeed);
      const nextSequence = game.currentSequence + 1;
      const number = deck[nextSequence - 1];
      const letter = numberToLetter(number);
      const drawSignature = createHmac('sha256', game.gameSignature)
        .update(`${game.id}:${nextSequence}:${number}`)
        .digest('hex');

      const draw = await tx.draw.create({
        data: {
          gameId,
          sequence: nextSequence,
          letter,
          number,
          drawSignature,
          drawnBy: actorId,
        },
      });

      const updateData: Prisma.GameUpdateInput = {
        currentSequence: nextSequence,
        lastDrawAt: draw.drawnAt,
      };
      if (canActivate) {
        updateData.status = 'ACTIVE';
        if (!game.startedAt) {
          updateData.startedAt = draw.drawnAt;
        }
        updateData.pausedAt = null;
      }

      await tx.game.update({
        where: { id: gameId },
        data: updateData,
      });

      await publishDrawEvent(gameId, {
        seq: draw.sequence,
        value: draw.number,
      });

      await publishGameState(gameId);

      return {
        id: draw.id,
        sequence: draw.sequence,
        letter: draw.letter as DrawResult['letter'],
        number: draw.number,
        drawSignature: draw.drawSignature,
        drawnAt: draw.drawnAt,
      };
    });
  }

  async generateCard(params: { gameId: string; playerId: string; nickname: string }): Promise<{ cardId: string; grid: number[][]; cardSignature: string }>
  {
    const { gameId, playerId } = params;
    return prisma.$transaction(async (tx: any) => {
      const existing = await tx.bingoCard.findUnique({ where: { playerId } });
      if (existing) {
        return {
          cardId: existing.id,
          grid: existing.numbers as number[][],
          cardSignature: existing.cardSignature,
        };
      }

      const game = await tx.game.findUnique({ where: { id: gameId } });
      if (!game) throw new Error('Game not found');

      const cardSeed = playerCardSeed(game.rngSeed, playerId);
      const layout = orchestratorGenerateCard(
        gameId,
        playerId,
        config.gameSeedSecret,
        prngFromSeedHex(cardSeed),
      );
      const grid = expandGrid(layout.grid);

      const card = await tx.bingoCard.create({
        data: {
          playerId,
          numbers: grid,
          cardSignature: layout.signature,
          seedUsed: game.rngSeed,
          marks: { FREE: true },
        },
      });

      return {
        cardId: card.id,
        grid,
        cardSignature: layout.signature,
      };
    });
  }

  async validateClaim(params: {
    gameId: string;
    playerId: string;
    claimId: string;
    pattern: string;
  }): Promise<ClaimValidationResult> {
    const { gameId, playerId, claimId, pattern } = params;
    const targetPattern = pattern.toUpperCase();
    const maskTarget = PATTERN_MASKS[targetPattern];
    if (!maskTarget) {
      return { valid: false, strikeApplied: false, strikes: 0, denialReason: 'Unsupported pattern' };
    }

    return prisma.$transaction(async (tx: any) => {
      const claim = await tx.claim.findUnique({
        where: { id: claimId },
        include: {
          player: true,
          game: true,
        },
      });
      if (!claim) throw new Error('Claim not found');
      const card = await tx.bingoCard.findUnique({ where: { playerId } });
      if (!card) throw new Error('Card not found');

      const draws = await tx.draw.findMany({ where: { gameId }, orderBy: { sequence: 'asc' } });
      const drawnNumbers = new Set<number>(draws.map((d: { number: number }) => d.number));
      drawnNumbers.add(0);

      const layout = buildCardLayout(card.id, card.numbers as number[][], card.cardSignature);
      const cardMask = marksFromDraws(layout, drawnNumbers);
      const { winningPattern } = orchestratorValidateClaim(cardMask, PATTERN_MASKS);

      const isValid = winningPattern ? winningPattern.toUpperCase() === targetPattern : false;

      let strikes = claim.player.strikes;
      let strikeApplied = false;
      let cooldownMs: number | undefined;
      let denialReason: string | undefined;
      let winPosition: number | undefined;

      if (isValid) {
        const existingWinners = await tx.claim.count({ where: { gameId, status: 'ACCEPTED' } });
        winPosition = existingWinners + 1;
        await tx.claim.update({
          where: { id: claimId },
          data: {
            status: 'ACCEPTED',
            isValid: true,
            validatedAt: new Date(),
            isWinner: true,
            winPosition,
          },
        });
        if (winPosition !== undefined && winPosition >= claim.game.winnerLimit) {
          await tx.game.update({
            where: { id: gameId },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
              autoDrawEnabled: false,
            },
          });
        }
      } else {
        const penalty = orchestratorApplyPenalty(claim.player.strikes, {
          strikesAllowed: config.penaltyStrikes,
          cooldownMs: config.penaltyCooldownMs,
          rateLimitLockoutMs: config.rlLockoutMs,
        });
        strikes = penalty.strikes;
        strikeApplied = true;
        cooldownMs = penalty.cooldownMs;
        denialReason = 'Pattern not satisfied';

        const cooldownUntil = cooldownMs ? new Date(Date.now() + cooldownMs) : null;
        await tx.player.update({
          where: { id: playerId },
          data: {
            strikes,
            status: strikes >= config.penaltyStrikes ? 'COOLDOWN' : 'ACTIVE',
            cooldownUntil: cooldownUntil,
            isDisqualified: strikes >= config.penaltyStrikes,
          },
        });

        await tx.penalty.create({
          data: {
            gameId,
            playerId,
            type: strikes >= config.penaltyStrikes ? 'AUTO_STRIKE' : 'FALSE_CLAIM',
            reason: denialReason,
            severity: 1,
            expiresAt: cooldownUntil,
          },
        });

        await tx.claim.update({
          where: { id: claimId },
          data: {
            status: 'DENIED',
            validatedAt: new Date(),
            isValid: false,
            denialReason,
          },
        });
      }

      await publishClaimEvent(gameId, {
        cardId: card.id,
        playerId,
        nickname: claim.player.nickname,
        result: isValid ? 'approved' : 'denied',
        rank: winPosition,
        pattern: isValid ? targetPattern : undefined,
        reason: denialReason,
        penalty: strikeApplied
          ? {
              strikes,
              cooldownMs,
            }
          : undefined,
      });

      await publishGameState(gameId);

      return { valid: isValid, strikeApplied, strikes, cooldownMs, denialReason, winPosition };
    });
  }
}

export const orchestrator = new OrchestratorAdapter();
