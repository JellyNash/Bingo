import { MediaLoader } from './loader';
export class WebAudioEngine {
    audioContext;
    loader;
    masterGain;
    voiceGain;
    sfxGain;
    musicGain;
    musicSource = null;
    musicBuffer = null;
    isPlayingMusic = false;
    lastNumberTime = 0;
    numberDebounceMs = 250;
    readyPromise;
    readyResolver;
    volumes = {
        voice: 1.0,
        sfx: 0.9,
        music: 0.6,
        master: 1.0
    };
    videoCallback;
    constructor() {
        // Create audio context with low latency
        this.audioContext = new AudioContext({ latencyHint: 'interactive' });
        this.loader = new MediaLoader(this.audioContext);
        // Build audio graph
        this.masterGain = this.audioContext.createGain();
        this.voiceGain = this.audioContext.createGain();
        this.sfxGain = this.audioContext.createGain();
        this.musicGain = this.audioContext.createGain();
        // Connect graph
        this.voiceGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.musicGain.connect(this.masterGain);
        this.masterGain.connect(this.audioContext.destination);
        // Set initial gains
        this.applyVolumes();
        // Setup ready promise
        this.readyPromise = new Promise(resolve => {
            this.readyResolver = resolve;
        });
    }
    get ready() {
        return this.readyPromise;
    }
    async setPack(packUrl) {
        try {
            // Stop any playing music before switching packs
            this.musicStop();
            // Load new pack
            await this.loader.loadPack(packUrl);
            // Apply pack-specific gains
            const pack = this.loader.getCurrentPack();
            if (pack?.gain) {
                this.volumes.voice = pack.gain.voice ?? 1.0;
                this.volumes.sfx = pack.gain.sfx ?? 0.9;
                this.volumes.music = pack.gain.music ?? 0.6;
                this.volumes.master = pack.gain.master ?? 1.0;
                this.applyVolumes();
            }
            // Preload background music
            this.loader.getMusic().then(buffer => {
                this.musicBuffer = buffer;
            }).catch(() => { });
            // Mark as ready
            this.readyResolver();
        }
        catch (error) {
            console.error('Failed to set media pack:', error);
            throw error;
        }
    }
    playNumber(n) {
        // Debounce same number
        const now = Date.now();
        if (now - this.lastNumberTime < this.numberDebounceMs) {
            return;
        }
        this.lastNumberTime = now;
        // Load and play
        this.loader.getNumber(n).then(buffer => {
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(this.voiceGain);
            // Schedule with slight offset for smooth playback
            const startTime = this.audioContext.currentTime + 0.05;
            source.start(startTime);
            // Apply ducking if music is playing
            this.applyDucking(startTime, buffer.duration);
            // Log metric
            console.log(`media.number.played: ${n}`);
        }).catch(err => {
            console.warn(`Failed to play number ${n}:`, err);
            console.log(`media.buffer.miss: number_${n}`);
            // Trigger background load
            this.loader.warmup([n]).catch(() => { });
        });
    }
    playSfx(kind) {
        this.loader.getSfx(kind).then(buffer => {
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(this.sfxGain);
            const startTime = this.audioContext.currentTime + 0.02;
            source.start(startTime);
            console.log(`media.sfx.played: ${kind}`);
        }).catch(err => {
            console.warn(`Failed to play SFX ${kind}:`, err);
            console.log(`media.buffer.miss: sfx_${kind}`);
        });
    }
    musicStart() {
        if (this.isPlayingMusic || !this.musicBuffer) {
            // Try loading if not ready
            if (!this.musicBuffer) {
                this.loader.getMusic().then(buffer => {
                    this.musicBuffer = buffer;
                    this.musicStart(); // Retry
                }).catch(() => { });
            }
            return;
        }
        this.musicSource = this.audioContext.createBufferSource();
        this.musicSource.buffer = this.musicBuffer;
        this.musicSource.loop = true;
        this.musicSource.connect(this.musicGain);
        this.musicSource.start(0);
        this.isPlayingMusic = true;
        console.log('media.music.started');
    }
    musicStop() {
        if (!this.isPlayingMusic || !this.musicSource)
            return;
        try {
            this.musicSource.stop();
            this.musicSource.disconnect();
        }
        catch { }
        this.musicSource = null;
        this.isPlayingMusic = false;
        console.log('media.music.stopped');
    }
    musicToggle() {
        if (this.isPlayingMusic) {
            this.musicStop();
        }
        else {
            this.musicStart();
        }
    }
    applyDucking(startTime, duration) {
        const pack = this.loader.getCurrentPack();
        if (!pack?.ducking?.enabled || !this.isPlayingMusic)
            return;
        const attackMs = pack.ducking.attackMs ?? 80;
        const releaseMs = pack.ducking.releaseMs ?? 250;
        const targetGain = pack.ducking.musicTarget ?? 0.3;
        const currentGain = this.volumes.music;
        // Ramp down
        this.musicGain.gain.cancelScheduledValues(startTime);
        this.musicGain.gain.setValueAtTime(currentGain, startTime);
        this.musicGain.gain.linearRampToValueAtTime(targetGain * currentGain, startTime + attackMs / 1000);
        // Ramp back up after voice ends
        const releaseTime = startTime + duration + 0.1;
        this.musicGain.gain.setValueAtTime(targetGain * currentGain, releaseTime);
        this.musicGain.gain.linearRampToValueAtTime(currentGain, releaseTime + releaseMs / 1000);
        console.log('media.duck.active');
    }
    setVolumes(vol) {
        if (vol.voice !== undefined)
            this.volumes.voice = vol.voice;
        if (vol.sfx !== undefined)
            this.volumes.sfx = vol.sfx;
        if (vol.music !== undefined)
            this.volumes.music = vol.music;
        if (vol.master !== undefined)
            this.volumes.master = vol.master;
        this.applyVolumes();
        // Save to localStorage
        localStorage.setItem('mediaVolumes', JSON.stringify(this.volumes));
    }
    applyVolumes() {
        this.voiceGain.gain.value = this.volumes.voice;
        this.sfxGain.gain.value = this.volumes.sfx;
        this.musicGain.gain.value = this.volumes.music;
        this.masterGain.gain.value = this.volumes.master;
    }
    getVolumes() {
        return { ...this.volumes };
    }
    playIntro() {
        // Delegate to video component via callback
        if (this.videoCallback) {
            this.videoCallback();
        }
    }
    setVideoCallback(callback) {
        this.videoCallback = callback;
    }
    async resume() {
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }
    getContext() {
        return this.audioContext;
    }
    // Load saved volumes from localStorage
    loadSavedVolumes() {
        const saved = localStorage.getItem('mediaVolumes');
        if (saved) {
            try {
                const volumes = JSON.parse(saved);
                this.setVolumes(volumes);
            }
            catch { }
        }
    }
}
