import { describe, it, expect } from "vitest";
import {
  deriveSeedHex, prngFromSeedHex, newShuffledDeck,
  generateCard, standardPatterns, marksFromDraws, validateClaim
} from "../src";

describe("Performance requirements", () => {
  it("generates 100 cards in reasonable time", () => {
    const start = Date.now();
    const seed = deriveSeedHex({ secret: "perf", gameId: "perf-test" });
    const prng = prngFromSeedHex(seed);

    for (let i = 0; i < 100; i++) {
      generateCard("perf-test", `player-${i}`, "perf", prng);
    }

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(1000); // Should take less than 1 second for 100 cards
  });

  it("validates 100 claims in reasonable time", () => {
    const start = Date.now();
    const patterns = standardPatterns();

    // Generate deterministic card masks using seeded PRNG
    const seed = deriveSeedHex({ secret: "perf-claim", gameId: "claim-test" });
    const prng = prngFromSeedHex(seed);

    for (let i = 0; i < 100; i++) {
      const randomMask = Math.floor(prng() * (1 << 25));
      validateClaim(randomMask, patterns);
    }

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(100); // Should take less than 100ms for 100 claim validations
  });

  it("creates and shuffles 100 decks in reasonable time", () => {
    const start = Date.now();
    const seed = deriveSeedHex({ secret: "deck", gameId: "deck-test" });
    const prng = prngFromSeedHex(seed);

    for (let i = 0; i < 100; i++) {
      const deck = newShuffledDeck(prng);
      expect(deck.length).toBe(75);
    }

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(500); // Should take less than 500ms for 100 deck operations
  });
});