# Architecture RFC — Bingo Platform

**Version:** 1.0
**Date:** 2025-09-19
**Author:** Agent C — System Architect
**Status:** Approved

## Executive Summary

This RFC defines the architecture for a real-time multiplayer Bingo platform targeting event venues with server-authoritative game logic, <200ms draw-to-UI latency, and support for ≥1000 concurrent players. The system uses Fastify + Socket.IO + Redis + PostgreSQL with an orchestrator library pattern for MVP simplicity while maintaining production readiness.

## 1. Context (C4 Level 1)

![System Context](../diagrams/c4-context.mmd)

### Users & External Systems
- **Players:** Event attendees using PWA on mobile/desktop for joining games, marking numbers, and claiming Bingo
- **GameMasters:** Event facilitators managing game flow via web console with authoritative controls
- **Audience:** On-site viewers consuming Big-Screen experience with live game state
- **mDNS Service:** Local network discovery enabling offline/LAN deployment via bingo.local
- **PWA Cache:** Service Worker providing offline asset delivery and background sync

### System Responsibilities
- **Game Orchestration:** Server-authoritative logic for card generation, draw sequence, and claim validation
- **Real-time Communication:** Sub-200ms event propagation for draws, claims, and state changes
- **Fairness & Security:** Cryptographically secure RNG with HMAC-signed cards and audit trails
- **Offline Capability:** Zero-config LAN deployment with mDNS discovery and local asset caching
- **Scalability:** Support for 1000+ concurrent players with Redis-based horizontal scaling

## 2. Containers (C4 Level 2)

![Container Architecture](../diagrams/c4-container.mmd)

### Web Clients
- **Player PWA (React + Vite):** Progressive web app with offline support, service worker caching, installable experience
- **GameMaster Console (React + Vite):** Administrative interface for game control, claim management, penalty enforcement
- **Big-Screen Display (React + Vite):** Read-only public display for audience with animated draw history and winner announcements

### Backend Services
- **REST API (Fastify + Node.js):** HTTP endpoints for game lifecycle, player management, administrative operations
- **Realtime Engine (Socket.IO + Node.js):** WebSocket server handling live events with Redis adapter for scaling
- **Game Orchestrator (Node.js Library):** Server-authoritative business logic as embedded library (MVP approach)

### Data Layer
- **PostgreSQL:** Primary persistence for game state, audit logs, player data with ACID compliance
- **Redis:** Session cache, rate limiting state, pub/sub message broker for horizontal scaling

### Deployment
- **Docker Compose:** Single-host offline deployment with mDNS advertising
- **mDNS Service:** Local network discovery for bingo.local domain resolution

## 3. Components (C4 Level 3)

![Component Architecture](../diagrams/c4-component.mmd)

### API Layer Components
- **Auth Middleware:** JWT validation, session management, request authentication
- **Rate Limiter:** Token bucket implementation per IP/player preventing abuse
- **Idempotency Filter:** Redis-backed deduplication for claim operations
- **Game Controller:** Game lifecycle endpoints (create, start, pause, draw)
- **Player Controller:** Player management (join, mark, claim, resume)
- **Admin Controller:** GameMaster operations (penalties, claim review, overrides)

### Realtime Layer Components
- **WebSocket Auth:** JWT handshake validation for Socket.IO connections
- **Namespaces:** Logical separation (game:<id>, admin:<id>, display:<id>)
- **Rooms Manager:** Dynamic room assignment for players, GameMasters, displays
- **Event Broadcaster:** Redis adapter integration for multi-instance scaling

### Orchestrator Library Components
- **Game Logic:** Core business rules, state transitions, lifecycle management
- **RNG Service:** HMAC-SHA256 seeded random number generation for fairness
- **Claim Validator:** Pattern matching, timing verification, simultaneous claim resolution
- **Penalty Engine:** Strike tracking, cooldown enforcement, automatic disqualification
- **State Manager:** Persistent state operations with Prisma ORM integration

## 4. Key Sequences

### Player Join Flow
![Player Join Sequence](../diagrams/seq-player-join.mmd)

Critical path optimizations:
- Pre-generated card pools for sub-100ms join times
- JWT token generation with 30-minute expiry
- WebSocket room assignment with Redis pub/sub
- Immediate game state synchronization

### Number Draw Broadcast
![Draw Broadcast Sequence](../diagrams/seq-draw-broadcast.mmd)

Performance targets:
- **Target:** <200ms from GameMaster draw to player UI update
- **P95 Goal:** <300ms on LAN conditions
- **Optimization:** Redis pub/sub fanout with minimal serialization overhead

### Bingo Claim Resolution
![Claim Resolution Sequence](../diagrams/seq-claim-resolution.mmd)

Fairness guarantees:
- Microsecond timestamp precision for simultaneous claims
- Atomic database transactions for claim adjudication
- Server-side pattern validation with HMAC verification
- Immediate feedback with detailed denial reasons

### Reconnection/Resume
- JWT resume token validation (30-minute expiry)
- Redis-based event replay for missed draws
- State synchronization with incremental updates
- Sub-3-second reconnection target on LAN

## 5. Data Model Overview

**Detailed schema:** See `../data-model/prisma.schema.prisma`

### Core Tables
- **games:** Game sessions with configuration, state, timing
- **players:** Player enrollments with nicknames, JWT tokens
- **bingo_cards:** HMAC-signed cards with cryptographic verification
- **draws:** Numbered sequence with letter/number, timestamp
- **claims:** Player claims with patterns, validation results, timing
- **penalties:** Strike tracking, cooldown management
- **audit_log:** Complete action history for accountability
- **sessions:** WebSocket session management with resume tokens

### Key Indexes
- `games.pin` (unique) for fast game discovery
- `players.game_id` + `nickname` (composite unique) for enrollment
- `draws.game_id` + `sequence` for ordered retrieval
- `claims.game_id` + `timestamp` for simultaneous resolution
- `audit_log.game_id` + `timestamp` for operational queries

## 6. Security & Fairness

**Detailed specifications:** See `../security/fairness-and-security.md`

### Cryptographic Foundations
- **RNG Seeding:** HMAC-SHA256 with game-specific salt for deterministic reproducibility
- **Card Signatures:** HMAC verification preventing client-side tampering
- **Draw Ledger:** Cryptographically signed sequence preventing retroactive manipulation

### Authentication & Authorization
- **JWT Tokens:** HS256 with player-scoped claims and expiry
- **Role-based Access:** Player, GameMaster, Admin scopes with endpoint protection
- **Session Management:** Redis-backed tokens with revocation capability

### Rate Limiting & Abuse Prevention
- **Mark Operations:** 15 marks per 10 seconds per player
- **Claim Operations:** 5 claims per minute with exponential backoff
- **Strike System:** 3 strikes → 30-second cooldown → auto-disqualification
- **Rate Limit Lockout:** 120-second hard timeout after abuse threshold

### Audit & Compliance
- **Complete Action Logging:** Every player action, draw, claim with timestamps
- **GameMaster Actions:** Administrative overrides with justification tracking
- **Security Events:** Failed authentications, rate limit violations, suspicious patterns

## 7. Reliability & Recovery

### Failure Modes & Recovery

**API Server Restart:**
- Stateless design enables immediate replacement
- Redis session store maintains player connections
- Sub-10-second hot restart with health checks

**WebSocket Server Restart:**
- Client auto-reconnection with exponential backoff
- Redis event replay for missed messages
- Session resume via JWT tokens

**Redis Outage:**
- Graceful degradation to single-instance mode
- Local session fallback with reduced scalability
- Automatic recovery when Redis returns

**PostgreSQL Outage:**
- Connection pooling with retry logic
- Read-only mode for ongoing games
- Write queue with ordered replay on recovery

### Snapshot & Resume Strategy
- **Game State Snapshots:** Complete state serialization every 100 draws
- **Incremental Updates:** Redis-based event sourcing for real-time state
- **Resume Tokens:** JWT with game position for seamless reconnection
- **Cross-server Resume:** Redis-backed session sharing across instances

### Data Consistency
- **ACID Transactions:** Critical operations (claims, penalties) use database transactions
- **Optimistic Locking:** Version fields for concurrent update conflict resolution
- **Event Ordering:** Redis streams for guaranteed message ordering
- **Idempotency:** Client-provided request IDs for duplicate operation prevention

## 8. Observability

**Detailed specifications:** See `../observability/` directory

### Distributed Tracing (OpenTelemetry)
- **Critical Spans:** join, mark, draw, claim, resume with sub-operation breakdown
- **Performance Monitoring:** P50/P95/P99 latency tracking for SLA compliance
- **Cross-service Correlation:** Request IDs across API, WebSocket, Database operations

### Metrics (Prometheus)
- **Business Metrics:** Active games, concurrent players, claim success rate
- **Performance Metrics:** Draw fanout latency, claim validation time, API response time
- **Infrastructure Metrics:** WebSocket connections, Redis memory, database connections
- **Error Metrics:** Failed joins, claim denials, reconnection failures

### Dashboards (Grafana)
- **Real-time Operations:** Live player counts, active games, system health
- **Performance Analytics:** Latency percentiles, throughput trends, error rates
- **Business Intelligence:** Game completion rates, player engagement, pattern analysis

## 9. Offline Mode

**Detailed specifications:** See `../offline/offline-mode.md`

### Docker Compose Deployment
- **Single-host Architecture:** All services containerized for venue deployment
- **mDNS Integration:** Automatic bingo.local domain advertising
- **Asset Bundling:** No external CDN dependencies, all assets self-contained
- **Database Initialization:** Automated schema migration and seed data

### PWA Offline Capabilities
- **Service Worker:** Aggressive caching of application assets
- **Background Sync:** Resume token persistence across network outages
- **Offline Indicators:** Clear UI feedback for connectivity status
- **Update Management:** Seamless app updates without breaking active games

## 10. Performance Targets & SLAs

### Latency Requirements
- **Draw → UI Update:** <200ms average, <300ms P95 (LAN conditions)
- **Claim Validation:** <100ms server-side processing
- **Player Join:** <500ms from PIN entry to game entry
- **Reconnection:** <3 seconds for full state synchronization

### Scalability Targets
- **Concurrent Players:** ≥1000 players per game session
- **Soak Test Goal:** 1200 concurrent players at <1% error rate
- **Game Capacity:** 100+ simultaneous game sessions
- **WebSocket Connections:** 10,000+ concurrent connections per instance

### Availability Goals
- **Uptime:** 99.9% during event hours
- **Hot Restart:** <10 seconds with state preservation
- **Reconnection Success:** >99% within 3 seconds
- **Data Durability:** Zero game state loss during planned maintenance

## 11. Technology Trade-offs & Decisions

### Orchestrator as Library (MVP Choice)
**Decision:** Embed game logic as Node.js library rather than separate microservice

**Pros:**
- Simplified deployment and debugging
- No network latency for business logic calls
- Easier state consistency without distributed transactions
- Faster MVP development

**Cons:**
- Reduced independent scalability
- Shared failure domains
- More complex testing isolation

**Future Migration Path:** Extract to microservice post-MVP with event sourcing

### Redis for Both Cache and Message Broker
**Decision:** Single Redis cluster for sessions, rate limiting, and pub/sub

**Pros:**
- Operational simplicity
- Atomic operations across cache and messaging
- Proven scalability patterns

**Cons:**
- Single point of failure
- Memory pressure from mixed workloads

**Mitigation:** Redis Cluster for production, local fallback for offline mode

### Socket.IO vs Raw WebSockets
**Decision:** Socket.IO with Redis adapter for real-time communication

**Pros:**
- Built-in room management
- Automatic reconnection handling
- Redis adapter for horizontal scaling
- Namespace isolation

**Cons:**
- Additional protocol overhead
- Vendor lock-in considerations

**Justification:** Rapid development priorities outweigh marginal performance costs

## 12. Risks & Mitigations

### Technical Risks

**WiFi Capacity Saturation:**
- **Risk:** 1000+ concurrent connections overwhelming venue WiFi
- **Mitigation:** Connection throttling, graceful degradation, offline mode
- **Monitoring:** Real-time connection health dashboards

**Redis Memory Exhaustion:**
- **Risk:** Large game sessions exceeding Redis memory limits
- **Mitigation:** TTL policies, memory monitoring, automatic cleanup
- **Scaling:** Redis Cluster with sharding for large deployments

**Database Lock Contention:**
- **Risk:** Simultaneous claims creating deadlock scenarios
- **Mitigation:** Optimistic locking, retry logic, claim queuing
- **Monitoring:** Lock wait time metrics and alerting

### Operational Risks

**Audio Autoplay Restrictions:**
- **Risk:** Browser policies preventing audio cues
- **Mitigation:** User gesture requirements, visual alternatives, vibration fallback
- **UX:** Clear audio permission prompting

**GameMaster Error Recovery:**
- **Risk:** Accidental draw or game state corruption
- **Mitigation:** Undo capabilities (Phase 2), audit trails, admin override tools
- **Training:** GameMaster onboarding with error scenarios

### Security Risks

**Card Generation Predictability:**
- **Risk:** Compromised RNG enabling card prediction
- **Mitigation:** HMAC-SHA256 seeding, secure random sources, seed rotation
- **Auditing:** Cryptographic verification of all card signatures

**Claim Timing Manipulation:**
- **Risk:** Client clock manipulation for claim timing advantage
- **Mitigation:** Server-side timestamp authority, network delay compensation
- **Detection:** Anomaly detection for impossible timing patterns

## 13. Future Architecture Evolution

### Phase 2 Considerations
- **Microservice Extraction:** Orchestrator → separate service with event sourcing
- **Multi-room Support:** Service mesh with inter-room communication
- **Tournament Features:** Bracket management, multi-stage games
- **Advanced Analytics:** Machine learning for fraud detection, player behavior analysis

### Scaling Patterns
- **Horizontal API Scaling:** Stateless API instances behind load balancer
- **WebSocket Scaling:** Socket.IO Redis adapter with sticky sessions
- **Database Scaling:** Read replicas for analytics, sharding for write scaling
- **Regional Deployment:** CDN integration for global asset delivery

---

**Approved by Agent C — System Architect**
**Date:** 2025-09-19
**Review Status:** Ready for Implementation