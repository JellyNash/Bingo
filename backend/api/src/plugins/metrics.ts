import fp from 'fastify-plugin';
import { Counter, Histogram, Registry } from 'prom-client';

export interface MetricsPluginDecorations {
  metrics: {
    registry: Registry;
    requestCounter: Counter<string>;
    requestDuration: Histogram<string>;
    claimValidationDuration: Histogram<string>;
  };
}

declare module 'fastify' {
  interface FastifyInstance extends MetricsPluginDecorations {}
}

const metricsPlugin = fp(async (fastify) => {
  const registry = new Registry();

  const requestCounter = new Counter({
    name: 'api_requests_total',
    help: 'Total API requests',
    labelNames: ['route', 'method', 'status_code'],
    registers: [registry],
  });

  const requestDuration = new Histogram({
    name: 'api_request_duration_ms',
    help: 'API request duration in milliseconds',
    labelNames: ['route', 'method'],
    buckets: [10, 25, 50, 100, 200, 400, 800, 1600],
    registers: [registry],
  });

  const claimValidationDuration = new Histogram({
    name: 'claim_validation_ms',
    help: 'Claim validation duration in milliseconds',
    buckets: [10, 25, 50, 75, 100, 200, 400],
    registers: [registry],
  });

  fastify.decorate('metrics', {
    registry,
    requestCounter,
    requestDuration,
    claimValidationDuration,
  });

  fastify.get('/metrics', async (_req, reply) => {
    reply.header('Content-Type', registry.contentType);
    return reply.send(await registry.metrics());
  });

  fastify.addHook('onResponse', async (request, reply) => {
    if (!request.routerPath) return;
    const route = request.routerPath;
    requestCounter.inc({
      route,
      method: request.method,
      status_code: reply.statusCode,
    });
    const elapsed = Number(process.hrtime.bigint() - (request as any)._startTime) / 1_000_000;
    requestDuration.observe({ route, method: request.method }, elapsed);
  });

  fastify.addHook('onRequest', async (request) => {
    (request as any)._startTime = process.hrtime.bigint();
  });
});

export default metricsPlugin;
