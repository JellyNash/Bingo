/**
 * GameMaster Audio Packs Routes
 * Handles audio pack upload, management, and assignment
 */

import type { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { audioPacksService } from '../services/audio-packs.service.js';
import { AudioPackType, AudioScope } from '@prisma/client';

interface UploadResponse {
  success: boolean;
  packId?: string;
  errors: string[];
  warnings: string[];
}

interface ListQuery {
  type?: AudioPackType;
  scope?: AudioScope;
  locale?: string;
  isActive?: boolean;
}

interface DeleteParams {
  id: string;
}

export default async function gameMasterAudioPacksRoutes(fastify: FastifyInstance) {
  // Register multipart support
  await fastify.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB max file size
      files: 1
    }
  });

  // Upload a new audio pack
  fastify.post<{ Reply: UploadResponse }>('/gamemaster/audio-packs/upload', {
    preHandler: fastify.createGameMasterAuth(),
  }, async (request, reply) => {
    try {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({
          success: false,
          errors: ['No file uploaded'],
          warnings: []
        });
      }

      // Convert stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of data.file) {
        chunks.push(chunk as Buffer);
      }
      const buffer = Buffer.concat(chunks);

      // Process the uploaded file
      const result = await audioPacksService.uploadPack({
        filename: data.filename,
        mimetype: data.mimetype,
        buffer,
        size: buffer.length,
      });

      if (result.success) {
        return reply.status(201).send(result);
      } else {
        return reply.status(400).send(result);
      }
    } catch (error: any) {
      fastify.log.error('Error uploading audio pack:', error);
      return reply.status(500).send({
        success: false,
        errors: ['Failed to upload audio pack'],
        warnings: []
      });
    }
  });

  // List all audio packs with optional filtering
  fastify.get<{ Querystring: ListQuery }>('/gamemaster/audio-packs', {
    preHandler: fastify.createGameMasterAuth(),
  }, async (request, reply) => {
    try {
      const filters: any = {};
      const query = request.query as any;

      if (query?.type) filters.type = query.type;
      if (query?.scope) filters.scope = query.scope;
      if (query?.locale) filters.locale = query.locale;
      if (query?.isActive !== undefined) filters.isActive = query.isActive;

      const packs = await audioPacksService.listPacks(filters);
      return reply.send({ packs });

    } catch (error: any) {
      fastify.log.error('Error listing audio packs:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to retrieve audio packs'
      });
    }
  });

  // Get specific audio pack details
  fastify.get<{ Params: { packId: string } }>('/gamemaster/audio-packs/:packId', {
    preHandler: fastify.createGameMasterAuth(),
  }, async (request, reply) => {
    try {
      const params = request.params as any;
      const pack = await audioPacksService.getPack(params.packId);

      if (!pack) {
        return reply.status(404).send({
          error: 'not_found',
          message: 'Audio pack not found'
        });
      }

      return reply.send({ pack });

    } catch (error: any) {
      fastify.log.error('Error getting audio pack:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to retrieve audio pack'
      });
    }
  });

  // Delete an audio pack
  fastify.delete<{ Params: DeleteParams }>('/gamemaster/audio-packs/:id', {
    preHandler: fastify.createGameMasterAuth(),
  }, async (request, reply) => {
    try {
      const params = request.params as any;
      const success = await audioPacksService.deletePack(params.id);

      if (!success) {
        return reply.status(404).send({
          error: 'not_found',
          message: 'Audio pack not found or could not be deleted'
        });
      }

      return reply.send({
        success: true,
        message: 'Audio pack deleted successfully'
      });

    } catch (error: any) {
      fastify.log.error('Error deleting audio pack:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to delete audio pack'
      });
    }
  });

  // Get available audio pack types and scopes (for UI dropdowns)
  fastify.get('/gamemaster/audio-packs/metadata', {
    preHandler: fastify.createGameMasterAuth(),
  }, async (request, reply) => {
    return reply.send({
      types: Object.values(AudioPackType),
      scopes: Object.values(AudioScope),
      requiredCueKeys: {
        [AudioPackType.MUSIC]: {
          [AudioScope.LOBBY]: ['lobby-start', 'lobby-loop'],
          [AudioScope.IN_GAME]: ['game-start', 'game-loop', 'game-end'],
        },
        [AudioPackType.SFX]: {
          [AudioScope.LOBBY]: ['player-join', 'player-leave', 'game-starting'],
          [AudioScope.IN_GAME]: ['number-draw', 'game-pause', 'game-resume', 'game-complete'],
          [AudioScope.JOIN]: ['player-join', 'join-success', 'join-error'],
          [AudioScope.BINGO]: ['bingo-claim', 'bingo-valid', 'bingo-invalid', 'winner-announced'],
          [AudioScope.COUNTDOWN]: ['countdown-tick', 'countdown-final', 'countdown-complete'],
        },
        [AudioPackType.VOICE]: {
          [AudioScope.LOBBY]: ['welcome', 'game-starting', 'please-wait'],
          [AudioScope.IN_GAME]: ['game-started', 'game-paused', 'game-resumed', 'congratulations'],
          [AudioScope.JOIN]: ['welcome', 'please-enter-name', 'joined-successfully'],
          [AudioScope.BINGO]: ['bingo-claimed', 'checking-card', 'winner-found', 'invalid-claim'],
          [AudioScope.COUNTDOWN]: ['countdown-starting', 'get-ready'],
          [AudioScope.NUMBERS]: ['B1-B15', 'I16-I30', 'N31-N45', 'G46-G60', 'O61-O75'],
        },
      }
    });
  });
}
