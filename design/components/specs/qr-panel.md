# QR Panel

## Overview
Promotes quick Player join via QR code + PIN display on Big-Screen.

## Layout
- Container 320×360px with `radius.lg` and `shadow.base`.
- QR code 200×200 centered; below show PIN digits using `font-mono` 28px.
- Include instructions “Scan or enter PIN at bingo.local”.

## States
- Default (active game): background `color.surface.overlay`.
- Closed game: overlay `color.surface.base` 60% opacity + message “Game closed”.

## Accessibility
- Provide text alternative for PIN below QR (“PIN 4829”).
- Ensure contrast 7:1 for PIN digits.

_Approved by Agent B — UX/UI_
