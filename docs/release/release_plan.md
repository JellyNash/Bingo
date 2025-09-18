# Release Plan

## Phase 1 — MVP (Weeks 1–5)
- Must-haves (list)
  - Server-authoritative Fastify + Socket.IO service with Redis pub/sub, Postgres persistence, HMAC card signing, and signed draw ledger
  - Player PWA with join/mark/claim/resume flows, offline cache, LAN discovery (bingo.local), rate-limited actions, and strike feedback
  - GameMaster console for lobby create/open/start/pause/resume, manual draw, auto-draw configuration, and claim/penalty management
  - Big-Screen client delivering synchronized draw animations, history ticker, winner announcements, and media cue playback
  - Observability stack: OTel traces, Prom metrics, Grafana dashboards, structured logs; load rig + test scripts for ≥1000 players
- Milestones & success metrics
  - Week 1: Architecture baseline, Redis/Socket.IO prototype, LAN discovery PoC — Success metric: reconnect demo ≤3s verified by Agent C
  - Week 2: Player join/mark/claim flows wired to server — Success metric: lab measurement shows draw→UI mean <180ms
  - Week 3: GameMaster controls + penalty lifecycle completed — Success metric: QA scenario logs 3-strike → 30s cooldown enforcement without regressions
  - Week 4: Big-Screen animations + resume flows validated — Success metric: reference hardware test hits 60fps with <1 dropped frame/min
  - Week 5: Scale + observability hardening — Success metric: 1000-player soak test hits latency avg <200ms, error rate <1%, dashboards reviewed by Ops

## Phase 2 — Enhancements (Weeks 6–8+)
- Nice-to-haves (custom patterns, OBS overlay mode refinements, etc.)
  - Configurable multi-winner queue, optional undo-last-draw, and advanced call pacing presets
  - Big-Screen/OBS overlay enhancements with programmable media cue scheduling and sponsor interstitials
  - Expanded accessibility (localization pack, screen-reader optimizations, captioned audio cues)
  - Advanced analytics dashboards (venue KPIs, strike heatmaps, per-player retention insights)
- Milestones & success metrics
  - Week 6: Multi-winner + undo beta gated for Agent C — Metric: simultaneous claim queue passes integration tests with <250ms arbitration
  - Week 7: OBS overlay + media scheduler shipped to Agent B — Metric: overlay latency <250ms end-to-end, UX sign-off draft captured
  - Week 8+: Accessibility and analytics uplift — Metric: WCAG AA audit ≥95% pass, analytics dashboards validated by Ops walkthrough

## Phase 3 — Future
- Tournaments, multi-game types, cloud scale, etc.
  - Tournament orchestration with scheduling, seeding, and prize logic
  - Additional game types (90-ball, blackout, speed rounds) and card customization pipeline
  - Cloud auto-scale with geo-distributed edges, spectator chat, and user accounts
  - Monetization hooks, loyalty programs, enterprise admin dashboards, CRM exports

## Risks & Mitigations
- WiFi capacity/latency at venue → Mitigation: pre-event site survey, supply wired fallback kits, include QoS checklist
- Redis restart or data loss → Mitigation: Redis Sentinel cluster with AOF persistence, automated snapshot replay, chaos drills Week 4
- Audio autoplay restrictions → Mitigation: require initial user interaction to unlock sounds, provide visual cue fallback, preflight in target browsers
- PWA install friction → Mitigation: in-app coach screens, QR onboarding, offline help sheet, analytics on prompt dismissal
- Load rig availability → Mitigation: reserve cloud slot Week 4, maintain local k6 scripts, escalate to Ops if slot at risk

## Exit Criteria per Phase
- Phase 1: All MVP acceptance criteria pass; soak test ≥1000 players meets latency/error targets; LAN offline demo signed off by Agents B & C
- Phase 2: Multi-winner + undo toggles ready with doc updates; overlay UX approved by Agent B; accessibility audit closed with no critical issues
- Phase 3: Roadmap epics sized, funding/OKRs aligned, backlog tagged for execution readiness with dependency mapping
