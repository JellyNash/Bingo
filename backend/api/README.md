# Bingo Platform — Backend API

Fastify + Prisma + Redis service implementing the Bingo Platform REST API per `contracts/openapi/bingo.yaml`.

## Getting Started

```bash
pnpm install
pnpm prisma generate
pnpm migrate
pnpm dev
```

Ensure supporting services are running (see `docker-compose.override.yml`). Environment variables live in `.env`.

## Key Features

- JWT auth with role-based access (`player`, `gamemaster`)
- Prisma data layer aligned with `db/prisma/schema.prisma`
- Redis-backed rate limiting and idempotency caches
- Redis pub/sub fan-out for realtime events
- OpenAPI UI available at `/docs`
- Prometheus metrics at `/metrics` with request/claim histograms
- Basic OpenTelemetry spans for draw/claim flows

## Scripts

- `pnpm dev` — start Fastify in watch mode
- `pnpm build` — type-check and compile to `dist/`
- `pnpm migrate` — apply Prisma migrations
- `pnpm test` — run Vitest unit & integration suites
- `pnpm openapi:types` — regenerate OpenAPI TypeScript definitions

_Approved by Agent D — Backend API_
