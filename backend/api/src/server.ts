import fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import metricsPlugin from './plugins/metrics.js';
import authPlugin from './plugins/auth-jwt.js';
import rateLimitPlugin from './plugins/rate-limit.js';
import openapiPlugin from './plugins/openapi.js';
import routesPlugin from './routes/index.js';
import { ensureDbConnection } from './services/prisma.js';
import { redis } from './services/redis.js';

export function buildServer() {
  const app = fastify({
    logger: {
      level: 'info',
    },
  });

  app.register(cors, { origin: true });
  app.register(metricsPlugin);
  app.register(openapiPlugin);
  app.register(authPlugin);
  app.register(rateLimitPlugin);
  app.register(routesPlugin);

  app.get('/healthz', async () => ({ status: 'ok' }));

  return app;
}

async function start() {
  const app = buildServer();
  await ensureDbConnection();
  await redis.ping(); // Ensure Redis connection
  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    app.log.info(`Server listening on port ${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}
