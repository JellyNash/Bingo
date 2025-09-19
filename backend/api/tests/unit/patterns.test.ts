import { describe, it, expect } from 'vitest';
import { eligiblePatterns } from '../../src/utils/patterns.js';

describe('eligiblePatterns', () => {
  it('returns row pattern when fully marked', () => {
    const card = {
      numbers: [
        [1, 16, 31, 46, 61],
        [2, 17, 32, 47, 62],
        [3, 18, 0, 48, 63],
        [4, 19, 33, 49, 64],
        [5, 20, 34, 50, 65],
      ],
      marks: {
        1: true,
        16: true,
        31: true,
        46: true,
        61: true,
        FREE: true,
      },
    } as any;
    const drawn = new Set([1, 16, 31, 46, 61, 0]);
    const patterns = eligiblePatterns(card, drawn);
    expect(patterns).toContain('ROW_1');
  });
});
