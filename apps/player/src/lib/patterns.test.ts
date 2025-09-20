import { describe, it, expect } from 'vitest';
import {
  checkPattern,
  getWinningPatterns,
  marksToBitmask,
  bitmaskToMarks,
  PATTERNS,
  PATTERN_NAMES,
  getLetterForNumber,
  validatePattern
} from './patterns';

describe('patterns', () => {
  // Helper to create marks Record from positions
  const createMarks = (positions: number[]): Record<number, boolean> => {
    const marks: Record<number, boolean> = {};
    for (let i = 0; i < 25; i++) {
      marks[i] = positions.includes(i);
    }
    marks[12] = true; // FREE space always marked
    return marks;
  };

  describe('checkPattern', () => {
    it('should validate horizontal patterns', () => {
      // Row 1 complete (positions 0-4)
      const marks = createMarks([0, 1, 2, 3, 4]);
      expect(checkPattern(marks, 'ROW_1')).toBe(true);
      expect(checkPattern(marks, 'ROW_2')).toBe(false);
    });

    it('should validate vertical patterns', () => {
      // Column 1 complete (positions 0,5,10,15,20)
      const marks = createMarks([0, 5, 10, 15, 20]);
      expect(checkPattern(marks, 'COL_1')).toBe(true);
      expect(checkPattern(marks, 'COL_2')).toBe(false);
    });

    it('should validate diagonal patterns', () => {
      // Top-left to bottom-right diagonal (positions 0,6,12,18,24)
      const marks = createMarks([0, 6, 12, 18, 24]);
      expect(checkPattern(marks, 'DIAGONAL_1')).toBe(true);

      // Top-right to bottom-left diagonal (positions 4,8,12,16,20)
      const marks2 = createMarks([4, 8, 12, 16, 20]);
      expect(checkPattern(marks2, 'DIAGONAL_2')).toBe(true);
    });

    it('should validate four corners pattern', () => {
      const marks = createMarks([0, 4, 20, 24]);
      expect(checkPattern(marks, 'FOUR_CORNERS')).toBe(true);

      const incomplete = createMarks([4, 20, 24]); // missing position 0
      expect(checkPattern(incomplete, 'FOUR_CORNERS')).toBe(false);
    });
  });

  describe('marksToBitmask', () => {
    it('should convert marks Record to bitmask', () => {
      const marks = createMarks([0, 1, 2, 3, 4]);
      const bitmask = marksToBitmask(marks);
      expect(bitmask & 0b11111).toBe(0b11111); // First 5 positions set
      expect(bitmask & (1 << 12)).toBe(1 << 12); // FREE space set
    });

    it('should handle FREE space at position 12', () => {
      const marks = createMarks([]);
      const bitmask = marksToBitmask(marks);
      expect(bitmask).toBe(1 << 12); // Only position 12 set
    });
  });

  describe('bitmaskToMarks', () => {
    it('should convert bitmask to marks Record', () => {
      const bitmask = 0b11111; // First 5 positions
      const marks = bitmaskToMarks(bitmask);
      expect(marks[0]).toBe(true);
      expect(marks[1]).toBe(true);
      expect(marks[2]).toBe(true);
      expect(marks[3]).toBe(true);
      expect(marks[4]).toBe(true);
      expect(marks[5]).toBe(false);
      expect(marks[12]).toBe(true); // FREE always true
    });
  });

  describe('getWinningPatterns', () => {
    it('should return empty array when no patterns match', () => {
      const noMarks = createMarks([1, 3, 5]); // Random marks
      expect(getWinningPatterns(noMarks)).toEqual([]);
    });

    it('should identify single winning pattern', () => {
      // Just row 1
      const marks = createMarks([0, 1, 2, 3, 4]);
      const patterns = getWinningPatterns(marks);
      expect(patterns).toContain('ROW_1');
      expect(patterns).toHaveLength(1);
    });

    it('should identify multiple winning patterns', () => {
      // Full house includes all patterns
      const fullHouse = createMarks(Array.from({ length: 25 }, (_, i) => i));
      const patterns = getWinningPatterns(fullHouse);

      // Should have all horizontals, verticals, diagonals, and corners
      expect(patterns).toContain('ROW_1');
      expect(patterns).toContain('COL_1');
      expect(patterns).toContain('DIAGONAL_1');
      expect(patterns).toContain('FOUR_CORNERS');
      expect(patterns.length).toBeGreaterThan(10);
    });

    it('should not duplicate patterns in results', () => {
      const marks = createMarks(Array.from({ length: 25 }, (_, i) => i));
      const patterns = getWinningPatterns(marks);
      const uniquePatterns = [...new Set(patterns)];
      expect(patterns).toEqual(uniquePatterns);
    });
  });

  describe('PATTERNS constant', () => {
    it('should have correct pattern definitions', () => {
      expect(PATTERNS['ROW_1']).toBe(0b00000_00000_00000_00000_11111);
      expect(PATTERNS['COL_1']).toBe(0b00001_00001_00001_00001_00001);
      expect(PATTERNS['DIAGONAL_1']).toBe(0b10000_01000_00100_00010_00001);
      expect(PATTERNS['FOUR_CORNERS']).toBe(0b10001_00000_00000_00000_10001);
    });
  });

  describe('PATTERN_NAMES constant', () => {
    it('should have user-friendly names for all patterns', () => {
      expect(PATTERN_NAMES['ROW_1']).toBe('Row 1');
      expect(PATTERN_NAMES['COL_1']).toBe('Column B');
      expect(PATTERN_NAMES['DIAGONAL_1']).toBe('Diagonal (\\)');
      expect(PATTERN_NAMES['DIAGONAL_2']).toBe('Diagonal (/)');
      expect(PATTERN_NAMES['FOUR_CORNERS']).toBe('Four Corners');
    });
  });

  describe('validatePattern (legacy)', () => {
    it('should validate patterns using bitmask input', () => {
      const marks = 0b00000_00000_00000_00000_11111 | (1 << 12); // Row 1 + FREE
      expect(validatePattern(marks, 'ROW_1')).toBe(true);
      expect(validatePattern(marks, 'ROW_2')).toBe(false);
    });
  });

  describe('getLetterForNumber', () => {
    it('should return correct letter for number ranges', () => {
      expect(getLetterForNumber(1)).toBe('B');
      expect(getLetterForNumber(15)).toBe('B');
      expect(getLetterForNumber(16)).toBe('I');
      expect(getLetterForNumber(30)).toBe('I');
      expect(getLetterForNumber(31)).toBe('N');
      expect(getLetterForNumber(45)).toBe('N');
      expect(getLetterForNumber(46)).toBe('G');
      expect(getLetterForNumber(60)).toBe('G');
      expect(getLetterForNumber(61)).toBe('O');
      expect(getLetterForNumber(75)).toBe('O');
    });
  });
});