import { gameMasterSessionService } from './gamemaster-session.js';

class SessionCleanupService {
  private interval: NodeJS.Timeout | null = null;
  private readonly intervalMs = 60 * 60 * 1000;

  start() {
    if (this.interval) return;

    const run = async () => {
      try {
        const removed = await gameMasterSessionService.cleanupExpiredSessions();
        if (removed > 0) {
          console.log(`Session cleanup removed ${removed} expired GameMaster sessions`);
        }
      } catch (error) {
        console.error('Session cleanup failed:', error);
      }
    };

    run().catch(() => {});
    this.interval = setInterval(run, this.intervalMs);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

export const sessionCleanupService = new SessionCleanupService();
