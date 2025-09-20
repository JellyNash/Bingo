# UI-BUILD-001 — Button System

## Scope
- Specs: `design/components/specs/button.md:1`
- Claim cooldown: `design/components/specs/claim-button.md:1`
- Motion: `design/motion/motion-spec.md:9`
- Tokens: `apps/_design-tokens/tailwind.theme.json:1`
- Labels: frontend/ui, design, motion, accessibility

## Notes
- Implement primary/secondary/destructive variants plus cooldown ring with `claimCooldown` transition.

---

# UI-BUILD-002 — Dialog & Sheet

## Scope
- Specs: `design/components/specs/modal.md:1`
- Motion: `design/motion/motion-spec.md:10`
- Accessibility: `design/accessibility/a11y-checklist.md:1`
- Labels: frontend/ui, design, accessibility

## Notes
- Include busy state top progress bar and sheet variant for mobile.

---

# UI-BUILD-003 — Auto Draw Controls

## Scope
- Slider spec: `design/components/specs/slider.md:1`
- Toggle spec: `design/components/specs/toggle.md:1`
- Motion: `design/motion/motion-spec.md:13`
- Labels: frontend/ui, design, motion

## Notes
- Wire slider (5–20s) with tooltip + keyboard controls; pair toggle with slider enablement.

---

# UI-BUILD-004 — Bingo Card

## Scope
- Specs: `design/components/specs/bingo-card.md:1`
- Motion: `design/motion/motion-spec.md:7`
- Accessibility: `design/accessibility/a11y-checklist.md:1`
- Labels: frontend/ui, design, accessibility, motion

## Notes
- Implement grid semantics with ARIA live announcements and highlight transitions.

---

# UI-BUILD-005 — Number Callout & History

## Scope
- Specs: `design/components/specs/number-callout.md:1`
- Motion: `design/motion/motion-spec.md:5`
- Prototypes: `design/prototypes/big-screen.figlink:1`
- Labels: frontend/ui, design, motion

## Notes
- Build orb pulse + history chips; ensure readability for 20ft viewing distance.

---

# UI-BUILD-006 — Claims Queue Module

## Scope
- Specs: `design/components/specs/claims-queue.md:1`
- Motion: `design/motion/motion-spec.md:11`
- Tokens: `apps/_design-tokens/tailwind.theme.json:1`
- Labels: frontend/ui, design, motion, ops

## Notes
- Implement pending/approved/denied styling and audit info per item.

---

# UI-BUILD-007 — Player List & Status Badges

## Scope
- Specs: `design/components/specs/players-list.md:1`
- Status banner: `design/components/specs/status-banner.md:1`
- Motion: `design/motion/motion-spec.md:12`
- Labels: frontend/ui, design, accessibility

## Notes
- Include reconnect/disqualified states and status banner integration.

---

# UI-BUILD-008 — Media Controls & AV Cues

## Scope
- Specs: `design/components/specs/media-controls.md:1`
- AV Map: `design/media/av-cues-map.md:1`
- Labels: frontend/ui, design, audio

## Notes
- Surface cue queue, volume control, and mute toggles respecting offline asset requirements.

---

# UI-BUILD-009 — Confetti & Celebration Layer

## Scope
- Specs: `design/components/specs/confetti-overlay.md:1`
- Motion: `design/motion/motion-spec.md:16`
- Accessibility: `design/accessibility/a11y-checklist.md:1`
- Labels: frontend/ui, design, motion

## Notes
- Provide reduced-motion fallback and mute option per spec.

---

# UI-BUILD-010 — QR Join Panel

## Scope
- Specs: `design/components/specs/qr-panel.md:1`
- Tokens: `apps/_design-tokens/tailwind.theme.json:1`
- Prototypes: `design/prototypes/big-screen.figlink:1`
- Labels: frontend/ui, design, accessibility

## Notes
- Implement offline join instructions and PIN announcer text alternative.

---

# UI-BUILD-011 — Big-Screen Experience

## Scope
- Prototype: `design/prototypes/big-screen.figlink:1`
- Components: Number Callout (`design/components/specs/number-callout.md:1`), QR Panel (`design/components/specs/qr-panel.md:1`), Confetti (`design/components/specs/confetti-overlay.md:1`)
- Motion: `design/motion/motion-spec.md:5`
- Labels: frontend/ui, design, motion

## Notes
- Compose hero layout with dark cinematic theme, safe margins, and AV cues.

---

# UI-BUILD-012 — GameMaster Console

## Scope
- Prototype: `design/prototypes/console.figlink:1`
- Components: Claims Queue (`design/components/specs/claims-queue.md:1`), Media Controls (`design/components/specs/media-controls.md:1`), Player List (`design/components/specs/players-list.md:1`)
- Accessibility: `design/accessibility/a11y-checklist.md:1`
- Labels: frontend/ui, design, accessibility, ops

## Notes
- Implement desktop-first grid with command palette and status banner support.

---

# UI-BUILD-013 — Player PWA

## Scope
- Prototype: `design/prototypes/player.figlink:1`
- Components: Bingo Card (`design/components/specs/bingo-card.md:1`), Claim Button (`design/components/specs/claim-button.md:1`), Status Banner (`design/components/specs/status-banner.md:1`)
- Motion: `design/motion/motion-spec.md:7`
- Labels: frontend/ui, design, accessibility, motion

## Notes
- Ensure mobile-first layout, one-handed reach, offline reconnect banner, and cooldown states.

---
