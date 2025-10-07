/**
 * Game Audio Settings Routes
 * Handles audio configuration for games
 */

import type { FastifyInstance } from 'fastify';
import { audioPacksService } from '../services/audio-packs.service.js';
import { prisma } from '../services/prisma.js';

interface AudioSettingsParams {
  id: string; // gameId
}

interface AudioSettingsBody {
  lobbyMusicPackId?: string;
  inGameMusicPackId?: string;
  sfxPackId?: string;
  voicePackId?: string;
  countdownEnabled?: boolean;
  countdownDurationSeconds?: number;
  countdownMessage?: string;
  volumeSettings?: {
    master?: number;
    music?: number;
    sfx?: number;
    voice?: number;
  };
}

export default async function gamesAudioSettingsRoutes(fastify: FastifyInstance) {

  // Get audio settings for a game
  fastify.get<{ Params: AudioSettingsParams }>('/games/:id/audio-settings', async (request, reply) => {
    try {
      const params = request.params as any;
      const gameId = params.id;

      // Verify game exists
      const game = await prisma.game.findUnique({
        where: { id: gameId },
        select: { id: true, pin: true, status: true }
      });

      if (!game) {
        return reply.status(404).send({
          error: 'game_not_found',
          message: 'Game not found'
        });
      }

      // Get audio settings with pack details
      const audioSettings = await prisma.gameAudioSettings.findUnique({
        where: { gameId },
        include: {
          lobbyMusicPack: {
            select: {
              id: true,
              packId: true,
              name: true,
              type: true,
              scope: true,
              locale: true,
            }
          },
          inGameMusicPack: {
            select: {
              id: true,
              packId: true,
              name: true,
              type: true,
              scope: true,
              locale: true,
            }
          },
          sfxPack: {
            select: {
              id: true,
              packId: true,
              name: true,
              type: true,
              scope: true,
              locale: true,
            }
          },
          voicePack: {
            select: {
              id: true,
              packId: true,
              name: true,
              type: true,
              scope: true,
              locale: true,
            }
          },
        }
      });

      // Return default settings if none exist
      if (!audioSettings) {
        return reply.send({
          gameId,
          settings: {
            countdownEnabled: true,
            countdownDurationSeconds: 10,
            countdownMessage: null,
            volumeSettings: {
              master: 1.0,
              music: 0.8,
              sfx: 0.9,
              voice: 1.0,
            },
            packs: {
              lobbyMusic: null,
              inGameMusic: null,
              sfx: null,
              voice: null,
            }
          }
        });
      }

      return reply.send({
        gameId,
        settings: {
          countdownEnabled: audioSettings.countdownEnabled,
          countdownDurationSeconds: audioSettings.countdownDurationSeconds,
          countdownMessage: audioSettings.countdownMessage,
          volumeSettings: audioSettings.volumeSettings,
          packs: {
            lobbyMusic: audioSettings.lobbyMusicPack,
            inGameMusic: audioSettings.inGameMusicPack,
            sfx: audioSettings.sfxPack,
            voice: audioSettings.voicePack,
          }
        }
      });

    } catch (error: any) {
      fastify.log.error({ err: error }, 'Error getting game audio settings');
      return reply.status(500).send({
        error: 'internal_server_error',
        message: 'Failed to retrieve audio settings'
      });
    }
  });

  // Update audio settings for a game
  fastify.patch<{ Params: AudioSettingsParams; Body: AudioSettingsBody }>('/games/:id/audio-settings', async (request, reply) => {
    try {
      const params = request.params as any;
      const gameId = params.id;

      // Verify game exists
      const game = await prisma.game.findUnique({
        where: { id: gameId },
        select: { id: true, pin: true, status: true }
      });

      if (!game) {
        return reply.status(404).send({
          error: 'game_not_found',
          message: 'Game not found'
        });
      }

      // Validate audio pack IDs if provided
      const packIds = [
        request.body.lobbyMusicPackId,
        request.body.inGameMusicPackId,
        request.body.sfxPackId,
        request.body.voicePackId,
      ].filter(Boolean) as string[];

      if (packIds.length > 0) {
        const existingPacks = await prisma.audioPack.findMany({
          where: { packId: { in: packIds } },
          select: { packId: true, isActive: true }
        });

        const missingPacks = packIds.filter(id => !existingPacks.some(pack => pack.packId === id));
        if (missingPacks.length > 0) {
          return reply.status(400).send({
            error: 'invalid_audio_packs',
            message: `Audio packs not found: ${missingPacks.join(', ')}`
          });
        }

        const inactivePacks = existingPacks
          .filter(pack => !pack.isActive)
          .map(pack => pack.packId);

        if (inactivePacks.length > 0) {
          return reply.status(400).send({
            error: 'inactive_audio_packs',
            message: `Audio packs are inactive: ${inactivePacks.join(', ')}`
          });
        }
      }

      // Validate countdown duration
      if (request.body.countdownDurationSeconds !== undefined) {
        if (request.body.countdownDurationSeconds < 3 || request.body.countdownDurationSeconds > 60) {
          return reply.status(400).send({
            error: 'invalid_countdown_duration',
            message: 'Countdown duration must be between 3 and 60 seconds'
          });
        }
      }

      // Validate volume settings
      if (request.body.volumeSettings) {
        const volumes = Object.values(request.body.volumeSettings);
        const invalidVolumes = volumes.some(vol => typeof vol !== 'number' || vol < 0 || vol > 1);

        if (invalidVolumes) {
          return reply.status(400).send({
            error: 'invalid_volume_settings',
            message: 'Volume levels must be numbers between 0 and 1'
          });
        }
      }

      // Assign audio packs to game using the service
      const success = await audioPacksService.assignToGame(gameId, request.body);

      if (!success) {
        return reply.status(500).send({
          error: 'assignment_failed',
          message: 'Failed to assign audio packs to game'
        });
      }

      // Return updated settings
      const updatedSettings = await prisma.gameAudioSettings.findUnique({
        where: { gameId },
        include: {
          lobbyMusicPack: {
            select: {
              id: true,
              packId: true,
              name: true,
              type: true,
              scope: true,
              locale: true,
            }
          },
          inGameMusicPack: {
            select: {
              id: true,
              packId: true,
              name: true,
              type: true,
              scope: true,
              locale: true,
            }
          },
          sfxPack: {
            select: {
              id: true,
              packId: true,
              name: true,
              type: true,
              scope: true,
              locale: true,
            }
          },
          voicePack: {
            select: {
              id: true,
              packId: true,
              name: true,
              type: true,
              scope: true,
              locale: true,
            }
          },
        }
      });

      return reply.send({
        success: true,
        gameId,
        settings: {
          countdownEnabled: updatedSettings!.countdownEnabled,
          countdownDurationSeconds: updatedSettings!.countdownDurationSeconds,
          countdownMessage: updatedSettings!.countdownMessage,
          volumeSettings: updatedSettings!.volumeSettings,
          packs: {
            lobbyMusic: updatedSettings!.lobbyMusicPack,
            inGameMusic: updatedSettings!.inGameMusicPack,
            sfx: updatedSettings!.sfxPack,
            voice: updatedSettings!.voicePack,
          }
        }
      });

    } catch (error: any) {
      fastify.log.error({ err: error }, 'Error updating game audio settings');
      return reply.status(500).send({
        error: 'internal_server_error',
        message: 'Failed to update audio settings'
      });
    }
  });
}
