import { setInterval, clearInterval } from 'node:timers';
import { prisma } from './prisma.js';
import { orchestrator } from './orchestrator.adapter.js';
import { publishGameState } from './events.pubsub.js';

const timers = new Map<string, NodeJS.Timeout>();
const inflight = new Set<string>();

async function executeAutoDraw(gameId: string): Promise<void> {
  if (inflight.has(gameId)) return;
  inflight.add(gameId);

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      id: true,
      status: true,
      autoDrawEnabled: true,
    },
  });
  try {
    if (!game || !game.autoDrawEnabled) {
      stopAutoDraw(gameId);
      return;
    }

    if (game.status === 'COMPLETED' || game.status === 'CANCELLED') {
      stopAutoDraw(gameId);
      return;
    }

    if (game.status === 'PAUSED' || game.status === 'LOBBY') {
      // Keep timer alive but do not draw until resumed/opened.
      return;
    }

    if (game.status !== 'ACTIVE' && game.status !== 'OPEN') {
      // Unknown state, stop timer to avoid runaway loop.
      stopAutoDraw(gameId);
      return;
    }

    try {
      await orchestrator.drawNextNumber(gameId, 'AUTO');
      await publishGameState(gameId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === 'Game not found' || message === 'No numbers remaining') {
        stopAutoDraw(gameId);
      }
    }
  } finally {
    inflight.delete(gameId);
  }
}

export function startAutoDraw(gameId: string, intervalMs: number): void {
  stopAutoDraw(gameId);
  if (intervalMs <= 0) return;

  const timer = setInterval(() => {
    void executeAutoDraw(gameId);
  }, intervalMs);

  timers.set(gameId, timer);
}

export function stopAutoDraw(gameId: string): void {
  const timer = timers.get(gameId);
  if (timer) {
    clearInterval(timer);
    timers.delete(gameId);
  }
}

export function isAutoDrawRunning(gameId: string): boolean {
  return timers.has(gameId);
}
