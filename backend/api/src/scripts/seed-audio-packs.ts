/**
 * Audio Packs Seed Script
 * Populates database with default audio packs from storage
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { prisma } from '../services/prisma.js';
import { AudioManifestValidator } from '../services/audio-manifest.validator.js';

const AUDIO_STORAGE_PATH = join(process.cwd(), 'storage', 'audio', 'packs');

interface AudioPackManifest {
  packId: string;
  name: string;
  description?: string;
  type: 'MUSIC' | 'SFX' | 'VOICE';
  scope: 'LOBBY' | 'IN_GAME' | 'JOIN' | 'BINGO' | 'COUNTDOWN' | 'NUMBERS';
  locale?: string;
  version?: string;
  author?: string;
  metadata?: Record<string, unknown>;
  assets: Array<{
    filename: string;
    cueKey: string;
    duration?: number;
    fileSize?: number;
    mimeType: string;
    hash?: string;
  }>;
}

async function seedAudioPacks() {
  console.log('🎵 Starting audio packs seed...');

  // Define the default audio packs to seed
  const packPaths = [
    'music/lobby/default',
    'music/in-game/default',
    'sfx/bingo/default',
    'sfx/countdown/default',
    'voice/english/default',
  ];

  let seededCount = 0;
  let skippedCount = 0;

  for (const packPath of packPaths) {
    try {
      const manifestPath = join(AUDIO_STORAGE_PATH, packPath, 'audio-pack.json');

      // Check if manifest exists
      try {
        await fs.access(manifestPath);
      } catch {
        console.log(`⚠️  Manifest not found: ${packPath}`);
        continue;
      }

      // Read and parse manifest
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest: AudioPackManifest = JSON.parse(manifestContent);

      // Validate manifest
      const validation = AudioManifestValidator.validateManifest(manifest);
      if (!validation.isValid) {
        console.log(`❌ Invalid manifest for ${packPath}:`, validation.errors);
        continue;
      }

      // Check if pack already exists
      const existingPack = await prisma.audioPack.findUnique({
        where: { packId: manifest.packId }
      });

      if (existingPack) {
        console.log(`⏭️  Pack already exists: ${manifest.packId}`);
        skippedCount++;
        continue;
      }

      // Create the audio pack
      const audioPack = await prisma.audioPack.create({
        data: {
          packId: manifest.packId,
          type: manifest.type,
          scope: manifest.scope,
          locale: manifest.locale,
          name: manifest.name,
          description: manifest.description,
          isActive: true,
          metadata: {
            version: manifest.version,
            author: manifest.author,
            ...manifest.metadata,
            seededAt: new Date().toISOString(),
            sourcePath: packPath,
          },
        },
      });

      // Create asset records (Note: actual files would need to exist for full functionality)
      for (const asset of manifest.assets) {
        await prisma.audioAsset.create({
          data: {
            audioPackId: audioPack.id,
            filename: asset.filename,
            cueKey: asset.cueKey,
            duration: asset.duration,
            fileSize: asset.fileSize ? BigInt(asset.fileSize) : null,
            mimeType: asset.mimeType,
            hash: asset.hash,
          },
        });
      }

      console.log(`✅ Seeded pack: ${manifest.name} (${manifest.packId})`);
      seededCount++;

    } catch (error) {
      console.error(`❌ Error seeding pack ${packPath}:`, error);
    }
  }

  console.log(`\n🎵 Audio packs seed completed:`);
  console.log(`   ✅ Seeded: ${seededCount} packs`);
  console.log(`   ⏭️  Skipped: ${skippedCount} packs (already exist)`);
}

async function main() {
  try {
    await seedAudioPacks();
    console.log('✅ Seed script completed successfully');
  } catch (error) {
    console.error('❌ Seed script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { seedAudioPacks };