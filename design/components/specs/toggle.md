# Toggle / Switch

## Overview
Controls auto-draw enablement and audio mute toggles. Based on `shadcn/ui` Switch component.

## Layout & Tokens
- Track: 48×24px, background `color.surface.overlay` when off, `color.brand.primary-muted` when on.
- Thumb: 20px circle, uses `color.brand.primary` on active, `color.border.subtle` off.
- Label: left aligned (Console), stacked above (Player mobile).

## States
- Off: track opacity 40%, tooltip “Auto draw disabled”.
- On: track gradient `color.brand.secondary → color.brand.primary`.
- Disabled: opacity `opacity.disabled`, pointer events none.

## Motion
- Thumb uses `toggleSlide` variant (x 0→24, duration 0.16s easeOut).
- Glow ring on focus using `shadow.focus`.

## Accessibility
- `role="switch"`, `aria-checked` bound to state.
- Provide `aria-describedby` referencing interval slider when auto-draw on.

_Approved by Agent B — UX/UI_
