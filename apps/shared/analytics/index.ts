import { AnalyticsClient } from './transport';

// Create singleton instance
export const analytics = new AnalyticsClient();

// Re-export types
export type {
  AnalyticsConfig,
  AnalyticsContext,
  AnalyticsEvent,
  PrivacySettings
} from './types';

// Helper functions for common events
export const trackGameEvent = {
  created: (gameId: string, props = {}) =>
    analytics.track('game.created', { gameId, ...props }),
  
  opened: (gameId: string, playerId: string, props = {}) =>
    analytics.track('game.opened', { gameId, playerId, ...props }),
  
  paused: (gameId: string, reason?: string) =>
    analytics.track('game.paused', { gameId, reason }),
  
  autodrawToggled: (gameId: string, enabled: boolean, intervalMs?: number) =>
    analytics.track('game.autodraw.toggled', { gameId, enabled, intervalMs })
};

export const trackDrawEvent = {
  next: (seq: number, value: number, latencyMs?: number) =>
    analytics.track('draw.next', { seq, value, latencyMsFromServer: latencyMs })
};

export const trackCardEvent = {
  mark: (position: number, number: number, allowed: boolean, pattern?: string) =>
    analytics.track('card.mark', { position, number, allowed, pattern }),
  
  markServer: (position: number, allowed: boolean) =>
    analytics.track('card.mark.server', { position, allowed })
};

export const trackClaimEvent = {
  submitted: (pattern: string, positions?: number[], confidence?: number) =>
    analytics.track('claim.submitted', { pattern, positions, confidence }),
  
  result: (valid: boolean, rank?: number, reason?: string, pattern?: string) =>
    analytics.track('claim.result', { valid, rank, reason, pattern })
};

export const trackSocketEvent = {
  connect: (transport?: string, reconnection?: boolean, connectionTime?: number) =>
    analytics.track('socket.connect', { transport, reconnection, connectionTime }),
  
  disconnect: (reason: string) =>
    analytics.track('socket.disconnect', { reason }),
  
  reconnect: (attempt: number, delayMs: number) =>
    analytics.track('socket.reconnect', { attempt, delayMs })
};

export const trackPWAEvent = {
  install: () => analytics.track('pwa.install', {}),
  
  offlineHydrate: (fromCache: boolean, itemCount?: number) =>
    analytics.track('pwa.offline.hydrate', { fromCache, itemCount })
};

// Default export
export default analytics;