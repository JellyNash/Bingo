import { config as dotenvConfig } from 'dotenv';

// Load environment variables from .env.local first, then .env
dotenvConfig({ path: '.env.local' });
dotenvConfig({ path: '.env' });

const required = ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET', 'GAME_SEED_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL!,
  redisUrl: process.env.REDIS_URL!,
  jwtSecret: process.env.JWT_SECRET!,
  gameSeedSecret: process.env.GAME_SEED_SECRET!,
  tokenTtlMin: Number(process.env.TOKEN_TTL_MIN ?? 15),
  rateLimitJoinPerMin: Number(process.env.RATE_LIMIT_JOIN_PER_MIN ?? 5),
  rateLimitClaimPerMin: Number(process.env.RATE_LIMIT_CLAIM_PER_MIN ?? 5),
  rateLimitMarkPerWindow: Number(process.env.RATE_LIMIT_MARK_PER_WINDOW ?? 15),
  rateLimitMarkWindowMs: Number(process.env.RATE_LIMIT_MARK_WINDOW_MS ?? 10_000),
  idempotencyTtlSec: Number(process.env.IDEMP_TTL_SEC ?? 300),
  penaltyStrikes: Number(process.env.PENALTY_STRIKES ?? 3),
  penaltyCooldownMs: Number(process.env.PENALTY_COOLDOWN_MS ?? 30_000),
  rlLockoutMs: Number(process.env.RL_LOCKOUT_MS ?? 120_000),
  eventChannel: process.env.EVENT_CHANNEL ?? 'bingo:events',
  // App URLs for different clients (matching Vite dev server ports)
  playerAppUrl: process.env.PLAYER_APP_URL ?? 'http://localhost:5175',
  screenAppUrl: process.env.SCREEN_APP_URL ?? 'http://localhost:5173',
  consoleAppUrl: process.env.CONSOLE_APP_URL ?? 'http://localhost:5174',
  // GameMaster authentication
  gameMasterPin: process.env.GAMEMASTER_PIN ?? '123456',
  cookieSecret: process.env.COOKIE_SECRET ?? 'dev_only_replace_me',
};

export type AppConfig = typeof config;
