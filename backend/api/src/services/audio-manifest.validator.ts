/**
 * Audio Pack Manifest Validator
 * Validates audio-pack.json structure and required cue keys
 */

import { z } from 'zod';
import type { AudioPackType as AudioPackTypeT, AudioScope as AudioScopeT } from '@prisma/client';
import PrismaPkg from '@prisma/client';
const { AudioPackType, AudioScope } = PrismaPkg as any;

// Audio asset schema
const AudioAssetSchema = z.object({
  filename: z.string().min(1).max(255),
  cueKey: z.string().min(1).max(100),
  duration: z.number().positive().optional(),
  fileSize: z.number().positive().optional(),
  mimeType: z.string().min(1).max(50),
  hash: z.string().length(64).optional(), // SHA-256 hash
});

// Main manifest schema
const AudioManifestSchema = z.object({
  packId: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.nativeEnum(AudioPackType),
  scope: z.nativeEnum(AudioScope),
  locale: z.string().max(10).optional(),
  version: z.string().optional(),
  author: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  assets: z.array(AudioAssetSchema).min(1),
});

export type AudioManifest = any;
export type AudioAssetData = any;

// Required cue keys for different pack types and scopes
const REQUIRED_CUE_KEYS = {
  MUSIC: {
    LOBBY: ['lobby-start', 'lobby-loop'],
    IN_GAME: ['game-start', 'game-loop', 'game-end'],
    JOIN: [],
    BINGO: [],
    COUNTDOWN: [],
    NUMBERS: [],
  },
  SFX: {
    LOBBY: ['player-join', 'player-leave', 'game-starting'],
    IN_GAME: ['number-draw', 'game-pause', 'game-resume', 'game-complete'],
    JOIN: ['player-join', 'join-success', 'join-error'],
    BINGO: ['bingo-claim', 'bingo-valid', 'bingo-invalid', 'winner-announced'],
    COUNTDOWN: ['countdown-tick', 'countdown-final', 'countdown-complete'],
    NUMBERS: [],
  },
  VOICE: {
    LOBBY: ['welcome', 'game-starting', 'please-wait'],
    IN_GAME: ['game-started', 'game-paused', 'game-resumed', 'congratulations'],
    JOIN: ['welcome', 'please-enter-name', 'joined-successfully'],
    BINGO: ['bingo-claimed', 'checking-card', 'winner-found', 'invalid-claim'],
    COUNTDOWN: ['countdown-starting', 'get-ready'],
    NUMBERS: [
      'B1','B2','B3','B4','B5','B6','B7','B8','B9','B10',
      'B11','B12','B13','B14','B15',
      'I16','I17','I18','I19','I20','I21','I22','I23','I24','I25',
      'I26','I27','I28','I29','I30',
      'N31','N32','N33','N34','N35','N36','N37','N38','N39','N40',
      'N41','N42','N43','N44','N45',
      'G46','G47','G48','G49','G50','G51','G52','G53','G54','G55',
      'G56','G57','G58','G59','G60',
      'O61','O62','O63','O64','O65','O66','O67','O68','O69','O70',
      'O71','O72','O73','O74','O75'
    ],
  },
} as const satisfies Record<AudioPackTypeT, Record<AudioScopeT, readonly string[]>>;

export class AudioManifestValidator {
  /**
   * Validate an audio pack manifest
   */
  static validateManifest(manifest: unknown): { isValid: boolean; errors: string[]; data?: AudioManifest } {
    const errors: string[] = [];

    // Basic schema validation
    const result = AudioManifestSchema.safeParse(manifest);
    if (!result.success) {
      const zodErrors = result.error.errors.map((err: any) => `${err.path.join('.')}: ${err.message}`);
      return { isValid: false, errors: zodErrors };
    }

    const validManifest = result.data;

    // Validate required cue keys for the pack type and scope
    const requiredKeys = (REQUIRED_CUE_KEYS as any)[validManifest.type][validManifest.scope];
    if (requiredKeys.length > 0) {
      const providedKeys = validManifest.assets.map((asset: any) => asset.cueKey);
      const missingKeys = requiredKeys.filter((key: any) => !providedKeys.includes(key));

      if (missingKeys.length > 0) {
        errors.push(`Missing required cue keys for ${validManifest.type}/${validManifest.scope}: ${missingKeys.join(', ')}`);
      }
    }

    // Validate unique cue keys within the pack
    const cueKeys = validManifest.assets.map((asset: any) => asset.cueKey);
    const duplicateKeys = cueKeys.filter((key: any, index: number) => cueKeys.indexOf(key) !== index);
    if (duplicateKeys.length > 0) {
      errors.push(`Duplicate cue keys found: ${[...new Set(duplicateKeys)].join(', ')}`);
    }

    // Validate locale for voice packs
    if (validManifest.type === AudioPackType.VOICE && !validManifest.locale) {
      errors.push('Voice packs must specify a locale');
    }

    // Validate file extensions match MIME types
    for (const asset of validManifest.assets) {
      const extension = asset.filename.split('.').pop()?.toLowerCase();
      const isValidAudio = ['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(extension || '');
      if (!isValidAudio) {
        errors.push(`Invalid audio file extension for ${asset.filename}`);
      }

      // Basic MIME type validation
      const isValidMimeType = asset.mimeType.startsWith('audio/');
      if (!isValidMimeType) {
        errors.push(`Invalid MIME type for ${asset.filename}: ${asset.mimeType}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: errors.length === 0 ? validManifest : undefined,
    };
  }

  /**
   * Get required cue keys for a specific pack type and scope
   */
  static getRequiredCueKeys(type: AudioPackTypeT, scope: AudioScopeT): string[] {
    return REQUIRED_CUE_KEYS[type][scope] || [];
  }

  /**
   * Check if a manifest has all required cue keys
   */
  static hasRequiredCueKeys(manifest: AudioManifest): boolean {
    const requiredKeys = (REQUIRED_CUE_KEYS as any)[manifest.type][manifest.scope];
    const providedKeys = manifest.assets.map((asset: any) => asset.cueKey);
    return requiredKeys.every((key: any) => providedKeys.includes(key));
  }
}