import type { BingoPattern } from './api';

// Pattern bitmasks matching server/orchestrator semantics
export const PATTERNS: Record<BingoPattern, number> = {
  // Rows
  'ROW_1': 0b0000000000000000000011111,
  'ROW_2': 0b0000000000000001111100000,
  'ROW_3': 0b0000000000111110000000000, // Includes FREE center
  'ROW_4': 0b0000011111000000000000000,
  'ROW_5': 0b1111100000000000000000000,

  // Columns
  'COL_1': 0b0000100001000010000100001,
  'COL_2': 0b0001000010000100001000010,
  'COL_3': 0b0010000100001000010000100, // Includes FREE center
  'COL_4': 0b0100001000010000100001000,
  'COL_5': 0b1000010000100001000010000,

  // Diagonals
  'DIAGONAL_1': 0b1000001000001000001000001, // Top-left to bottom-right
  'DIAGONAL_2': 0b100010001000100010000, // Top-right to bottom-left

  // Four corners
  'FOUR_CORNERS': 0b1000100000000000000010001,
};

// User-friendly names for display
export const PATTERN_NAMES: Record<BingoPattern, string> = {
  'ROW_1': 'Row 1',
  'ROW_2': 'Row 2',
  'ROW_3': 'Row 3',
  'ROW_4': 'Row 4',
  'ROW_5': 'Row 5',
  'COL_1': 'Column B',
  'COL_2': 'Column I',
  'COL_3': 'Column N',
  'COL_4': 'Column G',
  'COL_5': 'Column O',
  'DIAGONAL_1': 'Diagonal (\\)',
  'DIAGONAL_2': 'Diagonal (/)',
  'FOUR_CORNERS': 'Four Corners',
};

// Convert marks Record to bitmask
export function marksToBitmask(marks: Record<number, boolean>): number {
  let mask = 0;
  for (let i = 0; i < 25; i++) {
    if (i === 12 || marks[i]) {
      // Center (position 12) is always marked (FREE)
      mask |= (1 << i);
    }
  }
  return mask;
}

// Convert bitmask to marks Record
export function bitmaskToMarks(mask: number): Record<number, boolean> {
  const marks: Record<number, boolean> = {};
  for (let i = 0; i < 25; i++) {
    marks[i] = Boolean(mask & (1 << i));
  }
  marks[12] = true; // FREE space always marked
  return marks;
}

// Check if marks match a pattern
export function checkPattern(marks: Record<number, boolean>, pattern: BingoPattern): boolean {
  const markMask = marksToBitmask(marks);
  const patternMask = PATTERNS[pattern];
  return (markMask & patternMask) === patternMask;
}

// Get all winning patterns for current marks
export function getWinningPatterns(marks: Record<number, boolean>): BingoPattern[] {
  const winning: BingoPattern[] = [];

  for (const pattern of Object.keys(PATTERNS) as BingoPattern[]) {
    if (checkPattern(marks, pattern)) {
      winning.push(pattern);
    }
  }

  return winning;
}

// Legacy compatibility - convert marks as number to Record
export function validatePattern(marks: number, pattern: BingoPattern): boolean {
  const marksRecord = bitmaskToMarks(marks);
  return checkPattern(marksRecord, pattern);
}

// Get letter for a Bingo number
export function getLetterForNumber(num: number): 'B' | 'I' | 'N' | 'G' | 'O' {
  if (num <= 15) return 'B';
  if (num <= 30) return 'I';
  if (num <= 45) return 'N';
  if (num <= 60) return 'G';
  return 'O';
}