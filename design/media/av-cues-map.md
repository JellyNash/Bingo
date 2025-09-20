# AV Cues Map

| Event | Cue | Output | Notes |
| --- | --- | --- | --- |
| Game intro | "Neon Sweep" video loop | Big-Screen | Autoplays after GM presses Start; muted with optional BGM toggle |
| Number draw | "Orb Ping" sfx (0.6s) | All clients | Triggered on draw broadcast; respect mute setting |
| Claim submitted | "Chime" sfx | Player + Console | Plays on submit; softer volume |
| Claim approved | Confetti + "Victory Hit" sfx | Player, Big-Screen | Delay 200ms to align with confettiExplosion |
| Claim denied | "Soft Error" sfx | Player | Pair with cooldown toast |
| Auto-draw paused | "Pause Downbeat" sfx | Big-Screen + Console | Also show status banner |
| Reconnect success | "Reconnect Pop" sfx | Player | 0.4s, optional via settings |
| Reconnect pending | Looping "Soft Hum" under 20s | Player | Auto stops when connected |

Media assets delivered as 44.1kHz AAC, <200KB per sfx, hosted locally/offline per PRD.

_Approved by Agent B — UX/UI_
