import { describe, it, expect } from "vitest";
import {
  deriveSeedHex,
  prngFromSeedHex,
  newShuffledDeck,
  initDrawState,
  drawNext,
  generateCard,
  standardPatterns,
  marksFromDraws,
  validateClaim,
  applyPenalty,
} from "../src/index.js";

describe("Comprehensive Orchestrator Tests", () => {
  describe("Determinism", () => {
    it("same seed produces identical deck and card layouts", () => {
      const secret = "test-secret";
      const gameId = "test-game";
      const nonce = "fixed-nonce";

      // Generate first set
      const seed1 = deriveSeedHex({ secret, gameId, nonce });
      const prng1 = prngFromSeedHex(seed1);
      const deck1 = newShuffledDeck(prng1);
      const prng1b = prngFromSeedHex(seed1);
      const card1 = generateCard(gameId, "player1", secret, prng1b);

      // Generate second set with same seed
      const seed2 = deriveSeedHex({ secret, gameId, nonce });
      const prng2 = prngFromSeedHex(seed2);
      const deck2 = newShuffledDeck(prng2);
      const prng2b = prngFromSeedHex(seed2);
      const card2 = generateCard(gameId, "player1", secret, prng2b);

      expect(seed1).toBe(seed2);
      expect(deck1).toEqual(deck2);
      expect(card1.grid).toEqual(card2.grid);
      expect(card1.signature).toBe(card2.signature);
    });

    it("different seeds produce different decks", () => {
      const secret = "test-secret";
      const seed1 = deriveSeedHex({ secret, gameId: "game1", nonce: "nonce1" });
      const seed2 = deriveSeedHex({ secret, gameId: "game2", nonce: "nonce2" });

      const prng1 = prngFromSeedHex(seed1);
      const prng2 = prngFromSeedHex(seed2);

      const deck1 = newShuffledDeck(prng1);
      const deck2 = newShuffledDeck(prng2);

      expect(deck1).not.toEqual(deck2);
    });
  });

  describe("Draw System", () => {
    it("draws all 75 unique numbers covering 1-75 range", () => {
      const seed = deriveSeedHex({ secret: "test", gameId: "draw-test" });
      const deck = newShuffledDeck(prngFromSeedHex(seed));
      let state = initDrawState(deck);
      const drawnNumbers = new Set<number>();

      for (let i = 0; i < 75; i++) {
        const { number, state: newState } = drawNext(state);
        state = newState;

        expect(number).toBeDefined();
        expect(number).toBeGreaterThanOrEqual(1);
        expect(number).toBeLessThanOrEqual(75);
        expect(drawnNumbers.has(number!)).toBe(false);
        drawnNumbers.add(number!);
      }

      // All numbers 1-75 should be drawn
      expect(drawnNumbers.size).toBe(75);
      for (let i = 1; i <= 75; i++) {
        expect(drawnNumbers.has(i)).toBe(true);
      }

      // 76th draw should return undefined
      const { number: overflow } = drawNext(state);
      expect(overflow).toBeUndefined();
    });

    it("draws match deck order when deck is provided", () => {
      const seed = deriveSeedHex({ secret: "test", gameId: "deck-order" });
      const deck = newShuffledDeck(prngFromSeedHex(seed));
      let state = initDrawState(deck);

      for (let i = 0; i < 10; i++) {
        const { number, state: newState } = drawNext(state);
        state = newState;
        expect(number).toBe(deck[i]);
      }
    });
  });

  describe("Card Generation", () => {
    it("respects BINGO column ranges", () => {
      const seed = deriveSeedHex({ secret: "test", gameId: "column-test" });
      const prng = prngFromSeedHex(seed);
      const card = generateCard("column-test", "player1", "test", prng);

      // B column (indices 0, 5, 10, 15, 20): 1-15
      [0, 5, 10, 15, 20].forEach(idx => {
        if (idx !== 12) { // Skip free center
          expect(card.grid[idx]).toBeGreaterThanOrEqual(1);
          expect(card.grid[idx]).toBeLessThanOrEqual(15);
        }
      });

      // I column (indices 1, 6, 11, 16, 21): 16-30
      [1, 6, 11, 16, 21].forEach(idx => {
        if (idx !== 12) {
          expect(card.grid[idx]).toBeGreaterThanOrEqual(16);
          expect(card.grid[idx]).toBeLessThanOrEqual(30);
        }
      });

      // N column (indices 2, 7, 12, 17, 22): 31-45
      [2, 7, 17, 22].forEach(idx => { // Skip center at 12
        expect(card.grid[idx]).toBeGreaterThanOrEqual(31);
        expect(card.grid[idx]).toBeLessThanOrEqual(45);
      });

      // G column (indices 3, 8, 13, 18, 23): 46-60
      [3, 8, 13, 18, 23].forEach(idx => {
        if (idx !== 12) {
          expect(card.grid[idx]).toBeGreaterThanOrEqual(46);
          expect(card.grid[idx]).toBeLessThanOrEqual(60);
        }
      });

      // O column (indices 4, 9, 14, 19, 24): 61-75
      [4, 9, 14, 19, 24].forEach(idx => {
        if (idx !== 12) {
          expect(card.grid[idx]).toBeGreaterThanOrEqual(61);
          expect(card.grid[idx]).toBeLessThanOrEqual(75);
        }
      });
    });

    it("has FREE center at index 12", () => {
      const seed = deriveSeedHex({ secret: "test", gameId: "center-test" });
      const prng = prngFromSeedHex(seed);
      const card = generateCard("center-test", "player1", "test", prng);

      expect(card.grid[12]).toBe(0);
      expect(card.freeCenter).toBe(true);
    });

    it("generates unique numbers within each column", () => {
      const seed = deriveSeedHex({ secret: "test", gameId: "unique-test" });
      const prng = prngFromSeedHex(seed);
      const card = generateCard("unique-test", "player1", "test", prng);

      // Check each column for uniqueness
      for (let col = 0; col < 5; col++) {
        const columnNumbers = new Set<number>();
        for (let row = 0; row < 5; row++) {
          const idx = row * 5 + col;
          if (idx !== 12) { // Skip free center
            const num = card.grid[idx];
            expect(columnNumbers.has(num)).toBe(false);
            columnNumbers.add(num);
          }
        }
      }
    });
  });

  describe("Pattern Detection", () => {
    it("detects all 5 rows", () => {
      const patterns = standardPatterns();

      for (let row = 0; row < 5; row++) {
        const patternName = `row${row + 1}`;
        expect(patterns[patternName]).toBeDefined();

        // Create a card with just that row marked
        const card = { id: "test", grid: new Array(25).fill(0), freeCenter: true, signature: "test" };
        const drawn = new Set<number>();

        // Mark the row (fill with sequential numbers for testing)
        for (let col = 0; col < 5; col++) {
          const idx = row * 5 + col;
          if (idx !== 12) {
            card.grid[idx] = idx + 1;
            drawn.add(idx + 1);
          }
        }

        const mask = marksFromDraws(card, drawn);
        const result = validateClaim(mask, patterns);

        if (row === 2) {
          // Row 3 has free center, should be detected
          expect(result.winningPattern).toBe(patternName);
        } else if (drawn.size === 5) {
          expect(result.winningPattern).toBe(patternName);
        }
      }
    });

    it("detects all 5 columns", () => {
      const patterns = standardPatterns();

      for (let col = 0; col < 5; col++) {
        const patternName = `col${col + 1}`;
        expect(patterns[patternName]).toBeDefined();

        // Create a card with just that column marked
        const card = { id: "test", grid: new Array(25).fill(0), freeCenter: true, signature: "test" };
        const drawn = new Set<number>();

        // Mark the column
        for (let row = 0; row < 5; row++) {
          const idx = row * 5 + col;
          if (idx !== 12) {
            card.grid[idx] = idx + 1;
            drawn.add(idx + 1);
          }
        }

        const mask = marksFromDraws(card, drawn);
        const result = validateClaim(mask, patterns);

        if (col === 2) {
          // Column 3 has free center, should be detected
          expect(result.winningPattern).toBe(patternName);
        } else if (drawn.size === 5) {
          expect(result.winningPattern).toBe(patternName);
        }
      }
    });

    it("detects both diagonals", () => {
      const patterns = standardPatterns();

      // Test diagonal 1 (top-left to bottom-right)
      const card1 = { id: "test", grid: new Array(25).fill(0), freeCenter: true, signature: "test" };
      const drawn1 = new Set<number>();
      [0, 6, 12, 18, 24].forEach(idx => {
        if (idx !== 12) {
          card1.grid[idx] = idx + 1;
          drawn1.add(idx + 1);
        }
      });

      const mask1 = marksFromDraws(card1, drawn1);
      const result1 = validateClaim(mask1, patterns);
      expect(result1.winningPattern).toBe("diag1");

      // Test diagonal 2 (top-right to bottom-left)
      const card2 = { id: "test", grid: new Array(25).fill(0), freeCenter: true, signature: "test" };
      const drawn2 = new Set<number>();
      [4, 8, 12, 16, 20].forEach(idx => {
        if (idx !== 12) {
          card2.grid[idx] = idx + 1;
          drawn2.add(idx + 1);
        }
      });

      const mask2 = marksFromDraws(card2, drawn2);
      const result2 = validateClaim(mask2, patterns);
      expect(result2.winningPattern).toBe("diag2");
    });

    it("detects four corners pattern", () => {
      const patterns = standardPatterns();
      const card = { id: "test", grid: new Array(25).fill(0), freeCenter: true, signature: "test" };
      const drawn = new Set<number>();

      // Mark the four corners (0, 4, 20, 24)
      [0, 4, 20, 24].forEach(idx => {
        card.grid[idx] = idx + 1;
        drawn.add(idx + 1);
      });

      const mask = marksFromDraws(card, drawn);
      const result = validateClaim(mask, patterns);
      expect(result.winningPattern).toBe("fourCorners");
    });
  });

  describe("Claim Validation", () => {
    it("validates legitimate claim (happy path)", () => {
      const seed = deriveSeedHex({ secret: "test", gameId: "valid-claim" });
      const prng = prngFromSeedHex(seed);
      const card = generateCard("valid-claim", "player1", "test", prng);
      const patterns = standardPatterns();

      // Draw all numbers in first row
      const drawn = new Set<number>();
      for (let col = 0; col < 5; col++) {
        const idx = col; // First row
        drawn.add(card.grid[idx]);
      }

      const mask = marksFromDraws(card, drawn);
      const result = validateClaim(mask, patterns);
      expect(result.winningPattern).toBeDefined();
      expect(result.winningPattern).toMatch(/^row/);
    });

    it("rejects invalid claim (sad path)", () => {
      const seed = deriveSeedHex({ secret: "test", gameId: "invalid-claim" });
      const prng = prngFromSeedHex(seed);
      const card = generateCard("invalid-claim", "player1", "test", prng);
      const patterns = standardPatterns();

      // Draw only 3 numbers from first row (incomplete)
      const drawn = new Set<number>();
      for (let col = 0; col < 3; col++) {
        drawn.add(card.grid[col]);
      }

      const mask = marksFromDraws(card, drawn);
      const result = validateClaim(mask, patterns);
      expect(result.winningPattern).toBeUndefined();
    });

    it("handles edge case with free center in patterns", () => {
      const patterns = standardPatterns();
      const card = { id: "test", grid: new Array(25).fill(0), freeCenter: true, signature: "test" };

      // Mark middle row except center (which is free)
      const drawn = new Set<number>();
      [10, 11, 13, 14].forEach(idx => {
        card.grid[idx] = idx + 1;
        drawn.add(idx + 1);
      });

      const mask = marksFromDraws(card, drawn);
      const result = validateClaim(mask, patterns);
      expect(result.winningPattern).toBe("row3");
    });
  });

  describe("Penalty System", () => {
    it("escalates strikes correctly", () => {
      const policy = { strikesAllowed: 3, cooldownMs: 30000, rateLimitLockoutMs: 120000 };

      // First strike
      let penalty = applyPenalty(0, policy);
      expect(penalty.strikes).toBe(1);
      expect(penalty.cooldownMs).toBe(30000);

      // Second strike
      penalty = applyPenalty(1, policy);
      expect(penalty.strikes).toBe(2);
      expect(penalty.cooldownMs).toBe(30000);

      // Third strike (max)
      penalty = applyPenalty(2, policy);
      expect(penalty.strikes).toBe(3);
      expect(penalty.cooldownMs).toBe(30000);

      // Fourth strike (should cap at max)
      penalty = applyPenalty(3, policy);
      expect(penalty.strikes).toBe(3);
      expect(penalty.cooldownMs).toBe(30000);
    });

    it("applies 30s cooldown after 3 strikes", () => {
      const policy = { strikesAllowed: 3, cooldownMs: 30000, rateLimitLockoutMs: 120000 };

      // Reach 3 strikes
      const penalty = applyPenalty(2, policy);
      expect(penalty.strikes).toBe(3);
      expect(penalty.cooldownMs).toBe(30000);
    });

    it("respects different policy configurations", () => {
      const customPolicy = { strikesAllowed: 5, cooldownMs: 60000, rateLimitLockoutMs: 180000 };

      const penalty = applyPenalty(4, customPolicy);
      expect(penalty.strikes).toBe(5);
      expect(penalty.cooldownMs).toBe(60000);
    });
  });

  describe("Determinism Verification", () => {
    it("prints identical first N draws for identical seeds", () => {
      const secret = "determinism-test";
      const gameId = "game-123";
      const nonce = "fixed-nonce";

      // First run
      const seed1 = deriveSeedHex({ secret, gameId, nonce });
      const deck1 = newShuffledDeck(prngFromSeedHex(seed1));
      const firstTenDraws1 = deck1.slice(0, 10);

      // Second run with same parameters
      const seed2 = deriveSeedHex({ secret, gameId, nonce });
      const deck2 = newShuffledDeck(prngFromSeedHex(seed2));
      const firstTenDraws2 = deck2.slice(0, 10);

      // Log for verification
      console.log("Determinism Test - First 10 draws:");
      console.log("Run 1:", firstTenDraws1.join(", "));
      console.log("Run 2:", firstTenDraws2.join(", "));
      console.log("Seeds match:", seed1 === seed2);
      console.log("Draws match:", JSON.stringify(firstTenDraws1) === JSON.stringify(firstTenDraws2));

      expect(firstTenDraws1).toEqual(firstTenDraws2);
      expect(seed1).toBe(seed2);
    });
  });
});