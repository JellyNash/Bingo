import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BASE = process.env.PUBLIC_BASE_URL || 'http://localhost:4000';
const ANALYTICS_URL = `${BASE}/analytics/events`;
const ENABLED = process.env.ANALYTICS_ENABLED === 'true';
const APP = process.env.SERVICE_NAME || 'api';
const ENV = process.env.SERVICE_ENV || 'offline';
const HMAC_KEY = process.env.ANALYTICS_HMAC_KEY || '';

interface AnalyticsPayload {
  [key: string]: unknown;
}

interface AnalyticsContext {
  gameId?: string;
  playerId?: string;
  cardId?: string;
  sessionId?: string;
  [key: string]: unknown;
}

/**
 * Track server-side analytics events
 */
export async function trackServer(
  name: string,
  payload: AnalyticsPayload = {},
  context: AnalyticsContext = {}
): Promise<void> {
  if (!ENABLED) return;

  const event = {
    id: crypto.randomUUID(),
    ts: Date.now(),
    app: APP,
    name,
    env: ENV,
    gameId: context.gameId,
    playerId: context.playerId,
    cardId: context.cardId,
    sessionId: context.sessionId,
    ctx: {
      source: 'server',
      version: process.env.npm_package_version || 'unknown'
    },
    props: payload
  };

  try {
    // For server-side events, we can write directly to DB
    // This avoids network overhead and ensures reliability
    await prisma.analyticsEventRaw.create({
      data: {
        id: event.id,
        ts: new Date(event.ts),
        app: event.app,
        name: event.name,
        gameId: event.gameId ?? null,
        playerId: event.playerId ?? null,
        cardId: event.cardId ?? null,
        sessionId: event.sessionId ?? null,
        env: event.env,
        traceId: null,
        dnt: false,
        ctx: event.ctx,
        props: event.props,
        sigValid: null // Server events are trusted
      }
    });
  } catch (err) {
    console.error('[Analytics] Server tracking error:', err);
    // Don't throw - analytics should never break the app
  }
}

/**
 * Track API request metrics
 */
export function trackApiRequest(
  route: string,
  method: string,
  status: number,
  durMs: number,
  context: AnalyticsContext = {}
): void {
  // Apply sampling for high-volume endpoint
  const sampling = Number(process.env.ANALYTICS_SAMPLING_API_REQUEST || '0.1');
  if (Math.random() > sampling) return;

  trackServer('api.request', {
    route,
    method,
    status,
    durMs,
    error: status >= 400 ? true : undefined
  }, context);
}

/**
 * Track game events
 */
export const trackGame = {
  created: (gameId: string, createdBy?: string) => {
    trackServer('game.created', { createdBy }, { gameId });
  },

  opened: (gameId: string, playerId: string) => {
    trackServer('game.opened', {}, { gameId, playerId });
  },

  paused: (gameId: string, pausedBy: string, reason?: string) => {
    trackServer('game.paused', { pausedBy, reason }, { gameId });
  },

  autodrawToggled: (gameId: string, enabled: boolean, intervalMs: number) => {
    trackServer('game.autodraw.toggled', { enabled, intervalMs }, { gameId });
  }
};

/**
 * Track draw events
 */
export const trackDraw = {
  next: (gameId: string, seq: number, value: number, auto: boolean = false) => {
    trackServer('draw.next', { seq, value, auto }, { gameId });
  },

  undo: (gameId: string, seq: number) => {
    trackServer('draw.undo', { seq }, { gameId });
  }
};

/**
 * Track claim events
 */
export const trackClaim = {
  submitted: (
    gameId: string,
    playerId: string,
    cardId: string,
    pattern: string
  ) => {
    trackServer('claim.submitted', { pattern }, { gameId, playerId, cardId });
  },

  result: (
    gameId: string,
    playerId: string,
    cardId: string,
    valid: boolean,
    rank?: number,
    reason?: string
  ) => {
    trackServer('claim.result', {
      valid,
      rank,
      reason
    }, { gameId, playerId, cardId });
  }
};

/**
 * Track penalty events
 */
export const trackPenalty = {
  applied: (
    gameId: string,
    playerId: string,
    type: string,
    strikes: number,
    cooldownMs?: number
  ) => {
    trackServer('penalty.applied', {
      type,
      strikes,
      cooldownMs
    }, { gameId, playerId });
  }
};

/**
 * Track real-time events (for Socket.IO)
 */
export const trackRealtime = {
  emit: (event: string, gameId?: string, delivered: boolean = true) => {
    trackServer('realtime.emit', { event, delivered }, { gameId });
  },

  connect: (socketId: string, namespace: string, gameId?: string) => {
    trackServer('socket.connect', { socketId, namespace }, { gameId });
  },

  disconnect: (socketId: string, reason: string, gameId?: string) => {
    trackServer('socket.disconnect', { socketId, reason }, { gameId });
  },

  reconnect: (socketId: string, attempt: number, gameId?: string) => {
    trackServer('socket.reconnect', { socketId, attempt }, { gameId });
  }
};

/**
 * Create Fastify hooks for automatic request tracking
 */
export function createAnalyticsHooks() {
  return {
    onRequest: async (request: any, reply: any) => {
      // Store request start time
      request.analyticsStart = Date.now();
    },

    onResponse: async (request: any, reply: any) => {
      if (!ENABLED) return;

      const durMs = Date.now() - (request.analyticsStart || Date.now());
      const route = request.routeConfig?.url || request.url;
      const method = request.method;
      const status = reply.statusCode;

      // Extract context from request
      const context: AnalyticsContext = {};
      if (request.params?.gameId) context.gameId = request.params.gameId;
      if (request.params?.playerId) context.playerId = request.params.playerId;
      if (request.body?.gameId) context.gameId = request.body.gameId;
      if (request.body?.playerId) context.playerId = request.body.playerId;

      trackApiRequest(route, method, status, durMs, context);
    }
  };
}