# Audio Assets for Big Screen Display

This directory contains audio files used by the Big Screen bingo display.

## Directory Structure

- `music/` - Background music tracks
  - `lobby.mp3` - Lobby/waiting music (looped)
  - `countdown.mp3` - Countdown sequence music
  - `game.mp3` - Active game background music (looped)

- `sfx/` - Sound effects
  - `player-join.mp3` - Player joining notification
  - `player-leave.mp3` - Player leaving notification
  - `number-draw.mp3` - Number being drawn
  - `game-start.mp3` - Game starting sound
  - `game-pause.mp3` - Game paused sound
  - `game-complete.mp3` - Game completion sound
  - `bingo-call.mp3` - BINGO winner sound

- `voice/` - Voice announcements
  - `welcome.mp3` - Welcome message
  - `countdown.mp3` - Countdown voice announcement
  - `game-start.mp3` - Game start announcement
  - `last-call.mp3` - Last call announcement

## Audio Requirements

- Format: MP3 or WAV
- Sample Rate: 44.1kHz or 48kHz
- Bit Depth: 16-bit minimum
- Duration: Keep sound effects under 3 seconds for responsiveness
- Volume: Normalize all files to prevent level jumps

## Fallback Behavior

The audio engine gracefully handles missing files by:
- Logging warnings for failed loads
- Continuing without audio if Web Audio API is unavailable
- Requiring user gesture before enabling audio (browser policy)

## Development Notes

Audio files are loaded on-demand with preloading for essential sounds.
The system automatically handles browser autoplay policies and provides fallbacks for accessibility.