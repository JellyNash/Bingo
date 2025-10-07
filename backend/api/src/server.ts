import fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
// import multipart from '@fastify/multipart';
import { config } from './config.js';
import metricsPlugin from './plugins/metrics.js';
import authPlugin from './plugins/auth.js';
import rateLimitPlugin from './plugins/rate-limit.js';
import openapiPlugin from './plugins/openapi.js';
import routesPlugin from './routes/index.js';
import { ensureDbConnection } from './services/prisma.js';
import { redis } from './services/redis.js';
import { sessionCleanupService } from './services/session-cleanup.js';

export function buildServer() {
  const app = fastify({
    logger: {
      level: 'info',
    },
  });

  // CORS with credentials support for GameMaster cookies
  app.register(cors, {
    origin: [config.consoleAppUrl, config.screenAppUrl, config.playerAppUrl].filter(Boolean),
    credentials: true,
  });

  // Cookie support for GameMaster sessions
  app.register(cookie, {
    secret: config.cookieSecret,
    hook: 'onRequest',
  });

  // TODO: Multipart/form-data support for file uploads
  // app.register(multipart, {
  //   limits: {
  //     fileSize: 50 * 1024 * 1024, // 50MB limit for audio pack uploads
  //   },
  // });

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

  // Start session cleanup service
  sessionCleanupService.start();

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    app.log.info(`Server listening on port ${config.port}`);

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal: string) => {
      app.log.info(`Received ${signal}, starting graceful shutdown...`);

      try {
        // Stop session cleanup service
        sessionCleanupService.stop();
        app.log.info('Session cleanup service stopped');

        // Close Redis connections
        await redis.quit();
        app.log.info('Redis connections closed');

        // Close Fastify server
        await app.close();
        app.log.info('HTTP server closed');

        process.exit(0);
      } catch (error) {
        app.log.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (err) {
    app.log.error(err);
    sessionCleanupService.stop(); // Stop cleanup service on error
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}
