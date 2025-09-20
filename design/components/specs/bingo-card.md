# Bingo Card

## Overview
5×5 grid with free center. Displays states for default, called-available, marked, disabled (cooldown/locked).

## Layout
- Card width: 320px mobile, 420px desktop; responsive using CSS grid.
- Cells: 56px square (desktop), 48px (mobile). Gap `space-2`.
- Header row shows column labels (BINGO) with `font-heading` 18px.

## Visual States
- Default: background `color.surface.raised`, border `color.border.subtle`, text `color.text.secondary`.
- Called-available: outline `1px color.brand.primary`, number badge `color.brand.primary-muted`.
- Marked: fill gradient `#2230A3 → #4F6BFF`, inner glow `shadow.glow`, text `color.text.primary`.
- Disabled (cooldown/locked): overlay `rgba(7,11,22,0.65)` + lock icon, text `color.text.muted`.
- Free cell: radial gradient `color.brand.secondary → transparent`, label “FREE”.

## Interaction & Motion
- On mark: `cellMarkBounce` variant (scale 1→0.92→1.02→1).
- On undo: `cellMarkReverse` (scale 1→1.06→1, fade highlight). Duration 0.18s.
- On draw highlight: `cellFlash` accent border for 700ms.

## Accessibility
- `role="grid"` with cells as `role="gridcell"` and `aria-selected` for marked state.
- Provide accessible label “Number 42 marked” via live region.
- High contrast ensures ≥4.5:1 for all states.

_Approved by Agent B — UX/UI_
