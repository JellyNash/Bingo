import { describe, it, expect } from 'vitest';
import {
  checkPattern,
  getWinningPatterns,
  getMarkBitmask,
  PATTERNS,
  PATTERN_NAMES,
  getLetterForNumber
} from './patterns';

describe('patterns', () => {
  // Helper to create marks Record from positions
  const createMarks = (positions: number[]): Record<number, boolean> => {
    const marks: Record<number, boolean> = {};
    for (let i = 0; i < 25; i++) {
      marks[i] = positions.includes(i);
    }
    return marks;
  };

  describe('checkPattern', () => {
    it('should validate horizontal patterns', () => {
      // Row 0 complete (positions 0-4)
      const marks = createMarks([0, 1, 2, 3, 4]);
      expect(checkPattern(marks, 'H1')).toBe(true);
      expect(checkPattern(marks, 'H2')).toBe(false);
    });

    it('should validate vertical patterns', () => {
      // Column 0 complete (positions 0,5,10,15,20)
      const marks = createMarks([0, 5, 10, 15, 20]);
      expect(checkPattern(marks, 'V1')).toBe(true);
      expect(checkPattern(marks, 'V2')).toBe(false);
    });

    it('should validate diagonal patterns', () => {
      // Top-left to bottom-right diagonal (positions 0,6,12,18,24)
      const marks = createMarks([0, 6, 12, 18, 24]);
      expect(checkPattern(marks, 'D1')).toBe(true);

      // Top-right to bottom-left diagonal (positions 4,8,12,16,20)
      const marks2 = createMarks([4, 8, 12, 16, 20]);
      expect(checkPattern(marks2, 'D2')).toBe(true);
    });

    it('should validate four corners pattern', () => {
      const marks = createMarks([0, 4, 20, 24]);
      expect(checkPattern(marks, 'CORNERS')).toBe(true);

      const incomplete = createMarks([4, 20, 24]); // missing position 0
      expect(checkPattern(incomplete, 'CORNERS')).toBe(false);
    });

    it('should validate full house pattern', () => {
      const fullHouse = createMarks(Array.from({ length: 25 }, (_, i) => i));
      expect(checkPattern(fullHouse, 'FULL')).toBe(true);

      const almostFull = createMarks(Array.from({ length: 24 }, (_, i) => i));
      expect(checkPattern(almostFull, 'FULL')).toBe(false);
    });
  });

  describe('getMarkBitmask', () => {
    it('should convert marks Record to bitmask', () => {
      const marks = createMarks([0, 1, 2, 3, 4]);
      const bitmask = getMarkBitmask(marks);
      expect(bitmask).toBe(0b11111); // First 5 positions set
    });

    it('should handle FREE space at position 12', () => {
      const marks = createMarks([12]);
      const bitmask = getMarkBitmask(marks);
      expect(bitmask).toBe(0b1000000000000); // Position 12 set
    });
  });

  describe('getWinningPatterns', () => {
    it('should return empty array when no patterns match', () => {
      const noMarks = createMarks([]);
      expect(getWinningPatterns(noMarks)).toEqual([]);
    });

    it('should identify single winning pattern', () => {
      // Just row 0
      const marks = createMarks([0, 1, 2, 3, 4]);
      const patterns = getWinningPatterns(marks);
      expect(patterns).toContain('H1');
      expect(patterns).toHaveLength(1);
    });

    it('should identify multiple winning patterns', () => {
      // Full house includes all patterns
      const fullHouse = createMarks(Array.from({ length: 25 }, (_, i) => i));
      const patterns = getWinningPatterns(fullHouse);

      // Should have all horizontals, verticals, diagonals, corners, and full house
      expect(patterns).toContain('H1');
      expect(patterns).toContain('V1');
      expect(patterns).toContain('D1');
      expect(patterns).toContain('CORNERS');
      expect(patterns).toContain('FULL');
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
      expect(PATTERNS.H1).toBe(0b00000_00000_00000_00000_11111);
      expect(PATTERNS.V1).toBe(0b00001_00001_00001_00001_00001);
      expect(PATTERNS.D1).toBe(0b00001_00010_00100_01000_10000);
      expect(PATTERNS.CORNERS).toBe(0b10001_00000_00000_00000_10001);
      expect(PATTERNS.FULL).toBe(0b11111_11111_11111_11111_11111);
    });
  });

  describe('PATTERN_NAMES constant', () => {
    it('should have user-friendly names for all patterns', () => {
      expect(PATTERN_NAMES.H1).toBe('Row 1');
      expect(PATTERN_NAMES.V1).toBe('Column B');
      expect(PATTERN_NAMES.D1).toBe('Diagonal (\\)');
      expect(PATTERN_NAMES.D2).toBe('Diagonal (/)');
      expect(PATTERN_NAMES.CORNERS).toBe('Four Corners');
      expect(PATTERN_NAMES.FULL).toBe('Full House');
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