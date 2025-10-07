import Fastify from "fastify";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";

const PORT = Number(process.env.PORT ?? 4000);
const JWT_SECRET = process.env.JWT_SECRET ?? "dev_only_replace_me";
const JWT_ISSUER = process.env.JWT_ISSUER ?? "bingo-api";
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const EVENT_CHANNEL = process.env.EVENT_CHANNEL ?? "bingo:events";

// Metrics counters
const metrics = {
  connections: 0,
  disconnections: 0,
  eventsEmitted: 0,
  eventsReceived: 0,
  authFailures: 0,
};

const app = Fastify({ logger: true });
await app.register(helmet);
await app.register(jwt as any, {
  secret: JWT_SECRET,
  verify: {
    allowedIss: [JWT_ISSUER],
    maxAge: '12h',
    clockTolerance: 5,
  },
});

app.get("/health", async () => ({ ok: true, service: "realtime" }));

app.get("/metrics", async () => {
  // Basic Prometheus format
  const lines = [
    "# HELP realtime_connections_total Total number of socket connections",
    "# TYPE realtime_connections_total counter",
    `realtime_connections_total ${metrics.connections}`,
    "",
    "# HELP realtime_disconnections_total Total number of socket disconnections",
    "# TYPE realtime_disconnections_total counter",
    `realtime_disconnections_total ${metrics.disconnections}`,
    "",
    "# HELP realtime_events_emitted_total Total number of events emitted to clients",
    "# TYPE realtime_events_emitted_total counter",
    `realtime_events_emitted_total ${metrics.eventsEmitted}`,
    "",
    "# HELP realtime_events_received_total Total number of events received from broker",
    "# TYPE realtime_events_received_total counter",
    `realtime_events_received_total ${metrics.eventsReceived}`,
    "",
    "# HELP realtime_auth_failures_total Total number of authentication failures",
    "# TYPE realtime_auth_failures_total counter",
    `realtime_auth_failures_total ${metrics.authFailures}`,
  ];
  return lines.join("\n");
});

// Important: attach Socket.IO to Fastify's native server
const io = new Server(app.server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// Redis adapter for horizontal scale
const pub = new Redis(REDIS_URL);
const sub = new Redis(REDIS_URL);
io.adapter(createAdapter(pub, sub));

const NAMESPACE_CONFIG = {
  "/player": "player",
  "/screen": "screen",
  "/console": "host",
} as const;

type NamespaceName = keyof typeof NAMESPACE_CONFIG;
type NamespaceRole = typeof NAMESPACE_CONFIG[NamespaceName];

function makeAuthMiddleware(requiredRole: NamespaceRole) {
  return async (socket: any, next: any) => {
    try {
      const token = socket.handshake.auth?.token ?? socket.handshake.query?.token;
      if (!token) {
        metrics.authFailures++;
        return next(new Error("unauthorized"));
      }

      const payload: any = await app.jwt.verify(token);
      const payloadRole = payload?.role as NamespaceRole | undefined;
      const payloadGame = payload?.gameId as string | undefined;

      if (!payloadRole || (payloadRole !== requiredRole && !(requiredRole === "screen" && payloadRole === "host"))) {
        metrics.authFailures++;
        return next(new Error("forbidden"));
      }

      if (!payloadGame) {
        metrics.authFailures++;
        return next(new Error("invalid token"));
      }

      (socket as any).ctx = payload;
      socket.data.user = payload;
      next();
    } catch (err) {
      metrics.authFailures++;
      next(new Error("auth failed"));
    }
  };
}

const namespaceNames = Object.keys(NAMESPACE_CONFIG) as NamespaceName[];

// Build namespaces; join room per game
function makeNamespace(name: NamespaceName, requiredRole: NamespaceRole) {
  const nsp = io.of(name);
  nsp.use(makeAuthMiddleware(requiredRole));
  nsp.on("connection", (socket) => {
    metrics.connections++;
    const { gameId, role } = (socket as any).ctx ?? {};
    if (!gameId) {
      metrics.disconnections++;
      return socket.disconnect(true);
    }
    const room = `game:${gameId}`;
    socket.join(room);
    socket.emit("state:update", { connected: true, ns: name, role, room });
    metrics.eventsEmitted++;

    socket.on("disconnect", () => {
      metrics.disconnections++;
    });
  });
  return nsp;
}

namespaceNames.forEach((ns) => {
  makeNamespace(ns, NAMESPACE_CONFIG[ns]);
});

// Redis broker subscription → broadcast to ALL namespaces
const brokerSub = new Redis(REDIS_URL);
brokerSub.subscribe(EVENT_CHANNEL, (err: Error | null | undefined) => {
  if (err) app.log.error({ err }, "Failed to subscribe to broker channel");
  else app.log.info({ EVENT_CHANNEL }, "Subscribed to broker channel");
});
brokerSub.on("message", (_channel: string, message: string) => {
  try {
    const { room, event, data } = JSON.parse(message);
    metrics.eventsReceived++;
    let delivered = 0;
    for (const ns of namespaceNames) {
      const sockets = io.of(ns).to(room);
      sockets.emit(event, data);
      delivered++;
      metrics.eventsEmitted++;
    }
    app.log.info({ event, room, delivered }, "broker→socket broadcast");
  } catch (e) {
    app.log.error({ e, message }, "Invalid broker payload");
  }
});

// Start Fastify (and thereby the Socket.IO server)
await app.listen({ port: PORT, host: "0.0.0.0" });
app.log.info(`Realtime listening on :${PORT}`);
