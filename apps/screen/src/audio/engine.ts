import { AudioCue, AudioAsset, AudioContext } from '../types/realtime';

export interface AudioBufferWrapper {
  buffer: globalThis.AudioBuffer;
  source?: AudioBufferSourceNode;
  gainNode?: GainNode;
  isPlaying: boolean;
  loop: boolean;
  startTime?: number;
}

export class AudioController {
  private context: globalThis.AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;
  private audioBuffers: Map<AudioCue, AudioBufferWrapper> = new Map();
  private loadingPromises: Map<AudioCue, Promise<void>> = new Map();
  private enabled = false;
  private hasUserGesture = false;
  private volumes = {
    master: 0.8,
    music: 0.6,
    sfx: 0.8,
    voice: 0.9
  };

  // Default audio assets configuration
  private readonly audioAssets: AudioAsset[] = [
    { cue: 'music:lobby', url: '/audio/music/lobby.mp3', volume: 0.6, loop: true, category: 'music', preload: true },
    { cue: 'music:countdown', url: '/audio/music/countdown.mp3', volume: 0.7, loop: false, category: 'music', preload: true },
    { cue: 'music:game', url: '/audio/music/game.mp3', volume: 0.5, loop: true, category: 'music', preload: true },
    { cue: 'sfx:player:join', url: '/audio/sfx/player-join.mp3', volume: 0.8, loop: false, category: 'sfx', preload: true },
    { cue: 'sfx:player:leave', url: '/audio/sfx/player-leave.mp3', volume: 0.6, loop: false, category: 'sfx', preload: false },
    { cue: 'sfx:number:draw', url: '/audio/sfx/number-draw.mp3', volume: 0.9, loop: false, category: 'sfx', preload: true },
    { cue: 'sfx:game:start', url: '/audio/sfx/game-start.mp3', volume: 0.9, loop: false, category: 'sfx', preload: true },
    { cue: 'sfx:game:pause', url: '/audio/sfx/game-pause.mp3', volume: 0.7, loop: false, category: 'sfx', preload: false },
    { cue: 'sfx:game:complete', url: '/audio/sfx/game-complete.mp3', volume: 0.8, loop: false, category: 'sfx', preload: false },
    { cue: 'sfx:bingo:call', url: '/audio/sfx/bingo-call.mp3', volume: 1.0, loop: false, category: 'sfx', preload: true },
    { cue: 'voice:welcome', url: '/audio/voice/welcome.mp3', volume: 0.9, loop: false, category: 'voice', preload: true },
    { cue: 'voice:countdown', url: '/audio/voice/countdown.mp3', volume: 0.9, loop: false, category: 'voice', preload: true },
    { cue: 'voice:game:start', url: '/audio/voice/game-start.mp3', volume: 0.9, loop: false, category: 'voice', preload: true },
    { cue: 'voice:last:call', url: '/audio/voice/last-call.mp3', volume: 0.9, loop: false, category: 'voice', preload: false }
  ];

  constructor() {
    this.setupUserGestureListener();
  }

  private setupUserGestureListener(): void {
    const handleUserGesture = () => {
      if (!this.hasUserGesture) {
        this.hasUserGesture = true;
        this.initialize();
        console.log('Audio: User gesture detected, audio context initialized');
      }
    };

    // Listen for any user interaction
    ['click', 'touchstart', 'keydown'].forEach(event => {
      document.addEventListener(event, handleUserGesture, { once: true });
    });
  }

  private async initialize(): Promise<void> {
    if (this.context || !this.hasUserGesture) return;

    try {
      // Create Web Audio API context
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Create gain nodes for mixing
      this.masterGain = this.context!.createGain();
      this.musicGain = this.context!.createGain();
      this.sfxGain = this.context!.createGain();
      this.voiceGain = this.context!.createGain();

      // Connect gain nodes
      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.voiceGain.connect(this.masterGain);
      this.masterGain.connect(this.context.destination);

      // Set initial volumes
      this.setVolumes();

      this.enabled = true;
      console.log('Audio: Web Audio API initialized successfully');

      // Preload essential audio assets
      await this.preloadAssets();
    } catch (error) {
      console.warn('Audio: Failed to initialize Web Audio API:', error);
      this.enabled = false;
    }
  }

  private setVolumes(): void {
    if (!this.context) return;

    this.masterGain!.gain.setValueAtTime(this.volumes.master, this.context.currentTime);
    this.musicGain!.gain.setValueAtTime(this.volumes.music, this.context.currentTime);
    this.sfxGain!.gain.setValueAtTime(this.volumes.sfx, this.context.currentTime);
    this.voiceGain!.gain.setValueAtTime(this.volumes.voice, this.context.currentTime);
  }

  private async preloadAssets(): Promise<void> {
    const preloadAssets = this.audioAssets.filter(asset => asset.preload);
    const loadPromises = preloadAssets.map(asset => this.loadAudio(asset.cue, asset.url, asset.loop));

    try {
      await Promise.allSettled(loadPromises);
      console.log(`Audio: Preloaded ${preloadAssets.length} audio assets`);
    } catch (error) {
      console.warn('Audio: Some assets failed to preload:', error);
    }
  }

  private async loadAudio(cue: AudioCue, url: string, loop: boolean = false): Promise<void> {
    if (this.audioBuffers.has(cue) || this.loadingPromises.has(cue)) {
      return this.loadingPromises.get(cue) || Promise.resolve();
    }

    const loadPromise = this.fetchAndDecodeAudio(cue, url, loop);
    this.loadingPromises.set(cue, loadPromise);

    try {
      await loadPromise;
    } finally {
      this.loadingPromises.delete(cue);
    }
  }

  private async fetchAndDecodeAudio(cue: AudioCue, url: string, loop: boolean): Promise<void> {
    if (!this.context) {
      throw new Error('Audio context not initialized');
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);

      this.audioBuffers.set(cue, {
        buffer: audioBuffer,
        isPlaying: false,
        loop
      });

      console.log(`Audio: Loaded ${cue} from ${url}`);
    } catch (error) {
      console.warn(`Audio: Failed to load ${cue} from ${url}:`, error);
      throw error;
    }
  }

  private getGainNodeForCategory(category: 'music' | 'sfx' | 'voice'): GainNode | null {
    switch (category) {
      case 'music': return this.musicGain;
      case 'sfx': return this.sfxGain;
      case 'voice': return this.voiceGain;
      default: return null;
    }
  }

  public async play(cue: AudioCue, options: {
    volume?: number;
    fadeInMs?: number;
    loop?: boolean;
  } = {}): Promise<void> {
    if (!this.enabled || !this.context) {
      console.log(`Audio: Cannot play ${cue} - audio not available`);
      return;
    }

    // Find the asset configuration
    const asset = this.audioAssets.find(a => a.cue === cue);
    if (!asset) {
      console.warn(`Audio: No configuration found for cue ${cue}`);
      return;
    }

    // Load audio if not already loaded
    if (!this.audioBuffers.has(cue)) {
      try {
        await this.loadAudio(cue, asset.url, asset.loop);
      } catch (error) {
        console.warn(`Audio: Failed to load ${cue} for playback:`, error);
        return;
      }
    }

    const audioBuffer = this.audioBuffers.get(cue);
    if (!audioBuffer) return;

    // Stop existing playback of this cue
    this.stop(cue);

    try {
      // Create new source node
      const source = this.context.createBufferSource();
      const gainNode = this.context.createGain();

      source.buffer = audioBuffer.buffer;
      source.loop = options.loop ?? asset.loop;

      // Connect to appropriate mixer channel
      const categoryGain = this.getGainNodeForCategory(asset.category);
      if (categoryGain) {
        source.connect(gainNode);
        gainNode.connect(categoryGain);
      } else {
        source.connect(gainNode);
        gainNode.connect(this.masterGain!);
      }

      // Set volume
      const volume = (options.volume ?? asset.volume) * this.volumes.master;
      if (options.fadeInMs && options.fadeInMs > 0) {
        gainNode.gain.setValueAtTime(0, this.context.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, this.context.currentTime + options.fadeInMs / 1000);
      } else {
        gainNode.gain.setValueAtTime(volume, this.context.currentTime);
      }

      // Start playback
      source.start(0);

      // Update buffer state
      audioBuffer.source = source;
      audioBuffer.gainNode = gainNode;
      audioBuffer.isPlaying = true;
      audioBuffer.startTime = this.context.currentTime;

      // Handle playback end
      source.onended = () => {
        audioBuffer.isPlaying = false;
        audioBuffer.source = undefined;
        audioBuffer.gainNode = undefined;
        audioBuffer.startTime = undefined;
      };

      console.log(`Audio: Playing ${cue}${options.fadeInMs ? ` with ${options.fadeInMs}ms fade-in` : ''}`);
    } catch (error) {
      console.warn(`Audio: Failed to play ${cue}:`, error);
    }
  }

  public stop(cue: AudioCue, fadeOutMs?: number): void {
    const audioBuffer = this.audioBuffers.get(cue);
    if (!audioBuffer || !audioBuffer.isPlaying || !audioBuffer.source) return;

    try {
      if (fadeOutMs && fadeOutMs > 0 && this.context && audioBuffer.gainNode) {
        // Fade out
        const currentTime = this.context.currentTime;
        audioBuffer.gainNode.gain.linearRampToValueAtTime(0, currentTime + fadeOutMs / 1000);
        audioBuffer.source.stop(currentTime + fadeOutMs / 1000);
      } else {
        // Immediate stop
        audioBuffer.source.stop();
      }

      console.log(`Audio: Stopped ${cue}${fadeOutMs ? ` with ${fadeOutMs}ms fade-out` : ''}`);
    } catch (error) {
      console.warn(`Audio: Failed to stop ${cue}:`, error);
    }
  }

  public crossfade(fromCue: AudioCue, toCue: AudioCue, durationMs: number = 2000): Promise<void> {
    return new Promise((resolve) => {
      // Start fade out of current track
      this.stop(fromCue, durationMs);

      // Start fade in of new track after a brief delay
      setTimeout(() => {
        this.play(toCue, { fadeInMs: durationMs }).then(resolve);
      }, 100);
    });
  }

  public setVolume(category: 'master' | 'music' | 'sfx' | 'voice', volume: number): void {
    this.volumes[category] = Math.max(0, Math.min(1, volume));

    if (!this.context) return;

    const currentTime = this.context.currentTime;
    switch (category) {
      case 'master':
        this.masterGain?.gain.setValueAtTime(this.volumes.master, currentTime);
        break;
      case 'music':
        this.musicGain?.gain.setValueAtTime(this.volumes.music, currentTime);
        break;
      case 'sfx':
        this.sfxGain?.gain.setValueAtTime(this.volumes.sfx, currentTime);
        break;
      case 'voice':
        this.voiceGain?.gain.setValueAtTime(this.volumes.voice, currentTime);
        break;
    }

    console.log(`Audio: Set ${category} volume to ${volume}`);
  }

  public getVolume(category: 'master' | 'music' | 'sfx' | 'voice'): number {
    return this.volumes[category];
  }

  public isPlaying(cue: AudioCue): boolean {
    const audioBuffer = this.audioBuffers.get(cue);
    return audioBuffer?.isPlaying ?? false;
  }

  public getContext(): import('../types/realtime').AudioContext {
    return {
      isEnabled: this.enabled,
      hasUserGesture: this.hasUserGesture,
      masterVolume: this.volumes.master,
      musicVolume: this.volumes.music,
      sfxVolume: this.volumes.sfx,
      voiceVolume: this.volumes.voice
    };
  }

  public handleMediaCue(cue: AudioCue, volume?: number, fadeInMs?: number): void {
    const normalizedCue = this.normalizeCue(cue);
    const options: Parameters<AudioController['play']>[1] = {};
    if (volume !== undefined) options.volume = volume;
    if (fadeInMs !== undefined) options.fadeInMs = fadeInMs;

    // Handle special logic for different cue types
    switch (normalizedCue) {
      case 'music:lobby':
        // Stop other music and start lobby music
        this.stop('music:countdown');
        this.stop('music:game');
        this.play(normalizedCue, { ...options, loop: true });
        break;

      case 'music:countdown':
        // Crossfade from lobby to countdown music
        if (this.isPlaying('music:lobby')) {
          this.crossfade('music:lobby', normalizedCue, fadeInMs || 1000);
        } else {
          this.play(normalizedCue, options);
        }
        break;

      case 'music:game':
        // Crossfade to game music
        this.stop('music:lobby', 500);
        this.stop('music:countdown', 500);
        this.play(normalizedCue, { ...options, loop: true });
        break;

      default:
        // Regular sound effects and voice
        this.play(normalizedCue, options);
        break;
    }
  }

  private normalizeCue(cue: string): AudioCue {
    switch (cue) {
      case 'music:lobby:start':
      case 'music:lobby:loop':
        return 'music:lobby';
      case 'music:in-game:start':
      case 'music:game:start':
        return 'music:game';
      case 'sfx:player_join':
        return 'sfx:player:join';
      case 'sfx:player_leave':
        return 'sfx:player:leave';
      case 'sfx:countdown:start':
        return 'music:countdown';
      default:
        return cue as AudioCue;
    }
  }

  public dispose(): void {
    // Stop all playing audio
    this.audioBuffers.forEach((_, cue) => this.stop(cue));

    // Close audio context
    if (this.context && this.context.state !== 'closed') {
      this.context.close();
    }

    // Clear buffers
    this.audioBuffers.clear();
    this.loadingPromises.clear();

    this.enabled = false;
    console.log('Audio: Disposed of audio controller');
  }
}

// Singleton instance
let audioController: AudioController | null = null;

export function getAudioController(): AudioController {
  if (!audioController) {
    audioController = new AudioController();
  }
  return audioController;
}

export function disposeAudioController(): void {
  if (audioController) {
    audioController.dispose();
    audioController = null;
  }
}
