/**
 * Audio Packs Service
 * Handles audio pack management, file ingestion, and storage
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { prisma } from './prisma.js';
import { AudioManifestValidator, type AudioManifest } from './audio-manifest.validator.js';
import type { AudioPackType as AudioPackTypeT, AudioScope as AudioScopeT } from '@prisma/client';
import PrismaPkg from '@prisma/client';
const { AudioPackType, AudioScope } = PrismaPkg as any;
type AudioPackType = AudioPackTypeT;
type AudioScope = AudioScopeT;

// Types
export interface UploadedFile {
  filename: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
}

export interface AudioPackUploadResult {
  success: boolean;
  packId?: string;
  errors: string[];
  warnings: string[];
}

export interface AudioPackAssetSummary {
  id: string;
  filename: string;
  cueKey: string;
  duration?: number | null;
  fileSize?: number | null;
  mimeType?: string | null;
}

export interface AudioPackInfo {
  id: string;
  packId: string;
  type: AudioPackTypeT;
  scope: AudioScopeT;
  locale?: string;
  name: string;
  description?: string;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  assetCount: number;
  totalSize: bigint;
  assets: AudioPackAssetSummary[];
}

export class AudioPacksService {
  private readonly AUDIO_STORAGE_PATH = join(process.cwd(), 'storage', 'audio', 'packs');

  /**
   * Upload and process an audio pack from a ZIP file
   */
  async uploadPack(file: UploadedFile): Promise<AudioPackUploadResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate file is a ZIP
      if (file.mimetype !== 'application/zip' && !file.filename.endsWith('.zip')) {
        return { success: false, errors: ['File must be a ZIP archive'], warnings: [] };
      }

      // Extract ZIP contents temporarily
      const tempDir = await this.extractZipFile(file.buffer);

      try {
        // Look for manifest file
        const manifestPath = join(tempDir, 'audio-pack.json');
        const manifestExists = await fs.access(manifestPath).then(() => true).catch(() => false);

        if (!manifestExists) {
          return {
            success: false,
            errors: ['No audio-pack.json manifest found in ZIP root'],
            warnings: []
          };
        }

        // Read and validate manifest
        const manifestContent = await fs.readFile(manifestPath, 'utf-8');
        const manifestData = JSON.parse(manifestContent);
        const validation = AudioManifestValidator.validateManifest(manifestData);

        if (!validation.isValid) {
          return { success: false, errors: validation.errors, warnings: [] };
        }

        const manifest = validation.data!;

        // Check for existing pack with same packId
        const existingPack = await prisma.audioPack.findUnique({
          where: { packId: manifest.packId }
        });

        if (existingPack) {
          errors.push(`Audio pack with ID '${manifest.packId}' already exists`);
          return { success: false, errors, warnings };
        }

        // Validate all asset files exist
        const missingFiles: string[] = [];
        const assetFiles: { asset: any; filePath: string; stats: any }[] = [];

        for (const asset of manifest.assets) {
          const assetPath = join(tempDir, asset.filename);
          try {
            const stats = await fs.stat(assetPath);
            if (!stats.isFile()) {
              missingFiles.push(asset.filename);
            } else {
              assetFiles.push({ asset, filePath: assetPath, stats });
            }
          } catch {
            missingFiles.push(asset.filename);
          }
        }

        if (missingFiles.length > 0) {
          errors.push(`Missing asset files: ${missingFiles.join(', ')}`);
          return { success: false, errors, warnings };
        }

        // Create the audio pack in database
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
              uploadedAt: new Date().toISOString(),
            },
          },
        });

        // Create storage directory for this pack
        const packStoragePath = this.getPackStoragePath(manifest.type, manifest.scope, manifest.packId);
        await fs.mkdir(packStoragePath, { recursive: true });

        // Process and store each asset
        const processedAssets: any[] = [];
        for (const { asset, filePath, stats } of assetFiles) {
          try {
            // Read file and calculate hash
            const fileBuffer = await fs.readFile(filePath);
            const hash = createHash('sha256').update(fileBuffer).digest('hex');

            // Copy file to storage
            const targetPath = join(packStoragePath, asset.filename);
            await fs.copyFile(filePath, targetPath);

            // Create asset record
            const audioAsset = await prisma.audioAsset.create({
              data: {
                audioPackId: audioPack.id,
                filename: asset.filename,
                cueKey: asset.cueKey,
                duration: asset.duration,
                fileSize: BigInt(stats.size),
                mimeType: asset.mimeType,
                hash,
              },
            });

            processedAssets.push(audioAsset);
          } catch (error) {
            warnings.push(`Failed to process asset ${asset.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Copy manifest to storage
        await fs.copyFile(manifestPath, join(packStoragePath, 'audio-pack.json'));

        return {
          success: true,
          packId: audioPack.id,
          errors: [],
          warnings,
        };

      } finally {
        // Clean up temp directory
        await this.cleanupDirectory(tempDir);
      }

    } catch (error) {
      errors.push(`Upload processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { success: false, errors, warnings };
    }
  }

  /**
   * List all audio packs with filtering
   */
  async listPacks(filters?: {
    type?: AudioPackType;
    scope?: AudioScope;
    locale?: string;
    isActive?: boolean;
  }): Promise<AudioPackInfo[]> {
    const where: any = {};

    if (filters?.type) where.type = filters.type;
    if (filters?.scope) where.scope = filters.scope;
    if (filters?.locale) where.locale = filters.locale;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    const packs = await prisma.audioPack.findMany({
      where,
      include: {
        assets: true,
      },
      orderBy: [
        { type: 'asc' },
        { scope: 'asc' },
        { name: 'asc' },
      ],
    });

    return packs.map(pack => ({
      id: pack.id,
      packId: pack.packId,
      type: pack.type,
      scope: pack.scope,
      locale: pack.locale || undefined,
      name: pack.name,
      description: pack.description || undefined,
      isActive: pack.isActive,
      metadata: pack.metadata as Record<string, unknown>,
      createdAt: pack.createdAt,
      updatedAt: pack.updatedAt,
      assetCount: pack.assets.length,
      totalSize: pack.assets.reduce((sum, asset) => sum + (asset.fileSize || BigInt(0)), BigInt(0)),
      assets: pack.assets.map(asset => ({
        id: asset.id,
        filename: asset.filename,
        cueKey: asset.cueKey,
        duration: typeof asset.duration === 'number' ? asset.duration : (asset.duration ?? null),
        fileSize: asset.fileSize !== null && asset.fileSize !== undefined ? Number(asset.fileSize) : null,
        mimeType: asset.mimeType ?? null,
      } as AudioPackAssetSummary)),
    }));
  }

  /**
   * Get a specific audio pack with assets
   */
  async getPack(packId: string): Promise<AudioPackInfo & { assets: any[] } | null> {
    const pack = await prisma.audioPack.findUnique({
      where: { packId },
      include: {
        assets: true,
      },
    });

    if (!pack) return null;

    return {
      id: pack.id,
      packId: pack.packId,
      type: pack.type,
      scope: pack.scope,
      locale: pack.locale || undefined,
      name: pack.name,
      description: pack.description || undefined,
      isActive: pack.isActive,
      metadata: pack.metadata as Record<string, unknown>,
      createdAt: pack.createdAt,
      updatedAt: pack.updatedAt,
      assetCount: pack.assets.length,
      totalSize: pack.assets.reduce((sum, asset) => sum + (asset.fileSize || BigInt(0)), BigInt(0)),
      assets: pack.assets.map(asset => ({
        id: asset.id,
        filename: asset.filename,
        cueKey: asset.cueKey,
        duration: typeof asset.duration === 'number' ? asset.duration : (asset.duration ?? null),
        fileSize: asset.fileSize !== null && asset.fileSize !== undefined ? Number(asset.fileSize) : null,
        mimeType: asset.mimeType ?? null,
      })),
    };
  }

  /**
   * Delete an audio pack and its files
   */
  async deletePack(packId: string): Promise<boolean> {
    const pack = await prisma.audioPack.findUnique({
      where: { packId },
      include: { assets: true },
    });

    if (!pack) return false;

    try {
      // Delete from database (assets will be cascade deleted)
      await prisma.audioPack.delete({
        where: { packId },
      });

      // Delete storage directory
      const packStoragePath = this.getPackStoragePath(pack.type, pack.scope, packId);
      await this.cleanupDirectory(packStoragePath);

      return true;
    } catch (error) {
      console.error('Error deleting audio pack:', error);
      return false;
    }
  }

  /**
   * Assign audio packs to a game
   */
  async assignToGame(gameId: string, settings: {
    lobbyMusicPackId?: string;
    inGameMusicPackId?: string;
    sfxPackId?: string;
    voicePackId?: string;
    countdownEnabled?: boolean;
    countdownDurationSeconds?: number;
    countdownMessage?: string;
    volumeSettings?: Record<string, number>;
  }): Promise<boolean> {
    try {
      // Validate that all referenced packs exist
      const packIds = [
        settings.lobbyMusicPackId,
        settings.inGameMusicPackId,
        settings.sfxPackId,
        settings.voicePackId,
      ].filter(Boolean) as string[];

      let packIdToPrimaryKey = new Map<string, string>();
      if (packIds.length > 0) {
        const existingPacks = await prisma.audioPack.findMany({
          where: { packId: { in: packIds } },
          select: { id: true, packId: true },
        });

        const missingPacks = packIds.filter(id => !existingPacks.some(pack => pack.packId === id));
        if (missingPacks.length > 0) {
          throw new Error(`Audio packs not found: ${missingPacks.join(', ')}`);
        }

        packIdToPrimaryKey = new Map(existingPacks.map(pack => [pack.packId, pack.id]));
      }

      const resolvePackId = (packId?: string) => {
        if (!packId) return undefined;
        return packIdToPrimaryKey.get(packId);
      };

      // Create or update game audio settings
      await prisma.gameAudioSettings.upsert({
        where: { gameId },
        create: {
          gameId,
          lobbyMusicPackId: resolvePackId(settings.lobbyMusicPackId),
          inGameMusicPackId: resolvePackId(settings.inGameMusicPackId),
          sfxPackId: resolvePackId(settings.sfxPackId),
          voicePackId: resolvePackId(settings.voicePackId),
          countdownEnabled: settings.countdownEnabled ?? true,
          countdownDurationSeconds: settings.countdownDurationSeconds ?? 10,
          countdownMessage: settings.countdownMessage,
          volumeSettings: settings.volumeSettings || {
            master: 1.0,
            music: 0.8,
            sfx: 0.9,
            voice: 1.0,
          },
        },
        update: {
          lobbyMusicPackId: resolvePackId(settings.lobbyMusicPackId) ?? null,
          inGameMusicPackId: resolvePackId(settings.inGameMusicPackId) ?? null,
          sfxPackId: resolvePackId(settings.sfxPackId) ?? null,
          voicePackId: resolvePackId(settings.voicePackId) ?? null,
          countdownEnabled: settings.countdownEnabled,
          countdownDurationSeconds: settings.countdownDurationSeconds,
          countdownMessage: settings.countdownMessage,
          volumeSettings: settings.volumeSettings,
        },
      });

      return true;
    } catch (error) {
      console.error('Error assigning audio packs to game:', error);
      return false;
    }
  }

  /**
   * Get storage path for a pack
   */
  private getPackStoragePath(type: AudioPackType, scope: AudioScope, packId: string): string {
    return join(
      this.AUDIO_STORAGE_PATH,
      type.toLowerCase(),
      scope.toLowerCase().replace('_', '-'),
      packId
    );
  }

  /**
   * Extract ZIP file to temporary directory
   */
  private async extractZipFile(buffer: Buffer): Promise<string> {
    const { default: AdmZip } = await import('adm-zip');
    const zip = new AdmZip(buffer);

    const tempDir = join(process.cwd(), 'temp', `audio-upload-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Extract all files to the temporary directory
    zip.extractAllTo(tempDir, true);
    return tempDir;
  }

  /**
   * Clean up a directory recursively
   */
  private async cleanupDirectory(dirPath: string): Promise<void> {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup directory:', dirPath, error);
    }
  }
}

export const audioPacksService = new AudioPacksService();
