#!/bin/bash
cd /mnt/c/projects/bingo/backend/api

# Create migration SQL manually since interactive mode not available
mkdir -p prisma/migrations/$(date +%Y%m%d%H%M%S)_add_audio_system

cat > prisma/migrations/$(date +%Y%m%d%H%M%S)_add_audio_system/migration.sql << 'EOF'
-- CreateEnum
CREATE TYPE "AudioPackType" AS ENUM ('MUSIC', 'SFX', 'VOICE');

-- CreateEnum
CREATE TYPE "AudioScope" AS ENUM ('LOBBY', 'IN_GAME', 'JOIN', 'BINGO', 'COUNTDOWN', 'NUMBERS');

-- CreateTable
CREATE TABLE "AudioPack" (
    "id" TEXT NOT NULL,
    "packId" VARCHAR(100) NOT NULL,
    "type" "AudioPackType" NOT NULL,
    "scope" "AudioScope" NOT NULL,
    "locale" VARCHAR(10),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AudioPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudioAsset" (
    "id" TEXT NOT NULL,
    "audioPackId" TEXT NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "cueKey" VARCHAR(100) NOT NULL,
    "duration" INTEGER,
    "fileSize" INTEGER,
    "mimeType" VARCHAR(50),
    "hash" VARCHAR(64),
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AudioAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameAudioSettings" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "lobbyMusicPackId" TEXT,
    "inGameMusicPackId" TEXT,
    "sfxPackId" TEXT,
    "voicePackId" TEXT,
    "countdownEnabled" BOOLEAN NOT NULL DEFAULT false,
    "countdownDurationSeconds" INTEGER DEFAULT 10,
    "countdownMessage" VARCHAR(255),
    "volumeSettings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameAudioSettings_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Game" ADD COLUMN "countdownStartAt" TIMESTAMP(3);
ALTER TABLE "Game" ADD COLUMN "countdownDurationSeconds" INTEGER;
ALTER TABLE "Game" ADD COLUMN "lobbyConfig" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "AudioPack_packId_key" ON "AudioPack"("packId");
CREATE INDEX "AudioPack_type_scope_idx" ON "AudioPack"("type", "scope");
CREATE INDEX "AudioAsset_audioPackId_idx" ON "AudioAsset"("audioPackId");
CREATE UNIQUE INDEX "GameAudioSettings_gameId_key" ON "GameAudioSettings"("gameId");

-- AddForeignKey
ALTER TABLE "AudioAsset" ADD CONSTRAINT "AudioAsset_audioPackId_fkey" FOREIGN KEY ("audioPackId") REFERENCES "AudioPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAudioSettings" ADD CONSTRAINT "GameAudioSettings_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAudioSettings" ADD CONSTRAINT "GameAudioSettings_lobbyMusicPackId_fkey" FOREIGN KEY ("lobbyMusicPackId") REFERENCES "AudioPack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAudioSettings" ADD CONSTRAINT "GameAudioSettings_inGameMusicPackId_fkey" FOREIGN KEY ("inGameMusicPackId") REFERENCES "AudioPack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAudioSettings" ADD CONSTRAINT "GameAudioSettings_sfxPackId_fkey" FOREIGN KEY ("sfxPackId") REFERENCES "AudioPack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAudioSettings" ADD CONSTRAINT "GameAudioSettings_voicePackId_fkey" FOREIGN KEY ("voicePackId") REFERENCES "AudioPack"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EOF

echo "Migration created"