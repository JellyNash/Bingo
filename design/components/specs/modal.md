# Dialog / Sheet

## Overview
Used for claim review, penalty confirmations, and help overlays. Based on `shadcn/ui` Dialog + Sheet for mobile.

## Layout
- Width: 480px desktop, full-width sheet on mobile with 32px horizontal padding.
- Header: Title (font-heading 24px), subtitle (body-sm), close button top-right.
- Body: Scroll area max-height 60vh.
- Footer: Primary + secondary buttons aligned right (desktop) or full-width stack (mobile).

## Tokens
- Background: `color.surface.overlay` with 92% opacity backdrop.
- Border: `1px solid color.border.subtle`.
- Radius: `radius.lg` top corners in sheet mode.
- Shadow: `shadow.base`.

## States
- Default, Busy (show top progress bar using `color.brand.primary`), Error (header border `color.feedback.danger`).

## Interaction
- Enter: `dialogFade` (opacity 0→1, y:-8→0, duration 0.24s).
- Exit: reverse `dialogFade`.
- Underlay blur 16px, fade 0.18s.

## Accessibility
- Uses `role="dialog"` with `aria-modal="true"`.
- Focus trap on open; close on Esc/overlay click (configurable for penalties).
- Provide descriptive title, optional `aria-describedby` for body text.

_Approved by Agent B — UX/UI_
