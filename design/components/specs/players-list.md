# Player List Item

## Overview
Roster view for Console showing player presence, strike count, and winner badges.

## Layout
- Row height 56px, padding `space-3`, `radius.sm`.
- Columns: Avatar (strike badges overlay), Name, Status chip (Connected / Reconnecting / Disqualified), Strikes, Claim button (for GM assist).

## Visual States
- Connected: text `color.text.secondary`, background transparent.
- Reconnecting: background `rgba(78,197,241,0.08)`, spinner icon.
- Disqualified: background `rgba(255,107,107,0.12)`, text `color.feedback.danger`.
- Winner: badge `color.brand.secondary`, icon trophy.

## Tokens
- Strikes badge uses pill `radius.pill`, text `font-body-sm` bold.
- Status chips: `px-space-3 py-space-2`, color-coded per state.

## Motion
- Presence transitions: `listFade` variant (opacity 0→1, duration 0.18s).
- Status change: `statusPulse` (color tween 0.3s).

## Accessibility
- Table semantics (`role="row"`), strikes as `aria-label="2 strikes"`.
- Ensure 44px hit area for manual actions.

_Approved by Agent B — UX/UI_
