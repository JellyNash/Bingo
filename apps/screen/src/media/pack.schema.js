import { z } from 'zod';
export const MediaPackSchema = z.object({
    name: z.string(),
    locale: z.string().optional(),
    version: z.number(),
    numbers: z.string(), // Pattern like "numbers/{n}.mp3"
    assets: z.object({
        bingo: z.string(),
        stinger: z.string().optional(),
        bg: z.string().optional()
    }),
    gain: z.object({
        voice: z.number().min(0).max(2).optional(),
        sfx: z.number().min(0).max(2).optional(),
        music: z.number().min(0).max(2).optional(),
        master: z.number().min(0).max(2).optional()
    }).optional(),
    ducking: z.object({
        enabled: z.boolean().optional(),
        musicTarget: z.number().min(0).max(1).optional(),
        attackMs: z.number().min(0).optional(),
        releaseMs: z.number().min(0).optional()
    }).optional(),
    preload: z.object({
        strategy: z.enum(['all', 'progressive', 'none']).optional(),
        batchSize: z.number().min(1).optional(),
        concurrency: z.number().min(1).optional()
    }).optional()
});
export const DEFAULT_PACK_CONFIG = {
    name: 'Default Pack',
    version: 1,
    numbers: 'numbers/{n}.mp3',
    assets: {
        bingo: 'bingo.mp3',
        stinger: 'stinger.mp3',
        bg: 'bg.mp3'
    },
    gain: {
        voice: 1.0,
        sfx: 0.9,
        music: 0.6,
        master: 1.0
    },
    ducking: {
        enabled: true,
        musicTarget: 0.3,
        attackMs: 80,
        releaseMs: 250
    },
    preload: {
        strategy: 'progressive',
        batchSize: 10,
        concurrency: 4
    }
};
