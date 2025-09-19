-- Initial schema for Bingo Platform
CREATE TYPE "GameStatus" AS ENUM ('LOBBY', 'OPEN', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "PlayerStatus" AS ENUM ('ACTIVE', 'COOLDOWN', 'DISQUALIFIED', 'LEFT');
CREATE TYPE "BingoPattern" AS ENUM ('ROW_1', 'ROW_2', 'ROW_3', 'ROW_4', 'ROW_5', 'COL_1', 'COL_2', 'COL_3', 'COL_4', 'COL_5', 'DIAGONAL_1', 'DIAGONAL_2', 'FOUR_CORNERS', 'FULL_CARD');
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DENIED', 'SUPERSEDED');
CREATE TYPE "PenaltyType" AS ENUM ('FALSE_CLAIM', 'RATE_LIMIT', 'SUSPICIOUS', 'MANUAL', 'AUTO_STRIKE');

CREATE TABLE "games" (
  "id" TEXT PRIMARY KEY,
  "pin" VARCHAR(6) UNIQUE NOT NULL,
  "name" VARCHAR(100),
  "status" "GameStatus" NOT NULL DEFAULT 'LOBBY',
  "maxPlayers" INTEGER NOT NULL DEFAULT 1000,
  "allowLateJoin" BOOLEAN NOT NULL DEFAULT TRUE,
  "autoDrawInterval" INTEGER NOT NULL DEFAULT 8,
  "autoDrawEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "winnerLimit" INTEGER NOT NULL DEFAULT 1,
  "currentSequence" INTEGER NOT NULL DEFAULT 0,
  "lastDrawAt" TIMESTAMP,
  "startedAt" TIMESTAMP,
  "completedAt" TIMESTAMP,
  "pausedAt" TIMESTAMP,
  "rngSeed" VARCHAR(64) NOT NULL,
  "gameSignature" VARCHAR(128) NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" VARCHAR(50)
);

CREATE TABLE "players" (
  "id" TEXT PRIMARY KEY,
  "gameId" TEXT NOT NULL REFERENCES "games"("id") ON DELETE CASCADE,
  "nickname" VARCHAR(50) NOT NULL,
  "status" "PlayerStatus" NOT NULL DEFAULT 'ACTIVE',
  "strikes" INTEGER NOT NULL DEFAULT 0,
  "isDisqualified" BOOLEAN NOT NULL DEFAULT FALSE,
  "cooldownUntil" TIMESTAMP,
  "joinedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipAddress" VARCHAR(45),
  "userAgent" VARCHAR(500)
);

CREATE UNIQUE INDEX "players_gameId_nickname_key" ON "players" ("gameId", "nickname");

CREATE TABLE "bingo_cards" (
  "id" TEXT PRIMARY KEY,
  "playerId" TEXT UNIQUE NOT NULL REFERENCES "players"("id") ON DELETE CASCADE,
  "numbers" JSONB NOT NULL,
  "cardSignature" VARCHAR(128) NOT NULL,
  "seedUsed" VARCHAR(64) NOT NULL,
  "marks" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "generatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "draws" (
  "id" TEXT PRIMARY KEY,
  "gameId" TEXT NOT NULL REFERENCES "games"("id") ON DELETE CASCADE,
  "sequence" INTEGER NOT NULL,
  "letter" VARCHAR(1) NOT NULL,
  "number" INTEGER NOT NULL,
  "drawnAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "drawnBy" VARCHAR(50),
  "drawSignature" VARCHAR(128) NOT NULL
);
CREATE UNIQUE INDEX "draws_gameId_sequence_key" ON "draws" ("gameId", "sequence");
CREATE UNIQUE INDEX "draws_gameId_letter_number_key" ON "draws" ("gameId", "letter", "number");

CREATE TABLE "claims" (
  "id" TEXT PRIMARY KEY,
  "gameId" TEXT NOT NULL REFERENCES "games"("id") ON DELETE CASCADE,
  "playerId" TEXT NOT NULL REFERENCES "players"("id") ON DELETE CASCADE,
  "pattern" "BingoPattern" NOT NULL,
  "isValid" BOOLEAN,
  "timestamp" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
  "validatedAt" TIMESTAMP,
  "validatedBy" VARCHAR(50),
  "denialReason" VARCHAR(200),
  "isWinner" BOOLEAN NOT NULL DEFAULT FALSE,
  "winPosition" INTEGER
);
CREATE INDEX "claims_gameId_timestamp_idx" ON "claims" ("gameId", "timestamp");

CREATE TABLE "penalties" (
  "id" TEXT PRIMARY KEY,
  "gameId" TEXT NOT NULL REFERENCES "games"("id") ON DELETE CASCADE,
  "playerId" TEXT NOT NULL REFERENCES "players"("id") ON DELETE CASCADE,
  "type" "PenaltyType" NOT NULL,
  "reason" VARCHAR(200) NOT NULL,
  "severity" INTEGER NOT NULL DEFAULT 1,
  "appliedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "appliedBy" VARCHAR(50),
  "expiresAt" TIMESTAMP,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "clearedAt" TIMESTAMP,
  "clearedBy" VARCHAR(50),
  "clearReason" VARCHAR(200)
);

CREATE TABLE "sessions" (
  "id" TEXT PRIMARY KEY,
  "gameId" TEXT NOT NULL REFERENCES "games"("id") ON DELETE CASCADE,
  "playerId" TEXT REFERENCES "players"("id") ON DELETE SET NULL,
  "socketId" VARCHAR(100) UNIQUE,
  "resumeToken" VARCHAR(128) UNIQUE NOT NULL,
  "ipAddress" VARCHAR(45) NOT NULL,
  "userAgent" VARCHAR(500),
  "namespace" VARCHAR(50) NOT NULL,
  "room" VARCHAR(100),
  "connectedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "disconnectedAt" TIMESTAMP,
  "expiresAt" TIMESTAMP NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE "audit_log" (
  "id" TEXT PRIMARY KEY,
  "gameId" TEXT REFERENCES "games"("id") ON DELETE SET NULL,
  "playerId" TEXT REFERENCES "players"("id") ON DELETE SET NULL,
  "action" VARCHAR(100) NOT NULL,
  "entity" VARCHAR(50) NOT NULL,
  "entityId" VARCHAR(50),
  "oldValues" JSONB,
  "newValues" JSONB,
  "metadata" JSONB,
  "actorType" VARCHAR(20) NOT NULL,
  "actorId" VARCHAR(50),
  "ipAddress" VARCHAR(45),
  "userAgent" VARCHAR(500),
  "timestamp" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "rate_limits" (
  "id" TEXT PRIMARY KEY,
  "key" VARCHAR(100) UNIQUE NOT NULL,
  "tokens" INTEGER NOT NULL DEFAULT 0,
  "lastRefill" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "windowStart" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "maxTokens" INTEGER NOT NULL DEFAULT 10,
  "refillRate" INTEGER NOT NULL DEFAULT 1,
  "windowMs" INTEGER NOT NULL DEFAULT 60000,
  "violations" INTEGER NOT NULL DEFAULT 0,
  "lastViolation" TIMESTAMP,
  "blockedUntil" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "idempotency_keys" (
  "id" TEXT PRIMARY KEY,
  "key" VARCHAR(128) UNIQUE NOT NULL,
  "endpoint" VARCHAR(100) NOT NULL,
  "method" VARCHAR(10) NOT NULL,
  "playerId" VARCHAR(50),
  "gameId" VARCHAR(50),
  "statusCode" INTEGER,
  "response" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP NOT NULL
);

CREATE INDEX "games_pin_idx" ON "games" ("pin");
CREATE INDEX "games_status_idx" ON "games" ("status");
CREATE INDEX "games_createdAt_idx" ON "games" ("createdAt");
CREATE INDEX "players_gameId_idx" ON "players" ("gameId");
CREATE INDEX "players_status_idx" ON "players" ("status");
CREATE INDEX "penalties_player_idx" ON "penalties" ("playerId");
CREATE INDEX "sessions_game_idx" ON "sessions" ("gameId");
CREATE INDEX "sessions_player_idx" ON "sessions" ("playerId");
CREATE INDEX "claims_player_idx" ON "claims" ("playerId");
CREATE INDEX "claims_status_idx" ON "claims" ("status");
