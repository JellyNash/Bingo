# Motion & Animation Spec

| Variant | Duration | Ease | From | To | Notes |
| --- | --- | --- | --- | --- | --- |
| `flipInNumber` | 0.5s | easeOut | scale 0.6, rotateX -90°, opacity 0 | scale 1, rotateX 0°, opacity 1 | Trigger on new draw across Player + Big-Screen |
| `historySlide` | 0.3s | easeInOut | x 16px, opacity 0 | x 0, opacity 1 | Used for history chips entering from right |
| `cellMarkBounce` | 0.18s | spring(200, 20) | scale 0.9 | scale 1.02 → 1 | Transform-only to stay within 16ms budget |
| `cellMarkReverse` | 0.18s | spring(180, 18) | scale 1.08, opacity 0.9 | scale 1, opacity 1 | For undo mark |
| `buttonReveal` | 0.22s | easeOut | y 12px, opacity 0 | y 0, opacity 1 | Stagger 40ms for button groups |
| `dialogFade` | 0.24s | easeOut | y -8px, opacity 0 | y 0, opacity 1 | Overlay fades 0.18s, blur 16px |
| `queueEnter` | 0.22s | easeOut | y -12px, opacity 0 | y 0, opacity 1 | Claims queue item entrance |
| `statusPulse` | 0.3s | easeInOut | scale 0.98 | scale 1.02 → 1 | For reconnect/disqualified transitions |
| `sliderThumbDrag` | spring | spring(260, 24) | scale 0.95 | scale 1 | Clamped to transform/opacity |
| `orbPulse` | 2.4s loop | easeInOut | scale 0.98 | scale 1.02 | Idle breathing; reduce motion disables |
| `claimCooldown` | 30s linear | linear | stroke dashoffset 100% | 0% | CSS + Motion to drive countdown ring |
| `confettiExplosion` | 1.2s | easeOut | y 0, opacity 1 | y 32px, opacity 0 | Canvas-based, limit to 200 particles |

### Reduced Motion
- Honor prefers-reduced-motion: disable rotations (flipInNumber becomes simple fade/scale 0.96→1).
- Idle loops pause when tab inactive.

_Approved by Agent B — UX/UI_
