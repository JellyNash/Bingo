// Test script to verify audio engine functionality
import { getAudioController } from './audio/engine';
import { AudioCue } from './types/realtime';

// Test the audio controller
const audio = getAudioController();

// Log initial state
console.log('Audio Controller initialized:', audio.getContext());

// Test cue handling (requires user gesture)
export function testAudioCues() {
  console.log('Testing audio cues...');

  // Test music cues
  audio.handleMediaCue('music:lobby');
  console.log('✓ Lobby music cue handled');

  // Test sound effects
  audio.handleMediaCue('sfx:player:join');
  console.log('✓ Player join SFX handled');

  // Test voice cues
  audio.handleMediaCue('voice:welcome');
  console.log('✓ Welcome voice cue handled');

  // Test volume control
  audio.setVolume('master', 0.8);
  audio.setVolume('music', 0.6);
  audio.setVolume('sfx', 0.9);
  console.log('✓ Volume controls working');

  // Test crossfade
  setTimeout(() => {
    audio.crossfade('music:lobby', 'music:game', 2000);
    console.log('✓ Crossfade initiated');
  }, 1000);
}

// Export for testing
if (typeof window !== 'undefined') {
  (window as any).testAudioCues = testAudioCues;
  (window as any).audioController = audio;
}