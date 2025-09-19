import type { BingoCard } from '@prisma/client';
import type { BingoPattern } from '../types/api.js';

export const PATTERNS: Record<BingoPattern, [number, number][]> = {
  ROW_1: Array.from({ length: 5 }, (_, c) => [0, c]),
  ROW_2: Array.from({ length: 5 }, (_, c) => [1, c]),
  ROW_3: Array.from({ length: 5 }, (_, c) => [2, c]),
  ROW_4: Array.from({ length: 5 }, (_, c) => [3, c]),
  ROW_5: Array.from({ length: 5 }, (_, c) => [4, c]),
  COL_1: Array.from({ length: 5 }, (_, r) => [r, 0]),
  COL_2: Array.from({ length: 5 }, (_, r) => [r, 1]),
  COL_3: Array.from({ length: 5 }, (_, r) => [r, 2]),
  COL_4: Array.from({ length: 5 }, (_, r) => [r, 3]),
  COL_5: Array.from({ length: 5 }, (_, r) => [r, 4]),
  DIAGONAL_1: Array.from({ length: 5 }, (_, idx) => [idx, idx]),
  DIAGONAL_2: Array.from({ length: 5 }, (_, idx) => [idx, 4 - idx]),
  FOUR_CORNERS: [
    [0, 0],
    [0, 4],
    [4, 0],
    [4, 4],
  ],
};

export function patternEligible(
  pattern: BingoPattern,
  card: BingoCard,
  drawnNumbers: Set<number>,
): boolean {
  const grid = card.numbers as number[][];
  const marks = card.marks as Record<string, boolean>;
  const cells = PATTERNS[pattern];
  if (!cells) return false;
  return cells.every(([r, c]) => {
    if (r === 2 && c === 2) return true;
    const value = grid[r][c];
    return Boolean(marks[value] && drawnNumbers.has(value));
  });
}

export function eligiblePatterns(card: BingoCard, drawnNumbers: Set<number>): BingoPattern[] {
  return (Object.keys(PATTERNS) as BingoPattern[]).filter((pattern) => patternEligible(pattern, card, drawnNumbers));
}
