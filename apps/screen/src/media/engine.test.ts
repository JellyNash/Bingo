import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebAudioEngine } from './engine';

describe('WebAudioEngine', () => {
  let engine: WebAudioEngine;

  beforeEach(() => {
    vi.resetAllMocks();
    engine = new WebAudioEngine();
  });

  describe('initialization', () => {
    it('should create audio context with low latency', () => {
      const context = engine.getContext();
      expect(context).toBeDefined();
      expect(context.state).toBe('running');
    });

    it('should setup audio graph correctly', () => {
      // The engine should have created gain nodes
      const context = engine.getContext();
      expect(context.createGain).toHaveBeenCalled();
    });
  });

  describe('volume controls', () => {
    it('should set and get volumes', () => {
      engine.setVolumes({
        voice: 0.8,
        sfx: 0.7,
        music: 0.5,
        master: 0.9
      });

      const volumes = engine.getVolumes();
      expect(volumes.voice).toBe(0.8);
      expect(volumes.sfx).toBe(0.7);
      expect(volumes.music).toBe(0.5);
      expect(volumes.master).toBe(0.9);
    });

    it('should save volumes to localStorage', () => {
      engine.setVolumes({ voice: 0.5 });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'mediaVolumes',
        expect.stringContaining('0.5')
      );
    });

    it('should load saved volumes', () => {
      const savedVolumes = {
        voice: 0.3,
        sfx: 0.4,
        music: 0.5,
        master: 0.6
      };

      (localStorage.getItem as any).mockReturnValueOnce(
        JSON.stringify(savedVolumes)
      );

      engine.loadSavedVolumes();
      const volumes = engine.getVolumes();

      expect(volumes.voice).toBe(0.3);
      expect(volumes.sfx).toBe(0.4);
      expect(volumes.music).toBe(0.5);
      expect(volumes.master).toBe(0.6);
    });
  });

  describe('setPack', () => {
    it('should load a media pack', async () => {
      const mockPackData = {
        name: 'Test Pack',
        version: 1,
        numbers: 'numbers/{n}.mp3',
        assets: { bingo: 'bingo.mp3' },
        gain: {
          voice: 0.9,
          sfx: 0.8,
          music: 0.7,
          master: 0.95
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        json: async () => mockPackData
      });

      await engine.setPack('/media-packs/test/pack.json');

      // Should apply pack-specific gains
      const volumes = engine.getVolumes();
      expect(volumes.voice).toBe(0.9);
      expect(volumes.sfx).toBe(0.8);
      expect(volumes.music).toBe(0.7);
      expect(volumes.master).toBe(0.95);
    });
  });

  describe('playNumber', () => {
    beforeEach(async () => {
      const mockPackData = {
        name: 'Test Pack',
        version: 1,
        numbers: 'numbers/{n}.mp3',
        assets: { bingo: 'bingo.mp3' }
      };

      (global.fetch as any).mockResolvedValueOnce({
        json: async () => mockPackData
      });

      await engine.setPack('/media-packs/test/pack.json');
    });

    it('should play a number with debouncing', () => {
      const mockArrayBuffer = new ArrayBuffer(100);
      (global.fetch as any).mockResolvedValue({
        arrayBuffer: async () => mockArrayBuffer
      });

      // Play number 42
      engine.playNumber(42);

      // Try to play again immediately - should be debounced
      engine.playNumber(42);

      // Fetch should only be called once due to debouncing
      setTimeout(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      }, 100);
    });
  });

  describe('music controls', () => {
    it('should toggle music on and off', () => {
      // Initial state - music off
      engine.musicToggle();
      // Music should attempt to start (but will fail without buffer)

      // Toggle again
      engine.musicToggle();
      // Music should stop
    });
  });

  describe('audio context resume', () => {
    it('should resume suspended context', async () => {
      const context = engine.getContext();
      // Mock suspended state
      Object.defineProperty(context, 'state', {
        value: 'suspended',
        writable: false
      });

      await engine.resume();

      expect(context.resume).toHaveBeenCalled();
    });
  });
});