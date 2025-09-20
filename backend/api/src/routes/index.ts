import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import gamesCreate from './games.create.js';
import gamesOpen from './games.open.js';
import gamesDraw from './games.draw.js';
import gamesAuto from './games.auto.js';
import gamesPause from './games.pause.js';
import gamesUndo from './games.undo.js';
import joinRoute from './join.js';
import resumeRoute from './resume.js';
import markRoute from './cards.mark.js';
import claimRoute from './cards.claim.js';
import penaltyRoute from './penalties.apply.js';
import snapshotRoute from './snapshot.get.js';
import analyticsIngest from './analytics.ingest.js';

const routesPlugin = fp(async (fastify: FastifyInstance) => {
  await fastify.register(gamesCreate);
  await fastify.register(gamesOpen);
  await fastify.register(gamesDraw);
  await fastify.register(gamesAuto);
  await fastify.register(gamesPause);
  await fastify.register(gamesUndo);
  await fastify.register(joinRoute);
  await fastify.register(resumeRoute);
  await fastify.register(markRoute);
  await fastify.register(claimRoute);
  await fastify.register(penaltyRoute);
  await fastify.register(snapshotRoute);
  await fastify.register(analyticsIngest);
});

export default routesPlugin;
