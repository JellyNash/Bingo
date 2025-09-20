# Confetti / Win Overlay

## Overview
Celebratory overlay displayed on Player and Big-Screen upon accepted claim.

## Visuals
- Background overlay: transparent, use additive blend.
- Particle colors sample from `color.brand.primary`, `color.brand.secondary`, `color.feedback.success`.
- Optionally overlay winner name banner (center) using `font-display`.

## Motion
- Trigger `confettiExplosion` variant (1.2s) with emission arc 70°.
- Limit to 200 particles on desktop, 120 on mobile to preserve 60fps.
- Provide fallback static badge when `prefers-reduced-motion`.

## Accessibility
- Provide button “Mute celebration” accessible via keyboard.
- Duration capped <2s; ensure no flashing >3 Hz.

_Approved by Agent B — UX/UI_
