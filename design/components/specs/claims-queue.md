# Claims Queue Item

## Overview
List entry representing each player claim for Console review.

## Layout
- Container: 88px height, padding `space-4`, `radius.md`.
- Structure: Left avatar + name, center pattern summary, right action buttons.
- Background state color:
  - Pending: `color.surface.raised`
  - Approved: `rgba(36,229,194,0.12)` border `color.feedback.success`
  - Denied: `rgba(255,107,107,0.12)` border `color.feedback.danger`

## Information Hierarchy
- Simultaneous claims sorted by server timestamp; ties highlighted amber until resolved
- Player name (`font-heading` 18px)
- Pattern: text (e.g., “Row — Top”) with icon
- Claim timestamp + latency (body-sm)
- Strike badges (if invalid) using `color.feedback.danger`

## Actions
- Accept (primary small button)
- Deny (destructive outline button)
- Inspect card (icon button)

## Motion
- Enter: slide/fade (`queueEnter`, y: -12 → 0, 0.22s).
- Resolve: color transition 180ms, trigger confetti overlay on approved (Console + Big-Screen).

## Accessibility
- Entire item `role="group"`, actions have `aria-label` including player name.
- Provide keyboard navigation via roving tab index.

_Approved by Agent B — UX/UI_
