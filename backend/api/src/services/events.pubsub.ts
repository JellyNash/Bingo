import { redis } from './redis.js';
import { prisma } from './prisma.js';
import { config } from '../config.js';
import { qrCodeService } from './qr-code.js';

const EVENT_CHANNEL = config.eventChannel;

type Envelope = {
  room: string;
  event: string;
  data: unknown;
};

export type DrawEventData = {
  seq: number;
  number: number;
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
  pin: string;
  playerCount: number;
  currentNumber?: number;
  drawnNumbers: number[];
  winners: Array<{
    playerId: string;
    nickname: string;
    rank: number;
    pattern: string;
  }>;
  players?: Array<{
    id: string;
    nickname: string;
    status: string;
    strikes: number;
    joinedAt: string;
  }>;
  qrCode?: string;
  audioSettings?: {
    countdownEnabled: boolean;
    countdownDurationSeconds: number;
    countdownMessage?: string;
    volumeSettings: Record<string, number>;
    packs: {
      lobbyMusic?: string;
      inGameMusic?: string;
      sfx?: string;
      voice?: string;
    };
  };
  countdownState?: {
    active: boolean;
    startedAt?: string;
    durationSeconds: number;
    message?: string;
  };
  playerRoster?: Array<{
    id: string;
    nickname: string;
    status: string;
    strikes: number;
    joinedAt: string;
    joinTimestamp: number;
  }>;
};

export type MediaCueData = {
  type: string; // e.g., 'music:lobby:start', 'sfx:player:join', 'voice:number:B1'
  packId?: string;
  cueKey?: string;
  timestamp: number;
  duration?: number;
  message?: string;
  data?: Record<string, unknown>;
};

async function publish(room: string, event: string, data: unknown): Promise<void> {
  const envelope: Envelope = { room, event, data };
  await redis.publish(EVENT_CHANNEL, JSON.stringify(envelope));
}

export async function publishDrawEvent(gameId: string, data: DrawEventData): Promise<void> {
  await publish(`game:${gameId}`, 'draw:next', data);
}

export async function publishClaimEvent(gameId: string, data: ClaimEventData): Promise<void> {
  await publish(`game:${gameId}`, 'claim:result', {
    ...data,
    status: data.result,
  });
}

export async function publishGameState(gameId: string): Promise<void> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      status: true,
      autoDrawEnabled: true,
      autoDrawInterval: true,
      pin: true,
      countdownStartAt: true,
      countdownDurationSeconds: true,
      players: {
        select: {
          id: true,
          nickname: true,
          status: true,
          strikes: true,
          joinedAt: true,
        },
      },
      draws: {
        select: {
          letter: true,
          number: true,
          sequence: true,
        },
        orderBy: {
          sequence: 'asc',
        },
      },
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
      audioSettings: {
        select: {
          countdownEnabled: true,
          countdownDurationSeconds: true,
          countdownMessage: true,
          volumeSettings: true,
          lobbyMusicPackId: true,
          inGameMusicPackId: true,
          sfxPackId: true,
          voicePackId: true,
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

  // Enhanced players data for console
  const players = game.players.map(player => ({
    id: player.id,
    nickname: player.nickname,
    status: player.status,
    strikes: player.strikes,
    joinedAt: player.joinedAt.toISOString(),
  }));

  // Enhanced player roster with join timestamps for audio cues
  const playerRoster = game.players.map(player => ({
    id: player.id,
    nickname: player.nickname,
    status: player.status,
    strikes: player.strikes,
    joinedAt: player.joinedAt.toISOString(),
    joinTimestamp: player.joinedAt.getTime(),
  }));

  // Legacy drawn numbers for player app backward compatibility
  const drawnNumbers = game.draws.map(draw => draw.number);

  // Generate QR code data for console (game join URL)
  const qrCode = await qrCodeService.generateGameQRCode(game.pin);
  const currentNumber = drawnNumbers.length ? drawnNumbers[drawnNumbers.length - 1] : undefined;

  // Build audio settings if available
  const audioSettings = game.audioSettings ? {
    countdownEnabled: game.audioSettings.countdownEnabled,
    countdownDurationSeconds: game.audioSettings.countdownDurationSeconds,
    countdownMessage: game.audioSettings.countdownMessage || undefined,
    volumeSettings: game.audioSettings.volumeSettings as Record<string, number>,
    packs: {
      lobbyMusic: game.audioSettings.lobbyMusicPackId || undefined,
      inGameMusic: game.audioSettings.inGameMusicPackId || undefined,
      sfx: game.audioSettings.sfxPackId || undefined,
      voice: game.audioSettings.voicePackId || undefined,
    },
  } : undefined;

  // Build countdown state if active
  const countdownState = (() => {
    const base = {
      active: false,
      startedAt: undefined as string | undefined,
      durationSeconds: game.audioSettings?.countdownDurationSeconds ?? 0,
      message: game.audioSettings?.countdownMessage || undefined,
    };

    if (game.countdownStartAt && game.countdownDurationSeconds) {
      return {
        ...base,
        active: true,
        startedAt: game.countdownStartAt.toISOString(),
        durationSeconds: game.countdownDurationSeconds,
      };
    }

    return base;
  })();

  const payload: StateUpdateData = {
    status: game.status,
    autoDrawEnabled: game.autoDrawEnabled,
    autoDrawIntervalMs: game.autoDrawInterval * 1000,
    pin: game.pin,
    playerCount: players.length,
    currentNumber,
    drawnNumbers,
    winners,
    players,
    qrCode,
    audioSettings,
    countdownState,
    playerRoster,
  };

  await publish(`game:${gameId}`, 'state:update', payload);
}

export async function publishMediaCue(gameId: string, data: MediaCueData): Promise<void> {
  await publish(`game:${gameId}`, 'media:cue', data);
}

// Convenience functions for common audio cues
export async function publishMusicCue(gameId: string, type: 'lobby:start' | 'lobby:stop' | 'in-game:start' | 'in-game:stop', packId?: string): Promise<void> {
  await publishMediaCue(gameId, {
    type: `music:${type}`,
    packId,
    timestamp: Date.now(),
  });
}

export async function publishSfxCue(gameId: string, type: string, packId?: string, data?: Record<string, unknown>): Promise<void> {
  await publishMediaCue(gameId, {
    type: `sfx:${type}`,
    packId,
    timestamp: Date.now(),
    data,
  });
}

export async function publishVoiceCue(gameId: string, cueKey: string, packId?: string, data?: Record<string, unknown>): Promise<void> {
  await publishMediaCue(gameId, {
    type: 'voice:cue',
    packId,
    cueKey,
    timestamp: Date.now(),
    data,
  });
}

export async function publishNumberDrawnCue(gameId: string, letter: string, number: number, packId?: string): Promise<void> {
  await publishVoiceCue(gameId, `${letter}${number}`, packId, {
    letter,
    number,
    fullCall: `${letter}${number}`,
  });
}

export async function publishPlayerJoin(gameId: string, player: any, totalCount: number): Promise<void> {
  const joinedAt = player.joinedAt instanceof Date ? player.joinedAt.toISOString() : (player.joinedAt ?? new Date().toISOString());

  await publish(`game:${gameId}`, 'player:join', {
    player: {
      id: player.id,
      nickname: player.nickname,
      status: player.status,
      strikes: player.strikes ?? 0,
      joinedAt,
    },
    totalCount,
  });

  // Also publish media cue for join sound
  await publishSfxCue(gameId, 'player_join');
}

export async function publishPlayerLeave(gameId: string, playerId: string, totalCount?: number): Promise<void> {
  await publish(`game:${gameId}`, 'player:leave', {
    playerId,
    totalCount,
    leftAt: new Date().toISOString(),
  });
}
