import { vi } from 'vitest';
// Mock AudioContext for testing
class MockAudioContext {
    state = 'running';
    currentTime = 0;
    destination = {};
    sampleRate = 44100;
    createGain() {
        return {
            gain: { value: 1, setValueAtTime: () => { }, linearRampToValueAtTime: () => { }, cancelScheduledValues: () => { } },
            connect: () => { },
            disconnect: () => { }
        };
    }
    createBufferSource() {
        return {
            buffer: null,
            loop: false,
            connect: () => { },
            disconnect: () => { },
            start: () => { },
            stop: () => { }
        };
    }
    createBuffer(channels, length, sampleRate) {
        return {
            duration: length / sampleRate,
            length,
            numberOfChannels: channels,
            sampleRate,
            getChannelData: () => new Float32Array(length)
        };
    }
    async decodeAudioData(buffer) {
        // Simulate audio decoding
        return {
            duration: 1,
            length: 44100,
            numberOfChannels: 2,
            sampleRate: 44100,
            getChannelData: () => new Float32Array(44100)
        };
    }
    async resume() {
        this.state = 'running';
    }
    async suspend() {
        this.state = 'suspended';
    }
}
// Make MockAudioContext available globally
global.AudioContext = MockAudioContext;
// Mock fetch for media loading tests
global.fetch = vi.fn();
// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};
global.localStorage = localStorageMock;
