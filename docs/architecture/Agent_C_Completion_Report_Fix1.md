# Agent C — Fix Sprint Completion (Gate 1)

## Summary of Remediation
- Replaced the legacy OpenAPI draft with the canonical contract covering all required MVP routes and shared schemas, including bearer auth (`contracts/openapi/bingo.yaml:1-210` & `contracts/openapi/bingo.yaml:211-298`).
- Pointed the Fastify Swagger loader at the contracts directory so `/docs` serves the updated specification (`backend/api/src/plugins/openapi.ts:1-28`).
- Regenerated `openapi.d.ts` using the bundled CLI to unblock TypeScript consumers (see command output below).
- Realigned the Socket.IO reference to the implemented namespaces, Redis channel, and payloads (`contracts/sockets/events.md:1-153`).

## Verification Evidence
```bash
# regenerate API types
cd backend/api \
  && node node_modules/openapi-typescript/bin/cli.js ../../contracts/openapi/bingo.yaml -o src/types/openapi.d.ts
```
```
✨ openapi-typescript 6.7.6
🚀 ../../contracts/openapi/bingo.yaml → file:///mnt/c/projects/bingo/backend/api/src/types/openapi.d.ts [36ms]
```

```bash
# Swagger document served from /docs/json
cd backend/api \
  && DATABASE_URL=postgres://example \
     REDIS_URL=redis://localhost \
     JWT_SECRET=devsecret \
     node - <<'NODE'
const fastify = require('fastify');
const swagger = require('@fastify/swagger');
const swaggerUi = require('@fastify/swagger-ui');
const path = require('node:path');
(async () => {
  const app = fastify();
  app.register(swagger, {
    mode: 'static',
    specification: {
      path: path.join(__dirname, '../../contracts/openapi/bingo.yaml'),
      baseDir: path.join(__dirname, '../../contracts/openapi'),
    },
  });
  app.register(swaggerUi, { routePrefix: '/docs' });
  await app.ready();
  const res = await app.inject({ method: 'GET', url: '/docs/json' });
  console.log('status', res.statusCode);
  console.log('paths', Object.keys(JSON.parse(res.body).paths));
  await app.close();
})();
NODE
```
```
status 200
paths [
  '/games',
  '/games/{id}/open',
  '/join',
  '/resume',
  '/games/{id}/draw',
  '/games/{id}/auto-draw',
  '/games/{id}/pause',
  '/games/{id}/undo',
  '/cards/{cardId}/mark',
  '/cards/{cardId}/claim',
  '/games/{id}/penalty',
  '/games/{id}/snapshot'
]
```

## Outstanding Notes
- Fastify routes still fail TypeScript compilation because of historical syntax issues (`src/routes/index.ts`); Agent D owns that fix in Gate 2.

## Commit & Tag
No commits pushed yet — changes staged locally awaiting sprint roll-up.
