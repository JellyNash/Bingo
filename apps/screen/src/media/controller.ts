import type { Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '../lib.socket';
import type { MediaEngine } from './types';

export function attachMediaController(
  socket: Socket<ServerToClientEvents, ClientToServerEvents>,
  engine: MediaEngine
): () => void {
  // Handle draw:next events - auto-play the drawn number
  const handleDrawNext = (data: { seq: number; value: number }) => {
    console.log(`Received draw:next - playing number ${data.value}`);
    engine.playNumber(data.value);
  };

  // Handle media:cue events
  const handleMediaCue = (cue: {
    type: 'number' | 'bingo' | 'stinger' | 'intro' | 'music:start' | 'music:stop' | 'music:toggle';
    number?: number;
  }) => {
    console.log(`Received media:cue - type: ${cue.type}`, cue.number);

    switch (cue.type) {
      case 'number':
        if (cue.number !== undefined) {
          engine.playNumber(cue.number);
        }
        break;

      case 'bingo':
        engine.playSfx('bingo');
        break;

      case 'stinger':
        engine.playSfx('stinger');
        break;

      case 'intro':
        engine.playIntro();
        break;

      case 'music:start':
        engine.musicStart();
        break;

      case 'music:stop':
        engine.musicStop();
        break;

      case 'music:toggle':
        engine.musicToggle();
        break;

      default:
        console.warn('Unknown media cue type:', cue);
    }
  };

  // Handle claim:result - play bingo sound
  const handleClaimResult = (data: any) => {
    if (data.valid) {
      console.log('Valid bingo claim - playing bingo sound');
      engine.playSfx('bingo');
    }
  };

  // Attach event listeners
  socket.on('draw:next', handleDrawNext);
  socket.on('media:cue', handleMediaCue);
  socket.on('claim:result', handleClaimResult);

  // Return cleanup function
  return () => {
    socket.off('draw:next', handleDrawNext);
    socket.off('media:cue', handleMediaCue);
    socket.off('claim:result', handleClaimResult);
  };
}

// Helper to emit test events for development
export function createMediaTester(engine: MediaEngine) {
  return {
    testNumber: (n: number) => engine.playNumber(n),
    testBingo: () => engine.playSfx('bingo'),
    testStinger: () => engine.playSfx('stinger'),
    testMusic: () => engine.musicToggle(),
    testIntro: () => engine.playIntro(),
    testDucking: () => {
      engine.musicStart();
      setTimeout(() => engine.playNumber(42), 1000);
    }
  };
}

// Attach to window for dev testing
if (import.meta.env.DEV) {
  (window as any).mediaTest = (engine: MediaEngine) => createMediaTester(engine);
}