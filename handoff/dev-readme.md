# Design Handoff — Developer Notes

## Using `tailwind.theme.json`
- Import tokens in Tailwind config via dynamic JSON import (see design/style-guide/tailwind.config.snippet.md).
- Map `surface` colors to semantic CSS variables (e.g., `--bg-base`, `--bg-overlay`).
- Assign spacing tokens to Tailwind `spacing` scale values (`2` → 0.5rem, etc.).

## Component ↔ shadcn/ui Mapping
- Button → `Button` variants (default/secondary/destructive/ghost) with class overrides in `buttonVariants` helper.
- Dialog → `Dialog` (desktop) + `Sheet` (mobile) with shared tokenized surfaces.
- Slider → `Slider` with custom thumb slot.
- Bingo Card → Compose `Card` + grid divs; use `cellMark*` variants on each cell.
- Number Callout → `Card` + `motion.div` orb + `historySlide` for chips.
- Claims Queue → `Card` + `Badge` + `Button`; integrate queue states via tokens.
- Player List → `Table` + `Badge` combos.

## Motion Variants
- Reference definitions in `apps/_design-tokens/motion.variants.ts`.
- Apply `claimCooldown(durationSeconds)` for dynamic timers (e.g., 30s).
- Always gate heavy effects behind `prefers-reduced-motion` checks.

## Responsive Rules
- Console breakpoint: min-width 1280px (12-col grid).
- Player mobile: base at 360px, key break at 768px for tablet enhancements.
- Big-Screen: design for 1920×1080; maintain safe margins `space-10`.

## Assets
- Audio/video cues mapped in `design/media/av-cues-map.md`.
- Confetti effect uses canvas fallback for low-end hardware (disable when `prefers-reduced-motion`).

_Approved by Agent B — UX/UI_
