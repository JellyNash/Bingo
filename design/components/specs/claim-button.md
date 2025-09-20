# Claim Button

## Overview
Primary CTA on Player card for submitting Bingo claims with cooldown + strike feedback.

## Layout & Tokens
- Width: full container minus `space-4` margin; height 64px.
- Background gradient `color.brand.primary` → `color.brand.secondary`.
- Border: `2px` glow using `color.brand.secondary`.
- Cooldown overlay: circular progress ring (SVG) with `claimCooldown` variant.
- Disabled state: apply `opacity.disabled`, label updates to “Cooldown (28s)”.

## Motion & Feedback
- Press uses `buttonReveal` entry + 90ms press scale.
- On reject: quick shake `claimShake` (x ±6px, 0.24s) and change border to `color.feedback.danger` for 2s.
- Confetti trigger on approval (via Big-Screen).

## Accessibility
- `aria-live` message broadcast on cooldown start.
- Provide timer value via `aria-valuetext` (e.g., “Claim button disabled for 28 seconds”).

_Approved by Agent B — UX/UI_
