# Audio Pack Storage

This folder stores audio packs uploaded via the Gamemaster console.

Structure:
- `packs/music/lobby` – background tracks for pre-game registration.
- `packs/music/in-game` – gameplay background tracks.
- `packs/sfx/join` – one-shot effects triggered when players join.
- `packs/sfx/bingo` – celebratory effects when bingo is declared.
- `packs/sfx/countdown` – optional countdown ticks or stingers.
- `packs/voice/<locale>` – voiceover packs (numbers, prompts) organized by language.

Each pack should include an `audio-pack.json` manifest describing cue mappings and metadata. Uploaded files are placed under a generated pack ID. The `default` folders act as placeholders for seeded packs.
