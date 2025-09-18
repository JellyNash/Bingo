# Bingo Platform — PRD v1.0

## 1. Overview
- Purpose: Deliver a resilient, event-ready Bingo experience that synchronizes GameMaster controls, Player interactions, and Big-Screen displays with server-authoritative integrity across LAN/offline and connected venues.
- Scope (MVP vs Future): MVP covers single-room 75-ball Bingo with standard patterns, penalty enforcement, reconnect/resume, LAN discovery (bingo.local), and observability. Future scope includes tournaments, multi-game types (90-ball, blackout, speed rounds), team/league modes, monetization, cosmetics, and advanced moderation analytics.
- Out of scope: Real-money gaming, multi-room orchestration, spectator chat, full tournament brackets, native app stores, third-party CDN dependencies, AI-assisted calling, and deep customization of card layouts beyond theme skins.

## 2. Personas
- Player: Event attendee or remote participant using the PWA on mobile/desktop. Needs low-latency feedback, intuitive interactions, assistive features, and reliable resume after drops.
- GameMaster (Host): Facilitator managing lobby setup, draw flow, claims, and penalties via web console. Requires authoritative tooling, visibility into strikes, and automated draw pacing.
- Audience: On-site viewers or streamed audience consuming the Big-Screen experience. Needs clear draw history, winner announcements, and synchronized media cues without interaction.

## 3. User Stories (MVP)
- Join via PIN + nickname
- Mark/undo numbers (called-only)
- Claim Bingo
- GameMaster: create/open/start/pause/draw/undo (if included)/auto-draw
- Manage claims (accept/deny), view strikes, apply penalties
- Big-Screen: show draws, history, winners, media cues

## 4. Game Rules & Variants
- 75-ball, 5×5 (center free) cards generated server-side with deterministic seed + HMAC signature per player.
- Valid patterns (rows, columns, diagonals, four corners) enforced server-side; Player UI highlights eligible lines.
- Multi-winner setting (MVP default: 1 winner). Multi-winner queue deferred to Phase 2.
- Simultaneous claim handling: Claims are timestamped server-side; earliest valid claim wins. Later claimants receive automated denial with reason. Manual override allowed only post-game via admin tooling (not MVP).

## 5. Penalties
- False-claim strikes and cooldowns (configurable; MVP defaults) set to 3 strikes leading to auto-disqualification and 30s cooldown after each invalid claim.
- Strike counters visible to GameMaster and player. GM may clear strikes or reinstate disqualified players.
- Rate-limit integration: >5 claim attempts/min triggers automatic strike and 120s hard cooldown.

## 6. Functional Requirements
- Server-authoritative logic (card gen, draws, validation) implemented on Fastify + Socket.IO with Redis fan-out and Postgres/Prisma persistence; all client mutations validated server-side.
- Offline/local mode via mDNS (bingo.local) enabling zero-config discovery; fallback manual IP entry supported; no reliance on external CDNs for critical assets.
- Resume after refresh/disconnect via signed resume tokens; missed events replay from Redis history; reconnect ≤3s on LAN.
- Player limits and late join behavior: Support ≥1000 concurrent players per room; late join allowed until first valid Bingo claim; afterwards players receive “game closed” state with next-session guidance.
- GameMaster controls include create/open/start/pause/resume/draw (manual and auto), configure auto-draw interval (default 8s, bounds 5–20s), strike management, and claim resolution. Undo-last-draw excluded from MVP (Phase 2 candidate); console displays tooltip indicating future availability.
- Big-Screen client consumes read-only event feed showcasing latest draw, animated history, winners, and synced media cues.

## 7. Non-Functional Requirements
- Performance: Draw→UI propagation <200ms average (LAN) with p95 <300ms; UI rendering budget ≤16ms/frame to sustain 60fps animations.
- Scale: Verified support for ≥1000 concurrent players/session with soak test goal of 1200 concurrent at <1% error rate.
- Availability/recovery expectations: Hot restart with state snapshot reload in ≤10s; reconnect success ≥99% within 3s; resume token expiry ≥30m.
- Security: JWT session tokens, HMAC card signatures, signed draw ledger, per-IP and per-player rate limiting on mark/claim (max 15 marks/10s, 5 claims/min), TLS in cloud deployments, audit logging for GM actions.
- Observability: OpenTelemetry tracing for join/mark/draw/claim/resume flows; Prometheus metrics for latency, errors, player counts; Grafana dashboards for live ops, infra health, and reconnect success.
- PWA: Installable Player application with service worker precache (<2s), offline splash, background sync for resume tokens, add-to-home prompts, and graceful caching updates.

## 8. UX/Interaction Notes (for Agent B)
- Motion cues: Animated ball draw with easing, per-card highlight flash, Big-Screen ticker slide at 60fps.
- Feedback states: Marked numbers display chip overlay; undo via second tap; claim button visually counts down during cooldown; toast banners for claim accepted/denied.
- Accessibility: High-contrast theme toggle, WCAG AA color contrast, ARIA live region announcing draws/claims, keyboard navigation, and captions for audio cues.
- Audio cues: Distinct sounds for draw, claim accepted, claim denied; respect mute toggle; fallback vibration on mobile where supported.

## 9. Edge Cases & Error States
- Rejoin after network loss: Expired token prompts PIN re-entry; partial state resync ensures no duplicate marks.
- Duplicate joins: Duplicate nickname auto-suffixes; same device reuse steers to resume flow.
- Invalid PIN or closed game: Error modal with retry or waitlist guidance; analytics event logged for operations.
- Simultaneous claims: Later claimants receive denial reason and strike evaluation per policy; GM console displays ordering and timestamps.
- Undo last draw: Explicitly out of MVP; GM console label indicates Phase 2 backlog item.
- Player penalties and disqualification flow: After 3 strikes, player cannot submit claims until reinstated. Big-Screen excludes disqualified players from winner highlights.

## 10. Analytics/Telemetry
- Key events: `player_join`, `player_mark`, `player_unmark`, `player_claim`, `claim_denied`, `gm_draw`, `gm_auto_draw_tick`, `gm_pause`, `resume_success`, `resume_failure`, `strike_applied`, `player_disqualified`, `pwa_install`, `mdns_discovery_success/failure`.
- Metrics: Draw latency histogram, claim adjudication latency, reconnect success rate, strike counts, rate-limit rejects, LAN discovery success %, Big-Screen frame timing.
- Dashboards: Grafana panels for real-time session health, reconnect pipeline, penalty trends, and PWA install funnel; OTel sampling baseline 20% production, 100% staging.

## 11. Acceptance Criteria (pointer)
- See acceptance_criteria_matrix.csv

## 12. Release Plan (pointer)
- See /docs/release/release_plan.md

---
_Approved by Agent A — Product Owner_
_Feasibility reviewed — Agent C_
_UX alignment reviewed — Agent B_
