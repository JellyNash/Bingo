import { randomInt, randomBytes, createHmac } from 'node:crypto';
import { deriveSeedHex } from '@bingo/orchestrator';
import { prisma } from '../services/prisma.js';
import { config } from '../config.js';

export async function generateUniquePin(): Promise<string> {
  let attempts = 0;
  while (attempts < 5) {
    const pin = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const existing = await prisma.game.findUnique({ where: { pin } });
    if (!existing) return pin;
    attempts += 1;
  }
  throw new Error('Unable to generate unique pin');
}

export function generateGameSecrets(gameId: string): { rngSeed: string; gameSignature: string } {
  const nonce = randomBytes(16).toString('hex');
  const rngSeed = deriveSeedHex({ secret: config.gameSeedSecret, gameId, nonce });
  const gameSignature = createHmac('sha256', config.gameSeedSecret)
    .update(`draw:${gameId}|${nonce}`)
    .digest('hex');

  return { rngSeed, gameSignature };
}
