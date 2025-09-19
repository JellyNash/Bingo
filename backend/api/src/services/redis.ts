import { Redis } from "ioredis";
import { config } from "../config.js";

export const redis = new Redis(config.redisUrl);
export const redisPub = new Redis(config.redisUrl);
export const redisSub = new Redis(config.redisUrl);

// simple helpers used by idempotency & rate-limit
export async function setEx(key: string, ttlSec: number, val: string) {
  await redis.set(key, val, "EX", ttlSec);
}

export async function get(key: string) {
  return redis.get(key);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
  strikes?: number;
  lockedUntil?: number;
}

export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  lockoutMs?: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const bucketKey = `rl:${key}`;
  const lockKey = `rl:lock:${key}`;

  if (lockoutMs) {
    const lockedUntil = await redis.get(lockKey);
    if (lockedUntil && Number(lockedUntil) > now) {
      return { allowed: false, remaining: 0, resetMs: Number(lockedUntil) - now, lockedUntil: Number(lockedUntil) };
    }
  }

  const pipeline = redis.pipeline();
  pipeline.incr(bucketKey);
  pipeline.pttl(bucketKey);
  const results = await pipeline.exec();

  if (!results) {
    return { allowed: false, remaining: 0, resetMs: windowMs };
  }

  const count = results[0]?.[1] as number;
  const ttl = results[1]?.[1] as number;

  if (count === 1) {
    await redis.pexpire(bucketKey, windowMs);
  }

  if (count > limit) {
    const resetMs = ttl > 0 ? ttl : windowMs;
    if (lockoutMs) {
      const lockedUntilAt = now + lockoutMs;
      await redis.set(lockKey, String(lockedUntilAt), "PX", lockoutMs);
      return { allowed: false, remaining: 0, resetMs, lockedUntil: lockedUntilAt };
    }
    return { allowed: false, remaining: 0, resetMs };
  }

  const remaining = Math.max(0, limit - count);
  const resetMs = ttl > 0 ? ttl : windowMs;
  return { allowed: true, remaining, resetMs };
}