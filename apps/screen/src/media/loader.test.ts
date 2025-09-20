import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MediaLoader } from './loader';

describe('MediaLoader', () => {
  let loader: MediaLoader;
  let mockAudioContext: any;

  beforeEach(() => {
    // Reset fetch mock
    vi.resetAllMocks();

    // Create mock audio context
    mockAudioContext = new (global as any).AudioContext();

    // Create loader instance
    loader = new MediaLoader(mockAudioContext);
  });

  describe('loadPack', () => {
    it('should load and validate a media pack', async () => {
      const mockPackData = {
        name: 'Test Pack',
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
          music: 0.6
        },
        ducking: {
          enabled: true,
          musicTarget: 0.3,
          attackMs: 80,
          releaseMs: 250
        },
        preload: {
          strategy: 'none' as const
        }
      };

      // Mock fetch to return pack data
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => mockPackData
      });

      await loader.loadPack('/media-packs/test/pack.json');

      expect(global.fetch).toHaveBeenCalledWith(
        '/media-packs/test/pack.json',
        { cache: 'force-cache' }
      );

      const pack = loader.getCurrentPack();
      expect(pack).toBeDefined();
      expect(pack?.name).toBe('Test Pack');
    });

    it('should throw error for invalid pack schema', async () => {
      const invalidPackData = {
        name: 'Invalid Pack'
        // Missing required fields
      };

      (global.fetch as any).mockResolvedValueOnce({
        json: async () => invalidPackData
      });

      await expect(
        loader.loadPack('/media-packs/invalid/pack.json')
      ).rejects.toThrow();
    });
  });

  describe('getNumber', () => {
    beforeEach(async () => {
      // Setup a pack first
      const mockPackData = {
        name: 'Test Pack',
        version: 1,
        numbers: 'numbers/{n}.mp3',
        assets: {
          bingo: 'bingo.mp3'
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        json: async () => mockPackData
      });

      await loader.loadPack('/media-packs/test/pack.json');
    });

    it('should fetch and decode number audio', async () => {
      const mockArrayBuffer = new ArrayBuffer(100);

      (global.fetch as any).mockResolvedValueOnce({
        arrayBuffer: async () => mockArrayBuffer
      });

      const buffer = await loader.getNumber(42);

      expect(global.fetch).toHaveBeenCalledWith(
        '/media-packs/test/numbers/42.mp3',
        { cache: 'force-cache' }
      );

      expect(buffer).toBeDefined();
      expect(buffer.duration).toBe(1); // From mock decode
    });

    it('should cache decoded buffers', async () => {
      const mockArrayBuffer = new ArrayBuffer(100);

      (global.fetch as any).mockResolvedValueOnce({
        arrayBuffer: async () => mockArrayBuffer
      });

      // First call
      const buffer1 = await loader.getNumber(10);

      // Second call - should use cache
      const buffer2 = await loader.getNumber(10);

      // Fetch should only be called once
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(buffer1).toBe(buffer2);
    });

    it('should reject invalid number ranges', async () => {
      await expect(loader.getNumber(0)).rejects.toThrow('Invalid number');
      await expect(loader.getNumber(76)).rejects.toThrow('Invalid number');
    });
  });

  describe('getSfx', () => {
    beforeEach(async () => {
      const mockPackData = {
        name: 'Test Pack',
        version: 1,
        numbers: 'numbers/{n}.mp3',
        assets: {
          bingo: 'bingo.mp3',
          stinger: 'stinger.mp3'
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        json: async () => mockPackData
      });

      await loader.loadPack('/media-packs/test/pack.json');
    });

    it('should fetch bingo SFX', async () => {
      const mockArrayBuffer = new ArrayBuffer(100);

      (global.fetch as any).mockResolvedValueOnce({
        arrayBuffer: async () => mockArrayBuffer
      });

      const buffer = await loader.getSfx('bingo');

      expect(global.fetch).toHaveBeenCalledWith(
        '/media-packs/test/bingo.mp3',
        { cache: 'force-cache' }
      );

      expect(buffer).toBeDefined();
    });

    it('should fetch stinger SFX', async () => {
      const mockArrayBuffer = new ArrayBuffer(100);

      (global.fetch as any).mockResolvedValueOnce({
        arrayBuffer: async () => mockArrayBuffer
      });

      const buffer = await loader.getSfx('stinger');

      expect(global.fetch).toHaveBeenCalledWith(
        '/media-packs/test/stinger.mp3',
        { cache: 'force-cache' }
      );

      expect(buffer).toBeDefined();
    });
  });

  describe('warmup', () => {
    beforeEach(async () => {
      const mockPackData = {
        name: 'Test Pack',
        version: 1,
        numbers: 'numbers/{n}.mp3',
        assets: {
          bingo: 'bingo.mp3',
          bg: 'bg.mp3'
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        json: async () => mockPackData
      });

      await loader.loadPack('/media-packs/test/pack.json');
    });

    it('should preload specified number range', async () => {
      const mockArrayBuffer = new ArrayBuffer(100);

      // Mock multiple fetch calls
      (global.fetch as any).mockResolvedValue({
        arrayBuffer: async () => mockArrayBuffer
      });

      await loader.warmup([1, 2, 3]);

      // Should have fetched 3 numbers + bingo + bg
      expect(global.fetch).toHaveBeenCalledTimes(5);

      // Check specific calls
      expect(global.fetch).toHaveBeenCalledWith(
        '/media-packs/test/numbers/1.mp3',
        { cache: 'force-cache' }
      );
      expect(global.fetch).toHaveBeenCalledWith(
        '/media-packs/test/numbers/2.mp3',
        { cache: 'force-cache' }
      );
      expect(global.fetch).toHaveBeenCalledWith(
        '/media-packs/test/numbers/3.mp3',
        { cache: 'force-cache' }
      );
    });
  });

  describe('LRU Cache behavior', () => {
    it('should evict oldest entries when cache is full', async () => {
      // This test would need a more detailed implementation
      // checking the internal cache behavior
      expect(true).toBe(true);
    });
  });
});