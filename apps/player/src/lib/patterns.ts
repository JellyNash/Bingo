// Pattern validation using bitmasks
// Same semantics as orchestrator

export const PATTERNS = {
  // Rows
  ROW1: 0b0000000000000000000011111,
  ROW2: 0b0000000000000001111100000,
  ROW3: 0b0000000000111110000000000, // Includes FREE center
  ROW4: 0b0000011111000000000000000,
  ROW5: 0b1111100000000000000000000,

  // Columns
  COL1: 0b0000100001000010000100001,
  COL2: 0b0001000010000100001000010,
  COL3: 0b0010000100001000010000100, // Includes FREE center
  COL4: 0b0100001000010000100001000,
  COL5: 0b1000010000100001000010000,

  // Diagonals
  DIAG1: 0b1000001000001000001000001, // Top-left to bottom-right
  DIAG2: 0b0000110001010001100010000, // Top-right to bottom-left

  // Four corners
  FOUR_CORNERS: 0b1000110000000000000010001,
} as const;

export const PATTERN_NAMES: Record<keyof typeof PATTERNS, string> = {
  ROW1: 'Row 1',
  ROW2: 'Row 2',
  ROW3: 'Row 3',
  ROW4: 'Row 4',
  ROW5: 'Row 5',
  COL1: 'Column B',
  COL2: 'Column I',
  COL3: 'Column N',
  COL4: 'Column G',
  COL5: 'Column O',
  DIAG1: 'Diagonal ↘',
  DIAG2: 'Diagonal ↙',
  FOUR_CORNERS: 'Four Corners',
};

export function getMarkBitmask(marks: Record<number, boolean>): number {
  let mask = 0;

  for (let i = 0; i < 25; i++) {
    if (i === 12 || marks[i]) {
      // Center is always marked (FREE)
      mask |= (1 << i);
    }
  }

  return mask;
}

export function checkPattern(marks: Record<number, boolean>, pattern: keyof typeof PATTERNS): boolean {
  const markMask = getMarkBitmask(marks);
  const patternMask = PATTERNS[pattern];

  return (markMask & patternMask) === patternMask;
}

export function getWinningPatterns(marks: Record<number, boolean>): Array<keyof typeof PATTERNS> {
  const winning: Array<keyof typeof PATTERNS> = [];

  for (const pattern of Object.keys(PATTERNS) as Array<keyof typeof PATTERNS>) {
    if (checkPattern(marks, pattern)) {
      winning.push(pattern);
    }
  }

  return winning;
}

export function getLetterForNumber(num: number): 'B' | 'I' | 'N' | 'G' | 'O' {
  if (num <= 15) return 'B';
  if (num <= 30) return 'I';
  if (num <= 45) return 'N';
  if (num <= 60) return 'G';
  return 'O';
}