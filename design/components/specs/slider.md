# Slider — Auto Draw Speed

## Overview
Controls auto-draw interval (5–20s). Based on `shadcn/ui` Slider component.

## Layout & Tokens
- Track width: 280px desktop, 100% container mobile.
- Track height: 4px, background `color.surface.glow` at 40% opacity.
- Active track: gradient `color.brand.secondary` → `color.brand.primary`.
- Thumb: 20px circle, border `2px color.surface.overlay`, glow shadow on focus.
- Labels: top-left “Auto Draw” (heading-sm), inline value chips (e.g., “8s”).

## States
- Enabled: thumb animated via `sliderPulse` variant when auto-draw on.
- Disabled (auto-draw off): track reduced opacity to 24%, thumb uses `color.border.subtle`.

## Interaction
- Drag updates values in 0.5s increments; show tooltip above thumb.
- Keyboard: ←/→ adjust by 1s; Shift modifier 2s.
- Motion: `sliderThumbDrag` variant (spring(260, 24)).

## Accessibility
- `role="slider"`, `aria-valuemin=5`, `aria-valuemax=20`, `aria-valuetext` e.g., “Draw every 8 seconds”.
- Ensure focus outline `shadow.focus`.
- Touch area extends to 44×44 via invisible padding.

_Approved by Agent B — UX/UI_
