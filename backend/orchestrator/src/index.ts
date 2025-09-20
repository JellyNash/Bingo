/**
 * Orchestrator public API — pure functions + small helpers.
 * All randomness derives from an HMAC-SHA256 seed: seed = HMAC(secret, gameId|nonce)
 */
import { createHmac, randomBytes } from "node:crypto";

// ---------- Types ----------
export type GameId = string;
export type PlayerId = string;
export type CardId = string;

export type SeedMaterial = { secret: string; gameId: GameId; nonce?: string };
export type PRNG = () => number; // returns float in [0,1)

export type DrawState = {
  // 1..75 inclusive, already drawn in order
  history: number[];
  // remaining numbers not yet drawn (set for O(1) membership and array for shuffle)
  remaining: number[];
  // optional pre-shuffled deck (length 75); if present, index = history.length
  deck?: number[];
};

export type CardLayout = {
  id: CardId;
  grid: number[]; // 25 numbers; center index 12 is 0 for FREE (or keep original number with a flag)
  freeCenter: boolean;
  signature: string; // HMAC binding (gameId|playerId|grid)
};

export type Patterns = Record<string, number>; // bitmask: 25-bit LSB=cell0

export type ClaimCheck = {
  cardMask: number;      // player-marked cells bitmask
  winningPattern?: string;
};

export type PenaltyPolicy = {
  strikesAllowed: number;      // e.g. 3
  cooldownMs: number;          // e.g. 30000
  rateLimitLockoutMs: number;  // e.g. 120000 after RL violation
};

export type ClaimResult =
  | { result: "approved"; pattern: string; rank?: number }
  | { result: "denied"; reason: string; penalty?: { strikes: number; cooldownMs: number } };

// ---------- Utilities (seeded PRNG) ----------
export function deriveSeedHex({ secret, gameId, nonce }: SeedMaterial): string {
  const n = nonce ?? randomBytes(16).toString("hex");
  return createHmac("sha256", Buffer.from(secret, "utf8"))
    .update(`${gameId}|${n}`, "utf8")
    .digest("hex");
}

export function prngFromSeedHex(seedHex: string): PRNG {
  // xorshift128+ seeded from 128 bits of the hex
  // (deterministic and fast; not crypto-strong — crypto is only for seed)
  const h = BigInt("0x" + seedHex.padStart(32, "0").slice(0, 32));
  let s0 = (h ^ 0x9e3779b97f4a7c15n) & ((1n << 64n) - 1n);
  let s1 = (h >> 64n) ^ 0x243f6a8885a308d3n;
  if (s0 === 0n && s1 === 0n) s1 = 1n;
  return () => {
    let x = s0;
    const y = s1;
    s0 = y;
    x ^= x << 23n;
    s1 = x ^ y ^ (x >> 17n) ^ (y >> 26n);
    const t = (s1 + y) & ((1n << 64n) - 1n);
    // 53-bit mantissa
    return Number(t >> 11n) / 2 ** 53;
  };
}

// ---------- Deck & Draws ----------
export function newShuffledDeck(prng: PRNG): number[] {
  const arr = Array.from({ length: 75 }, (_, i) => i + 1);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function initDrawState(deck?: number[]): DrawState {
  return { history: [], remaining: deck ? [] : Array.from({ length: 75 }, (_, i) => i + 1), deck };
}

export function drawNext(state: DrawState, prng?: PRNG): { number?: number; state: DrawState } {
  if (state.history.length >= 75) return { number: undefined, state };
  let n: number | undefined;
  if (state.deck && state.deck.length) {
    n = state.deck[state.history.length];
  } else {
    if (!prng) {
      throw new Error('Deterministic PRNG required when deck is not provided');
    }
    const idx = Math.floor(prng() * state.remaining.length);
    n = state.remaining[idx];
    state.remaining.splice(idx, 1);
  }
  state.history.push(n!);
  return { number: n, state };
}

// ---------- Card generation ----------
const COLS: Record<number, [number, number]> = {
  0: [1, 15],
  1: [16, 30],
  2: [31, 45],
  3: [46, 60],
  4: [61, 75]
};

export function generateCard(gameId: GameId, playerId: PlayerId, secret: string, prng: PRNG): CardLayout {
  const grid: number[] = new Array(25).fill(0);
  for (let c = 0; c < 5; c++) {
    const [lo, hi] = COLS[c];
    const pool = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
    // pick 5 numbers per col, except N column (index 2) picks 4 numbers (center is FREE)
    const take = c === 2 ? 4 : 5;
    for (let k = 0; k < take; k++) {
      const idx = Math.floor(prng() * pool.length);
      const val = pool[idx];
      pool.splice(idx, 1);
      const r = c === 2 && k >= 2 ? k + 1 : k; // skip center row position fill
      grid[r * 5 + c] = val;
    }
  }
  const freeCenter = true;
  // center index 12 — optional: set 0 to represent FREE
  grid[12] = 0;

  const signature = createHmac("sha256", Buffer.from(secret, "utf8"))
    .update(`${gameId}|${playerId}|${grid.join(",")}`, "utf8")
    .digest("hex");

  return { id: `${gameId}:${playerId}`, grid, freeCenter, signature };
}

// ---------- Patterns ----------
export function standardPatterns(): Patterns {
  const masks: Patterns = {};
  // rows
  for (let r = 0; r < 5; r++) {
    let m = 0;
    for (let c = 0; c < 5; c++) {
      const idx = r * 5 + c;
      if (idx === 12) continue; // center free
      m |= 1 << idx;
    }
    masks[`row${r + 1}`] = m;
  }
  // cols
  for (let c = 0; c < 5; c++) {
    let m = 0;
    for (let r = 0; r < 5; r++) {
      const idx = r * 5 + c;
      if (idx === 12) continue;
      m |= 1 << idx;
    }
    masks[`col${c + 1}`] = m;
  }
  // diagonals
  let d1 = 0, d2 = 0;
  for (let i = 0; i < 5; i++) {
    const idx1 = i * 5 + i;
    const idx2 = i * 5 + (4 - i);
    if (idx1 !== 12) d1 |= 1 << idx1;
    if (idx2 !== 12) d2 |= 1 << idx2;
  }
  masks["diag1"] = d1;
  masks["diag2"] = d2;
  // four corners (indexes: 0,4,20,24)
  masks["fourCorners"] = (1 << 0) | (1 << 4) | (1 << 20) | (1 << 24);
  return masks;
}

// Compute mark bitmask from card + drawn numbers (server-authoritative)
export function marksFromDraws(card: CardLayout, drawn: Set<number>): number {
  let mask = 0;
  for (let i = 0; i < 25; i++) {
    if (i === 12) continue; // free center is always considered marked
    if (drawn.has(card.grid[i])) mask |= 1 << i;
  }
  return mask;
}

export function validateClaim(cardMask: number, patterns: Patterns): ClaimCheck {
  for (const [name, mask] of Object.entries(patterns)) {
    if ( (cardMask & mask) === mask ) {
      return { cardMask, winningPattern: name };
    }
  }
  return { cardMask };
}

// ---------- Penalties ----------
export function applyPenalty(currentStrikes: number, policy: PenaltyPolicy): { strikes: number; cooldownMs: number } {
  const strikes = Math.min(currentStrikes + 1, policy.strikesAllowed);
  const cooldownMs = policy.cooldownMs;
  return { strikes, cooldownMs };
}
