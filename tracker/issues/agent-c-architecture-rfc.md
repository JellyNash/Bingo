# Agent C — Architecture RFC & Contracts

## Status: In Progress

## Checklist

### Structure
- [ ] RFC present with all 10 sections
- [ ] Mermaid diagrams checked in
- [ ] Prisma schema compiles (basic sanity)
- [ ] Prisma includes PK/FK, unique + useful indexes
- [ ] OpenAPI covers all MVP endpoints
- [ ] OpenAPI securitySchemes for JWT
- [ ] OpenAPI error responses modeled
- [ ] Sockets spec defines namespaces, rooms, payloads, and auth
- [ ] Security/fairness doc includes seed/HMAC/JWT/idempotency/rate-limit/audit
- [ ] Observability plan lists spans + metrics + dashboards
- [ ] Offline mode doc includes mDNS bingo.local and CDN-free assets

### Feasibility & NFRs
- [ ] Draw→UI <200ms path explained (publish → Redis → Socket.IO emit)
- [ ] Scale rationale (Redis adapter, horizontal realtime) stated
- [ ] Penalty model matches PRD (3 strikes/30s + 120s RL lockout)
- [ ] Undo-last-draw MVP stance explicitly stated

### Implementability
- [ ] API ↔ DB flows align with orchestrator library calls
- [ ] Snapshot/resume clear; late join covered
- [ ] Idempotency key strategy (Redis TTL) documented

## Labels
- architecture
- contracts
- security
- observability
- offline