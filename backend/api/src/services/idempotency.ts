import { redis } from './redis.js';
import { config } from '../config.js';

export interface IdempotencyRecord<T = unknown> {
  statusCode: number;
  body: T;
  headers?: Record<string, string>;
}

export async function getIdempotentResponse<T = unknown>(key: string): Promise<IdempotencyRecord<T> | null> {
  const raw = await redis.get(`idem:${key}`);
  return raw ? (JSON.parse(raw) as IdempotencyRecord<T>) : null;
}

export async function saveIdempotentResponse<T = unknown>(key: string, record: IdempotencyRecord<T>): Promise<void> {
  await redis.set(
    `idem:${key}`,
    JSON.stringify(record),
    'EX',
    config.idempotencyTtlSec
  );
}
