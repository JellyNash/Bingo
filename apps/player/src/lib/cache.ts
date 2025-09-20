export type CachedSnapshot = {
  gameId: string;
  cardId: string;
  nickname: string;
  grid: number[][];
  marks: Record<number, boolean>;
  drawn: number[];            // called numbers
  winners: { playerId: string; nickname: string; rank: number; pattern: string }[];
  savedAt: number;            // timestamp when cached
};

const KEY = (gameId: string, cardId: string) => `player:snap:${gameId}:${cardId}`;

export function saveSnapshot(snap: Omit<CachedSnapshot, 'savedAt'>) {
  try {
    const cached: CachedSnapshot = { ...snap, savedAt: Date.now() };
    localStorage.setItem(KEY(snap.gameId, snap.cardId), JSON.stringify(cached));
  } catch {}
}

export function loadSnapshot(gameId: string, cardId: string, maxAgeMs = 86_400_000): CachedSnapshot | null {
  try {
    const raw = localStorage.getItem(KEY(gameId, cardId));
    if (!raw) return null;

    const cached: CachedSnapshot = JSON.parse(raw);

    // Check if cache is expired (default 24h)
    if (Date.now() - cached.savedAt > maxAgeMs) {
      localStorage.removeItem(KEY(gameId, cardId));
      return null;
    }

    return cached;
  } catch {
    return null;
  }
}

export function hasSnapshot(gameId: string, cardId: string) {
  try {
    return localStorage.getItem(KEY(gameId, cardId)) != null;
  } catch {
    return false;
  }
}

export function clearSnapshotsPrefix(prefix = 'player:snap:') {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(prefix))
      .forEach(k => localStorage.removeItem(k));
  } catch {}
}

// Prune expired snapshots on boot
export function pruneExpiredSnapshots(maxAgeMs = 86_400_000) {
  try {
    const now = Date.now();
    Object.keys(localStorage)
      .filter(k => k.startsWith('player:snap:'))
      .forEach(k => {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const cached: CachedSnapshot = JSON.parse(raw);
            if (now - cached.savedAt > maxAgeMs) {
              localStorage.removeItem(k);
            }
          }
        } catch {
          // Invalid cache entry, remove it
          localStorage.removeItem(k);
        }
      });
  } catch {}
}