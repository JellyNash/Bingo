import { AnalyticsClient } from './transport';
// Create singleton instance
export const analytics = new AnalyticsClient();
// Helper functions for common events
export const trackGameEvent = {
    created: (gameId, props = {}) => analytics.track('game.created', { gameId, ...props }),
    opened: (gameId, playerId, props = {}) => analytics.track('game.opened', { gameId, playerId, ...props }),
    paused: (gameId, reason) => analytics.track('game.paused', { gameId, reason }),
    autodrawToggled: (gameId, enabled, intervalMs) => analytics.track('game.autodraw.toggled', { gameId, enabled, intervalMs })
};
export const trackDrawEvent = {
    next: (seq, value, latencyMs) => analytics.track('draw.next', { seq, value, latencyMsFromServer: latencyMs })
};
export const trackCardEvent = {
    mark: (position, number, allowed, pattern) => analytics.track('card.mark', { position, number, allowed, pattern }),
    markServer: (position, allowed) => analytics.track('card.mark.server', { position, allowed })
};
export const trackClaimEvent = {
    submitted: (pattern, positions, confidence) => analytics.track('claim.submitted', { pattern, positions, confidence }),
    result: (valid, rank, reason, pattern) => analytics.track('claim.result', { valid, rank, reason, pattern })
};
export const trackSocketEvent = {
    connect: (transport, reconnection, connectionTime) => analytics.track('socket.connect', { transport, reconnection, connectionTime }),
    disconnect: (reason) => analytics.track('socket.disconnect', { reason }),
    reconnect: (attempt, delayMs) => analytics.track('socket.reconnect', { attempt, delayMs })
};
export const trackPWAEvent = {
    install: () => analytics.track('pwa.install', {}),
    offlineHydrate: (fromCache, itemCount) => analytics.track('pwa.offline.hydrate', { fromCache, itemCount })
};
// Default export
export default analytics;
