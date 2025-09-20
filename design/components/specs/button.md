# Button

## Overview
Primary action trigger used across Player, Console, and Big-Screen. Built on `shadcn/ui` `Button` with Tailwind token overrides.

## States
- Primary default: background `color.brand.primary`, text `color.text.primary`.
- Primary hover: apply glow shadow `shadow.glow`, background lighten to `color.brand.primary-accent`.
- Secondary: border `color.border.subtle`, background transparent, text `color.text.secondary`.
- Destructive: background `color.feedback.danger`, hover deepen to `#E05151`.
- Disabled: opacity `opacity.disabled`, no hover shadow.
- Cooldown (Claim): apply gradient border (`color.brand.secondary` → `color.brand.primary`), progress ring overlay animated 30s.

## Tokens & Layout
- Padding: `py-space-3 px-space-6` on desktop, `py-space-2` mobile.
- Radius: `radius.md` (pill for claim button via `radius.pill`).
- Icon gap: `gap-space-2`.

## Interaction & Motion
- Entrance: `buttonReveal` variant (see motion spec) triggered on mount.
- Press: scale to 0.98 for 80ms, release with spring overshoot.
- Cooldown: radial countdown using CSS conic gradient + `motionVariants.claimCooldown`.

## Accessibility
- Focus ring: `shadow.focus` + outline `color.border.focus` width 2px.
- Tooltip for cooldown with remaining seconds (ARIA live polite).
- Minimum touch target 44×44 via padding.

## Mapping
- `shadcn/ui` Button > variant `default|secondary|destructive|ghost` mapped to tokens via class overrides in `buttonVariants` helper.

_Approved by Agent B — UX/UI_
