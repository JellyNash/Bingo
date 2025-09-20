# Fairness & Determinism Documentation

## Overview

The Bingo game system implements cryptographically secure determinism to ensure fair gameplay. All randomness is derived from secure HMAC-SHA256 seeds, making game outcomes verifiable and reproducible.

## Core Principles

1. **Deterministic Randomness**: No `Math.random()` in production code
2. **Cryptographic Seeds**: HMAC-SHA256 for seed derivation
3. **Reproducible Outcomes**: Same seed → same game sequence
4. **Verifiable Fairness**: All operations can be audited

## Seed Derivation

### Game Seed
```typescript
const gameSeed = createHmac('sha256', GAME_SEED_SECRET)
  .update(`${gameId}|${nonce}`)
  .digest('hex');
```

### Player Card Seed
```typescript
const cardSeed = createHmac('sha256', gameSeed)
  .update(`card:${playerId}`)
  .digest('hex');
```

## PRNG Implementation

The system uses a deterministic PRNG (xorshift128+) seeded from the HMAC output:

```typescript
export function prngFromSeedHex(seedHex: string): PRNG {
  // xorshift128+ implementation
  // Deterministic, not crypto-strong (crypto is for seed only)
  const h = BigInt("0x" + seedHex.padStart(32, "0").slice(0, 32));
  // ... xorshift algorithm
}
```

## Game Components

### Draw Sequence
- 75 numbers shuffled using seeded PRNG
- Order determined at game creation
- Immutable throughout game

### Card Generation
- Each player gets unique seed derived from game seed + player ID
- 5x5 grid with column constraints (B:1-15, I:16-30, etc.)
- Center square always FREE
- Signature binds card to game+player

### Claim Validation
- Server-authoritative validation
- Bitmask pattern matching
- Penalty system for false claims

## Audit Steps

### 1. Verify Seed Generation
```bash
# Check seed derivation in orchestrator
grep -n "deriveSeedHex" backend/orchestrator/src/index.ts
```

### 2. Test Determinism
```bash
# Run orchestrator tests
pnpm -F @bingo/orchestrator test
```

Expected output shows identical draws for identical seeds:
```
Determinism Test - First 10 draws:
Run 1: 65, 23, 7, 75, 51, 57, 21, 67, 42, 56
Run 2: 65, 23, 7, 75, 51, 57, 21, 67, 42, 56
Seeds match: true
```

### 3. Verify No Math.random()
```bash
# Search for Math.random in production code
find backend -name "*.ts" -not -path "*/tests/*" | xargs grep "Math.random"
```
Should return no results in production code.

### 4. Database Audit Trail
- All draws stored with sequence and signature
- Claims recorded with validation result
- Penalties tracked with timestamps

## Security Considerations

1. **GAME_SEED_SECRET**: Must be cryptographically secure and never exposed
2. **Signatures**: All game artifacts signed with HMAC
3. **Immutability**: Seeds and decks cannot be changed after game creation
4. **Transparency**: Players can verify their cards match the seed

## Compliance

The system meets fairness requirements through:
- Deterministic game mechanics
- Cryptographic proof of fairness
- Complete audit trail
- Server-authoritative validation

## Testing

Run the comprehensive test suite:
```bash
cd backend/orchestrator
pnpm test
```

Key test coverage:
- Determinism verification
- 75 unique draws
- Column range validation
- Pattern detection
- Penalty escalation

## References

- [PRD v1.0](/docs/prd/PRD_v1.0.md) - Product requirements
- [Architecture RFC](/docs/architecture/rfc_architecture.md) - System design
- [Orchestrator Package](/backend/orchestrator/README.md) - Implementation details