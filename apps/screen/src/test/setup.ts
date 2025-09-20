import { vi } from 'vitest';

// Mock AudioContext for testing
class MockAudioContext {
  state = 'running' as AudioContextState;
  currentTime = 0;
  destination = {} as any;
  sampleRate = 44100;

  createGain() {
    return {
      gain: { value: 1, setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, cancelScheduledValues: () => {} },
      connect: () => {},
      disconnect: () => {}
    };
  }

  createBufferSource() {
    return {
      buffer: null,
      loop: false,
      connect: () => {},
      disconnect: () => {},
      start: () => {},
      stop: () => {}
    };
  }

  createBuffer(channels: number, length: number, sampleRate: number) {
    return {
      duration: length / sampleRate,
      length,
      numberOfChannels: channels,
      sampleRate,
      getChannelData: () => new Float32Array(length)
    };
  }

  async decodeAudioData(buffer: ArrayBuffer) {
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
(global as any).AudioContext = MockAudioContext;

// Mock fetch for media loading tests
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
(global as any).localStorage = localStorageMock;