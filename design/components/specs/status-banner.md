# Status Banner

## Overview
Displays game-level status across clients (“Paused”, “Reconnecting”, “Winner Declared”).

## Layout
- Height: 56px, full width.
- Background colors:
  - Paused: `rgba(79,107,255,0.16)`
  - Reconnecting: `rgba(78,197,241,0.18)`
  - Winner: `rgba(42,215,162,0.18)`
- Text: `font-heading` 18px (Console) / 16px (Player).
- Icon left, dismiss/extra actions right.

## Motion
- Entrance: `bannerSlide` (y: -100% → 0, 0.28s easeOut).
- Looping shimmer for reconnect using `statusPulse` variant on icon.

## Accessibility
- `role="status"` with `aria-live="polite"`.
- Provide explicit text e.g., “Game paused by host”.

_Approved by Agent B — UX/UI_
