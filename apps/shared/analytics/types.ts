export type AnalyticsApp = 'player' | 'console' | 'screen' | 'api' | 'realtime';
export type AnalyticsEnv = 'offline' | 'cloud';

export interface AnalyticsContext {
  gameId?: string;
  playerId?: string;
  cardId?: string;
  sessionId?: string;
  env?: AnalyticsEnv;
  traceId?: string;
}

export interface AnalyticsEvent {
  id: string;
  ts: number;
  app: AnalyticsApp;
  name: string;
  gameId?: string;
  playerId?: string;
  cardId?: string;
  sessionId?: string;
  env?: AnalyticsEnv;
  traceId?: string;
  dnt?: boolean;
  ctx?: Record<string, unknown>;
  props?: Record<string, unknown>;
}

export interface AnalyticsConfig {
  baseUrl: string;
  app: 'player' | 'console' | 'screen';
  flushInterval?: number;
  maxBatch?: number;
  hmacKey?: string;
  env?: AnalyticsEnv;
  dntRespect?: boolean;
  enabled?: boolean;
  debug?: boolean;
}

export interface QueuedEvent extends AnalyticsEvent {
  retries?: number;
  queuedAt: number;
}

// Privacy-related types
export interface PrivacySettings {
  optOut: boolean;
  dnt: boolean;
  consentGiven?: boolean;
  consentTimestamp?: number;
}

// Metric types for rollups
export interface Metric {
  name: string;
  value: number;
  dimensions?: Record<string, string | number>;
  timestamp: Date;
}