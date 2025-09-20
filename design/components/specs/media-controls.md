# Media Controls

## Overview
Console module for managing intro video, background music, and AV cues.

## Layout
- Horizontal control bar: Play/Stop button, volume slider, BGM toggle, cue dropdown.
- Buttons use secondary variant; slider shares spec with auto-draw slider but vertical orientation optional.
- Display currently queued media with thumbnail (64×40).

## States
- Idle, Playing, Muted, Error (asset missing) with corresponding color changes (`info`, `warning`).

## Motion
- Buttons use `buttonReveal`; slider uses `sliderThumbDrag`.
- Cue dropdown uses `historySlide` for list items.

## Accessibility
- Provide captions/labels for screen readers (e.g., “Play intro video”).
- Volume slider `aria-labelledby` referencing label.

_Approved by Agent B — UX/UI_
