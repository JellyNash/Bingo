# Typography

| Token | Font Family | Size | Line Height | Usage |
| --- | --- | --- | --- | --- |
| `font-display` | "Space Grotesk", "Segoe UI", sans-serif | clamp(32px, 4vw, 48px) | 120% | Big-Screen headlines, callouts |
| `font-heading` | "Space Grotesk", "Segoe UI", sans-serif | 28px | 120% | Console section titles |
| `font-body` | "Inter", "Segoe UI", sans-serif | 16px | 150% | Player body copy |
| `font-body-sm` | "Inter", "Segoe UI", sans-serif | 14px | 150% | Metadata, labels |
| `font-mono` | "JetBrains Mono", monospace | 13px | 150% | PIN display, diagnostics |

## Type Scale
- Display: 48 / 42 / 36
- Heading: 28 / 24 / 20
- Body: 18 / 16 / 14
- Caption: 12

## Tailwind Mapping
- `font-display` → `font-display`
- `font-heading` → `font-heading`
- `font-body` → default `font-sans`
- `font-body-sm` → `text-sm`
- Apply `tracking-tight` for display headlines; `tracking-normal` elsewhere.

_Approved by Agent B — UX/UI_
