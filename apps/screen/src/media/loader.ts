import type { MediaBuffers, MediaPack } from './types';
import { MediaPackSchema } from './pack.schema';

class LRUCache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>();
  private maxSize: number;

  constructor(maxSize = 35) {
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Update timestamp on access (move to end)
    this.cache.delete(key);
    this.cache.set(key, { ...entry, timestamp: Date.now() });
    return entry.value;
  }

  set(key: string, value: T): void {
    // Remove if exists (will re-add at end)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

export class MediaLoader implements MediaBuffers {
  private audioContext: AudioContext;
  private pack: MediaPack | null = null;
  private baseUrl: string = '';
  private bufferCache = new LRUCache<AudioBuffer>(35);
  private loadingPromises = new Map<string, Promise<AudioBuffer>>();

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  async loadPack(packUrl: string): Promise<void> {
    try {
      const response = await fetch(packUrl, { cache: 'force-cache' });
      const packData = await response.json();

      // Validate with schema
      const validated = MediaPackSchema.parse(packData);
      this.pack = validated;

      // Extract base URL from pack URL
      this.baseUrl = packUrl.substring(0, packUrl.lastIndexOf('/'));

      // Start progressive preload if configured
      if (validated.preload?.strategy === 'progressive') {
        this.startProgressivePreload();
      } else if (validated.preload?.strategy === 'all') {
        this.warmup(Array.from({ length: 75 }, (_, i) => i + 1));
      }
    } catch (error) {
      console.error('Failed to load media pack:', error);
      throw error;
    }
  }

  private async startProgressivePreload(): Promise<void> {
    if (!this.pack) return;

    const batchSize = this.pack.preload?.batchSize ?? 10;
    const concurrency = this.pack.preload?.concurrency ?? 4;

    // Load first batch immediately
    await this.warmup(Array.from({ length: Math.min(15, batchSize) }, (_, i) => i + 1));

    // Progressive load rest in background
    for (let i = 16; i <= 75; i += batchSize) {
      const batch = Array.from(
        { length: Math.min(batchSize, 75 - i + 1) },
        (_, j) => i + j
      );

      // Load batch with concurrency limit
      const chunks = [];
      for (let j = 0; j < batch.length; j += concurrency) {
        chunks.push(batch.slice(j, j + concurrency));
      }

      for (const chunk of chunks) {
        await Promise.all(chunk.map(n => this.getNumber(n).catch(() => {})));
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private resolveUrl(pattern: string, number?: number): string {
    if (number !== undefined) {
      return `${this.baseUrl}/${pattern.replace('{n}', number.toString())}`;
    }
    return `${this.baseUrl}/${pattern}`;
  }

  private async fetchAndDecode(url: string): Promise<AudioBuffer> {
    const cacheKey = url;

    // Check memory cache
    const cached = this.bufferCache.get(cacheKey);
    if (cached) return cached;

    // Check if already loading
    const loading = this.loadingPromises.get(cacheKey);
    if (loading) return loading;

    // Start new load
    const loadPromise = (async () => {
      try {
        const response = await fetch(url, { cache: 'force-cache' });
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

        // Cache the decoded buffer
        this.bufferCache.set(cacheKey, audioBuffer);
        return audioBuffer;
      } finally {
        // Clean up loading promise
        this.loadingPromises.delete(cacheKey);
      }
    })();

    this.loadingPromises.set(cacheKey, loadPromise);
    return loadPromise;
  }

  async getNumber(n: number): Promise<AudioBuffer> {
    if (!this.pack) throw new Error('No media pack loaded');
    if (n < 1 || n > 75) throw new Error(`Invalid number: ${n}`);

    const url = this.resolveUrl(this.pack.numbers, n);
    return this.fetchAndDecode(url);
  }

  async getSfx(id: 'bingo' | 'stinger'): Promise<AudioBuffer> {
    if (!this.pack) throw new Error('No media pack loaded');

    const asset = this.pack.assets[id];
    if (!asset) throw new Error(`SFX not found: ${id}`);

    const url = this.resolveUrl(asset);
    return this.fetchAndDecode(url);
  }

  async getMusic(): Promise<AudioBuffer> {
    if (!this.pack) throw new Error('No media pack loaded');

    const bg = this.pack.assets.bg;
    if (!bg) throw new Error('Background music not found');

    const url = this.resolveUrl(bg);
    return this.fetchAndDecode(url);
  }

  async warmup(range?: number[]): Promise<void> {
    const numbers = range ?? Array.from({ length: 75 }, (_, i) => i + 1);

    // Load numbers
    const numberPromises = numbers.map(n =>
      this.getNumber(n).catch(err => {
        console.warn(`Failed to preload number ${n}:`, err);
      })
    );

    // Load assets
    const assetPromises = [
      this.getSfx('bingo').catch(() => {}),
      this.getSfx('stinger').catch(() => {}),
      this.getMusic().catch(() => {})
    ];

    await Promise.all([...numberPromises, ...assetPromises]);
  }

  clearCache(): void {
    this.bufferCache.clear();
    this.loadingPromises.clear();
  }

  getCurrentPack(): MediaPack | null {
    return this.pack;
  }
}