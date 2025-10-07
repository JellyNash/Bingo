import { describe, it, expect } from "vitest";
import { deriveSeedHex, prngFromSeedHex, newShuffledDeck, initDrawState, drawNext, generateCard, standardPatterns, marksFromDraws, validateClaim, applyPenalty } from "../src";
describe("PRNG determinism & deck", () => {
    it("deterministic deck with same seed", () => {
        const s = deriveSeedHex({ secret: "k", gameId: "g1", nonce: "n1" });
        const p1 = prngFromSeedHex(s);
        const p2 = prngFromSeedHex(s);
        expect(newShuffledDeck(p1)).toEqual(newShuffledDeck(p2));
    });
    it("draws 75 unique numbers", () => {
        const s = deriveSeedHex({ secret: "k", gameId: "g2", nonce: "n2" });
        const deck = newShuffledDeck(prngFromSeedHex(s));
        const st = initDrawState(deck);
        const seen = new Set();
        let state = st;
        for (let i = 0; i < 75; i++) {
            const { number, state: ns } = drawNext(state);
            state = ns;
            expect(number).toBeDefined();
            expect(seen.has(number)).toBe(false);
            seen.add(number);
        }
        const { number } = drawNext(state);
        expect(number).toBeUndefined();
    });
});
describe("Card generation & ranges", () => {
    it("columns respect ranges and free center", () => {
        const seed = deriveSeedHex({ secret: "k", gameId: "g3", nonce: "n3" });
        const prng = prngFromSeedHex(seed);
        const card = generateCard("g3", "p1", "k", prng);
        expect(card.grid[12]).toBe(0);
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                const idx = r * 5 + c;
                if (idx === 12)
                    continue;
                const v = card.grid[idx];
                if (c === 0)
                    expect(v).toBeGreaterThanOrEqual(1), expect(v).toBeLessThanOrEqual(15);
                if (c === 1)
                    expect(v).toBeGreaterThanOrEqual(16), expect(v).toBeLessThanOrEqual(30);
                if (c === 2)
                    expect(v).toBeGreaterThanOrEqual(31), expect(v).toBeLessThanOrEqual(45);
                if (c === 3)
                    expect(v).toBeGreaterThanOrEqual(46), expect(v).toBeLessThanOrEqual(60);
                if (c === 4)
                    expect(v).toBeGreaterThanOrEqual(61), expect(v).toBeLessThanOrEqual(75);
            }
        }
    });
});
describe("Claim validation", () => {
    it("detects a completed row", () => {
        const seed = deriveSeedHex({ secret: "k", gameId: "g4", nonce: "n4" });
        const prng = prngFromSeedHex(seed);
        const card = generateCard("g4", "p1", "k", prng);
        const pats = standardPatterns();
        // simulate draw of all numbers in ROW_1 (r=0)
        const rowNums = [0, 1, 2, 3, 4].map(i => card.grid[i]).filter(Boolean);
        const drawn = new Set(rowNums);
        const mask = marksFromDraws(card, drawn);
        const res = validateClaim(mask, pats);
        expect(res.winningPattern).toBe('ROW_1');
    });
    it("penalty increments with cooldown", () => {
        const pen = applyPenalty(2, { strikesAllowed: 3, cooldownMs: 30000, rateLimitLockoutMs: 120000 });
        expect(pen.strikes).toBe(3);
        expect(pen.cooldownMs).toBe(30000);
    });
});
