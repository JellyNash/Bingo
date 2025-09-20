import { vi } from 'vitest';

// Mock navigator.onLine
Object.defineProperty(window.navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock window.vibrate
window.navigator.vibrate = vi.fn();

// Setup test globals
global.fetch = vi.fn();