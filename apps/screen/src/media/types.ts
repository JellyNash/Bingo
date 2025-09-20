export type MediaCue =
  | { type: 'number'; number: number }
  | { type: 'bingo' }
  | { type: 'stinger' }
  | { type: 'intro' }
  | { type: 'music:start' | 'music:stop' | 'music:toggle' };

export interface MediaPack {
  name: string;
  locale?: string;
  version: number;
  numbers: string; // "numbers/{n}.mp3"
  assets: {
    bingo: string;
    stinger?: string;
    bg?: string;
  };
  gain?: {
    voice?: number;
    sfx?: number;
    music?: number;
    master?: number;
  };
  ducking?: {
    enabled?: boolean;
    musicTarget?: number;
    attackMs?: number;
    releaseMs?: number;
  };
  preload?: {
    strategy?: 'all' | 'progressive' | 'none';
    batchSize?: number;
    concurrency?: number;
  };
}

export interface MediaBuffers {
  getNumber(n: number): Promise<AudioBuffer>;
  getSfx(id: 'bingo' | 'stinger'): Promise<AudioBuffer>;
  getMusic(): Promise<AudioBuffer>;
  warmup(range?: number[]): Promise<void>;
}

export interface MediaEngine {
  ready: Promise<void>;
  playNumber(n: number): void;
  playSfx(kind: 'bingo' | 'stinger'): void;
  musicStart(): void;
  musicStop(): void;
  musicToggle(): void;
  setVolumes(vol: { voice?: number; sfx?: number; music?: number; master?: number }): void;
  getVolumes(): MediaVolumes;
  setPack(url: string): Promise<void>;
  playIntro(): void;
}

export interface AudioUnlockState {
  unlocked: boolean;
  unlock: () => Promise<void>;
}

export interface MediaVolumes {
  voice: number;
  sfx: number;
  music: number;
  master: number;
}