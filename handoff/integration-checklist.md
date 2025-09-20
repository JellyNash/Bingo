# Architecture Integration Checklist

**Agent C Deliverables - Complete **
**Date:** 2025-09-19

## For Backend Development (Agent D)

### Database Setup
- [ ] Initialize PostgreSQL with Prisma schema from `db/prisma/schema.prisma`
- [ ] Run Prisma migrations to create all tables
- [ ] Set up connection pooling (max 200 connections)
- [ ] Configure indexes as specified in schema

### API Implementation
- [ ] Implement all REST endpoints from `contracts/openapi/bingo.yaml`
- [ ] JWT authentication middleware with HS256
- [ ] Rate limiting with Redis token buckets
- [ ] Idempotency key handling for critical operations

### Game Orchestrator
- [ ] Implement as embedded Node.js library (MVP approach)
- [ ] HMAC-SHA256 RNG seeding for fairness
- [ ] Card generation with signature verification
- [ ] Claim validation with microsecond timestamps
- [ ] Penalty engine with 3-strike system

### WebSocket Server
- [ ] Socket.IO with Redis adapter
- [ ] Namespace configuration (`/game`, `/admin`, `/system`)
- [ ] JWT handshake validation
- [ ] Event handlers from `contracts/sockets/events.md`

### Security Implementation
- [ ] Implement security framework from `architecture/security/fairness-and-security.md`
- [ ] HMAC card binding
- [ ] Rate limiting (15 marks/10s, 5 claims/min)
- [ ] Audit logging with hash chain

## For Frontend Development (Agent E)

### PWA Setup
- [ ] Service Worker with offline caching
- [ ] Background sync for queued operations
- [ ] mDNS service discovery implementation
- [ ] PWA manifest with install prompts

### Component Implementation
- [ ] Player game view with Bingo card
- [ ] GameMaster console interface
- [ ] Big-Screen display component
- [ ] Real-time WebSocket integration

### State Management
- [ ] Client-side state sync with server authority
- [ ] Optimistic updates with reconciliation
- [ ] Offline queue for mutations
- [ ] Resume token handling

## For DevOps (Agent F)

### Docker Configuration
- [ ] Multi-stage Dockerfiles for all services
- [ ] Docker Compose from `architecture/offline/offline-mode.md`
- [ ] Health checks for all containers
- [ ] Volume mounts for persistence

### Monitoring Setup
- [ ] Prometheus metrics from `architecture/observability/prometheus-metrics.md`
- [ ] Grafana dashboards from `architecture/observability/dashboards.md`
- [ ] OpenTelemetry from `architecture/observability/otel-plan.md`
- [ ] Alert rules configuration

### Offline Deployment
- [ ] mDNS service configuration
- [ ] Asset bundling pipeline
- [ ] One-command deployment script
- [ ] Network configuration

## Critical Performance Targets

### Latency Requirements ¡
- Draw ’ UI: **<200ms average, <300ms P95**
- Claim validation: **<100ms server-side**
- Player join: **<500ms PIN to game**
- Reconnection: **<3 seconds**

### Scale Requirements =Ê
- Concurrent players: **e1000 per game**
- WebSocket connections: **10,000+ per instance**
- Game sessions: **100+ simultaneous**
- Error rate: **<1% at capacity**

## Architecture Decisions to Honor

### MVP Simplifications
1. **Orchestrator as Library:** Embedded in API service, not separate microservice
2. **Single Redis Instance:** Used for both cache and pub/sub
3. **Socket.IO:** Instead of raw WebSockets for faster development

### Security Non-Negotiables
1. **Server Authority:** All game logic server-side
2. **HMAC Signatures:** All cards cryptographically signed
3. **Audit Trail:** Complete action logging with hash chain
4. **Rate Limiting:** Token bucket with escalating penalties

## Testing Requirements

### Performance Testing
- [ ] Load test with 1200 concurrent players
- [ ] Verify <200ms draw latency under load
- [ ] Test Redis failover behavior
- [ ] Validate reconnection under network issues

### Security Testing
- [ ] Card tampering attempts
- [ ] Rate limit bypass attempts
- [ ] JWT token manipulation
- [ ] Timing attack resistance

## Documentation Needs

### API Documentation
- [ ] Swagger UI for REST endpoints
- [ ] Socket.IO event documentation
- [ ] Authentication flow guide
- [ ] Error code reference

### Deployment Documentation
- [ ] Offline deployment guide
- [ ] Production deployment checklist
- [ ] Monitoring setup instructions
- [ ] Troubleshooting guide

## Sign-off Requirements

Each agent should verify:
1. All deliverables from their section complete
2. Integration tests passing with other components
3. Performance targets met
4. Security requirements implemented
5. Documentation complete

---

**Architecture Status:**  APPROVED - Ready for Implementation
**RFC Location:** `/docs/architecture/RFC.md`
**Contracts:** `/contracts/` directory
**Schema:** `/db/prisma/schema.prisma`