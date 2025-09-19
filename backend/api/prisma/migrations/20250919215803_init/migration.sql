/*
  Warnings:

  - Made the column `appliedBy` on table `penalties` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_gameId_fkey";

-- DropForeignKey
ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_playerId_fkey";

-- DropForeignKey
ALTER TABLE "bingo_cards" DROP CONSTRAINT "bingo_cards_playerId_fkey";

-- DropForeignKey
ALTER TABLE "claims" DROP CONSTRAINT "claims_gameId_fkey";

-- DropForeignKey
ALTER TABLE "claims" DROP CONSTRAINT "claims_playerId_fkey";

-- DropForeignKey
ALTER TABLE "draws" DROP CONSTRAINT "draws_gameId_fkey";

-- DropForeignKey
ALTER TABLE "penalties" DROP CONSTRAINT "penalties_gameId_fkey";

-- DropForeignKey
ALTER TABLE "penalties" DROP CONSTRAINT "penalties_playerId_fkey";

-- DropForeignKey
ALTER TABLE "players" DROP CONSTRAINT "players_gameId_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_gameId_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_playerId_fkey";

-- AlterTable
ALTER TABLE "audit_log" ALTER COLUMN "timestamp" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "bingo_cards" ALTER COLUMN "generatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "claims" ALTER COLUMN "timestamp" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "validatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "draws" ALTER COLUMN "drawnAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "games" ALTER COLUMN "lastDrawAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "startedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "completedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "pausedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "idempotency_keys" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "penalties" ALTER COLUMN "appliedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "appliedBy" SET NOT NULL,
ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "clearedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "players" ALTER COLUMN "cooldownUntil" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "joinedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "lastSeenAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "rate_limits" ALTER COLUMN "lastRefill" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "windowStart" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "lastViolation" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "blockedUntil" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "sessions" ALTER COLUMN "connectedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "lastSeenAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "disconnectedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "audit_log_gameId_timestamp_idx" ON "audit_log"("gameId", "timestamp");

-- CreateIndex
CREATE INDEX "audit_log_playerId_timestamp_idx" ON "audit_log"("playerId", "timestamp");

-- CreateIndex
CREATE INDEX "audit_log_action_idx" ON "audit_log"("action");

-- CreateIndex
CREATE INDEX "audit_log_timestamp_idx" ON "audit_log"("timestamp");

-- CreateIndex
CREATE INDEX "bingo_cards_playerId_idx" ON "bingo_cards"("playerId");

-- CreateIndex
CREATE INDEX "draws_gameId_idx" ON "draws"("gameId");

-- CreateIndex
CREATE INDEX "draws_drawnAt_idx" ON "draws"("drawnAt");

-- CreateIndex
CREATE INDEX "idempotency_keys_key_idx" ON "idempotency_keys"("key");

-- CreateIndex
CREATE INDEX "idempotency_keys_expiresAt_idx" ON "idempotency_keys"("expiresAt");

-- CreateIndex
CREATE INDEX "penalties_appliedAt_idx" ON "penalties"("appliedAt");

-- CreateIndex
CREATE INDEX "penalties_isActive_idx" ON "penalties"("isActive");

-- CreateIndex
CREATE INDEX "rate_limits_key_idx" ON "rate_limits"("key");

-- CreateIndex
CREATE INDEX "rate_limits_blockedUntil_idx" ON "rate_limits"("blockedUntil");

-- CreateIndex
CREATE INDEX "sessions_resumeToken_idx" ON "sessions"("resumeToken");

-- CreateIndex
CREATE INDEX "sessions_isActive_idx" ON "sessions"("isActive");

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bingo_cards" ADD CONSTRAINT "bingo_cards_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draws" ADD CONSTRAINT "draws_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penalties" ADD CONSTRAINT "penalties_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_draw_fkey" FOREIGN KEY ("entityId") REFERENCES "draws"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_claim_fkey" FOREIGN KEY ("entityId") REFERENCES "claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_penalty_fkey" FOREIGN KEY ("entityId") REFERENCES "penalties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "claims_player_idx" RENAME TO "claims_playerId_idx";

-- RenameIndex
ALTER INDEX "penalties_player_idx" RENAME TO "penalties_playerId_idx";

-- RenameIndex
ALTER INDEX "sessions_game_idx" RENAME TO "sessions_gameId_idx";

-- RenameIndex
ALTER INDEX "sessions_player_idx" RENAME TO "sessions_playerId_idx";
