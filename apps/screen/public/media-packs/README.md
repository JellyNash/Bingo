# Media Packs Guide

## Adding a New Media Pack

1. Create a new folder under `public/media-packs/` with your pack name
2. Add a `pack.json` file with the configuration
3. Add audio files according to your pack.json configuration

## Directory Structure

```
your-pack-name/
├── pack.json
├── numbers/
│   ├── 1.mp3
│   ├── 2.mp3
│   └── ... (up to 75.mp3)
├── bingo.mp3
├── stinger.mp3
└── bg.mp3
```

## Audio File Guidelines

### Number Calls (1-75)
- **Format**: MP3 (preferred) or OGG
- **Sample Rate**: 44.1kHz recommended
- **Length**: ≤1.8 seconds per number
- **Loudness**: Target -16 LUFS for consistency

### Sound Effects
- **bingo.mp3**: Celebration sound when someone wins
- **stinger.mp3**: Short transition sound
- **bg.mp3**: Background music (should loop seamlessly)

### Loudness Normalization

Use the `gain` settings in pack.json to balance volumes:
```json
"gain": {
  "voice": 1.0,    // Number calls
  "sfx": 0.9,      // Sound effects
  "music": 0.6,    // Background music
  "master": 1.0    // Overall volume
}
```

## Legal Notice

⚠️ **Important**: Only upload audio files that you have the right to distribute. This includes:
- Content you created yourself
- Content with appropriate licenses (CC0, etc.)
- Content you have permission to use

## Creating Test Tones

For testing, you can create simple tone files:

```bash
# Generate a 440Hz test tone (1 second)
ffmpeg -f lavfi -i "sine=frequency=440:duration=1" test.mp3
```

## Compressing Audio

To optimize file sizes:

```bash
# Compress MP3 with good quality
ffmpeg -i input.wav -codec:a libmp3lame -b:a 128k output.mp3
```