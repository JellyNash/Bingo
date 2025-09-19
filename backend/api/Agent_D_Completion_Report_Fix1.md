# Agent D — Fix Sprint Completion (Gate 2)

## Summary
- `/games/:gameId/open` now respects the lobby → open → active lifecycle: LOBBY transitions to `OPEN`, PAUSED resumes to `ACTIVE`, and idempotent calls return current state (`backend/api/src/routes/games.open.ts:19-44`).
- Manual and auto draws can flip a game from `OPEN` to `ACTIVE` on the first pull while preserving `startedAt`, ensuring auto-timers honour the new status guard (`backend/api/src/services/orchestrator.adapter.ts:88-142`, `backend/api/src/services/auto-draw.ts:32-44`).
- `/cards/:cardId/mark` matches the OpenAPI `MarkRequest` contract by accepting `{position, marked}` payloads, validating column ranges, and rejecting marks for numbers that have not been drawn while still returning eligible patterns (`backend/api/src/routes/cards.mark.ts:13-137`).
- Reconfirmed Redis event envelope `{ room, event, data }` and rate-limit/idempotency paths remain unchanged from the previous pass (see `backend/api/src/services/events.pubsub.ts:1-94`, `backend/api/src/plugins/rate-limit.ts:1-62`).

## Commands & Results
```bash
# regenerate OpenAPI types to stay in sync with contracts
cd backend/api && node node_modules/openapi-typescript/bin/cli.js ../../contracts/openapi/bingo.yaml -o src/types/openapi.d.ts
```
```
✨ openapi-typescript 6.7.6
🚀 ../../contracts/openapi/bingo.yaml → file:///mnt/c/projects/bingo/backend/api/src/types/openapi.d.ts [37ms]
```

```bash
# attempt to compile the workspace (blocked: missing @fastify/*, prom-client, prisma types)
COREPACK_ENABLE_DOWNLOAD=0 pnpm -F bingo-api build
```
```
> bingo-api@ build /mnt/c/projects/bingo/backend/api
> tsc -p tsconfig.json

src/server.ts(2,18): error TS2307: Cannot find module '@fastify/cors' or its corresponding type declarations.
src/plugins/metrics.ts(6,15): error TS2709: Cannot use namespace 'Registry' as a type.
...
src/routes/cards.mark.ts(1,15): error TS2305: Module '"@prisma/client"' has no exported member 'BingoCard'.
src/services/orchestrator.adapter.ts(127,32): error TS2694: Namespace '".../.prisma/client/default".Prisma' has no exported member 'GameUpdateInput'.
```

```bash
# attempt to run tests (blocked: vitest tinypool worker crash in sandbox)
COREPACK_ENABLE_DOWNLOAD=0 pnpm -F bingo-api test
```
```
> bingo-api@ test /mnt/c/projects/bingo/backend/api
> vitest run --pool=forks

node:events:485
      throw er; // Unhandled 'error' event
Error: Worker exited unexpectedly
    at ChildProcess.onUnexpectedExit (.../tinypool/dist/index.js:118:30)
```

```bash
# prisma generate (fails: sandbox prevents copying query engine binary)
cd backend/api && ./node_modules/.bin/prisma generate
```
```
Error: EACCES: permission denied, copyfile '.../libquery-engine' -> '.../prisma/libquery_engine-debian-openssl-3.0.x.so.node.tmpXXXXX'
```

## Outstanding Notes
- Type generation and compilation remain blocked because the sandbox cannot install the missing Fastify/Prisma/Prometheus packages or copy Prisma’s query engine binary; once access is restored run `pnpm install` followed by `pnpm -F bingo-api build`.
- Automated Vitest runs still exit via tinypool worker errors under this runtime; rerun `pnpm -F bingo-api test` after the environment allows spawning workers.
