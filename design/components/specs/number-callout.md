# Number Callout

## Overview
Displays current draw on Big-Screen and Player. Includes primary orb and history chips.

## Layout & Tokens
- Orb diameter: 160px Big-Screen, 96px Player.
- Background: radial gradient `color.brand.primary` center to `color.brand.primary-muted` edge.
- Border: inner stroke `color.surface.glow`, outer shadow `shadow.glow`.
- Number typography: `font-display`, text `color.text.primary`.
- History chips: 40px circles, stack horizontally with `space-3` gap.

## States
- Incoming draw: animate `flipInNumber` variant (0.5s) with light trail.
- Repeat draw (undo scenario in future): use `numberRecall` variant highlighted in amber.
- Idle: gentle breathing (`orbPulse`, scale ±2%).

## Accessibility
- Provide ARIA live region `role="status"` with sentence “Number 42 drawn”.
- Ensure color contrast between number and orb background > 7:1.

_Approved by Agent B — UX/UI_
