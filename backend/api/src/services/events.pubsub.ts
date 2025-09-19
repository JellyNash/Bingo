import { redis } from './redis.js';
import { prisma } from './prisma.js';
import { config } from '../config.js';

const EVENT_CHANNEL = config.eventChannel;

type Envelope = {
  room: string;
  event: string;
  data: unknown;
};

export type DrawEventData = {
  seq: number;
  value: number;
};

export type ClaimEventData = {
  cardId: string;
  playerId: string;
  nickname: string;
  result: 'approved' | 'denied';
  rank?: number;
  pattern?: string;
  reason?: string;
  penalty?: {
    strikes: number;
    cooldownMs?: number;
  };
};

export type StateUpdateData = {
  status: string;
  autoDrawEnabled: boolean;
  autoDrawIntervalMs: number;
  winners: Array<{
    playerId: string;
    nickname: string;
    rank: number;
    pattern: string;
  }>;
};

async function publish(room: string, event: string, data: unknown): Promise<void> {
  const envelope: Envelope = { room, event, data };
  await redis.publish(EVENT_CHANNEL, JSON.stringify(envelope));
}

export async function publishDraw(gameId: string | number, seq: number, value: number) {
  const msg = JSON.stringify({ room: `game:${gameId}`, event: "draw:next", data: { seq, value } });
  await redis.publish(config.eventChannel, msg);
}

export async function publishDrawEvent(gameId: string, data: DrawEventData): Promise<void> {
  await publish(`game:${gameId}`, 'draw:next', data);
}

export async function publishClaimEvent(gameId: string, data: ClaimEventData): Promise<void> {
  await publish(`game:${gameId}`, 'claim:result', data);
}

export async function publishGameState(gameId: string): Promise<void> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      status: true,
      autoDrawEnabled: true,
      autoDrawInterval: true,
      claims: {
        where: {
          status: 'ACCEPTED',
          isWinner: true,
        },
        include: {
          player: true,
        },
        orderBy: {
          winPosition: 'asc',
        },
      },
    },
  });
  if (!game) return;

  const winners = game.claims.map((claim: any) => ({
    playerId: claim.playerId,
    nickname: claim.player?.nickname ?? 'Unknown',
    rank: claim.winPosition ?? 0,
    pattern: claim.pattern,
  }));

  const payload: StateUpdateData = {
    status: game.status,
    autoDrawEnabled: game.autoDrawEnabled,
    autoDrawIntervalMs: game.autoDrawInterval * 1000,
    winners,
  };

  await publish(`game:${gameId}`, 'state:update', payload);
}

export async function publishMediaCue(gameId: string, data: unknown): Promise<void> {
  await publish(`game:${gameId}`, 'media:cue', data);
}
