import { vi } from 'vitest';

// Polyfill crypto.randomUUID
if (!global.crypto) {
  // @ts-ignore
  global.crypto = {};
}
if (!global.crypto.randomUUID) {
  // @ts-ignore
  global.crypto.randomUUID = () => '00000000-0000-4000-8000-000000000000';
}

// Mock navigator.onLine
Object.defineProperty(window.navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock window.vibrate
if (!window.navigator.vibrate) {
  // @ts-ignore
  window.navigator.vibrate = vi.fn(() => false);
}

// Setup test globals
global.fetch = vi.fn();