import Fastify from "fastify";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";

const PORT = Number(process.env.PORT ?? 4000);
const JWT_SECRET = process.env.JWT_SECRET ?? "dev_only_replace_me";
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const EVENT_CHANNEL = process.env.EVENT_CHANNEL ?? "bingo:events";

// --- HTTP app (health + hosting socket) ---
const app = Fastify({ logger: true });
await app.register(helmet);
await app.register(jwt, { secret: JWT_SECRET });

app.get("/health", async () => ({ ok: true, service: "realtime" }));

const httpServer = createServer(app as any);

// --- Socket.IO + Redis adapter ---
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET","POST"] }
});
const pub = new Redis(REDIS_URL);
const sub = new Redis(REDIS_URL);
io.adapter(createAdapter(pub, sub));

// Auth middleware (JWT in auth.token or query.token)
async function authMiddleware(socket: any, next: any) {
  try {
    const token = socket.handshake.auth?.token ?? socket.handshake.query?.token;
    if (!token) return next(new Error("no token"));
    const payload = await app.jwt.verify(token);
    // expected claims: { gameId, playerId?, role?: "player"|"screen"|"console" }
    (socket as any).ctx = payload;
    next();
  } catch (e) {
    next(new Error("auth failed"));
  }
}

// Namespace factory
function makeNamespace(name: string) {
  const nsp = io.of(name);
  nsp.use(authMiddleware);
  nsp.on("connection", (socket) => {
    const { gameId, role } = (socket as any).ctx ?? {};
    if (!gameId) {
      socket.disconnect(true);
      return;
    }
    const room = `game:${gameId}`;
    socket.join(room);
    socket.emit("state:update", { connected: true, ns: name, role, room });

    socket.on("disconnect", () => {
      // optional logging
    });
  });
  return nsp;
}

// Create namespaces
makeNamespace("/player");
makeNamespace("/screen");
makeNamespace("/console");

// --- Redis subscriber: API publishes → hub broadcasts ---
// Expected message JSON: { room: "game:42", event: "draw:next", data: {...} }
const brokerSub = new Redis(REDIS_URL);
brokerSub.subscribe(EVENT_CHANNEL, (err) => {
  if (err) app.log.error({ err }, "Failed to subscribe to broker channel");
  else app.log.info({ EVENT_CHANNEL }, "Subscribed to broker channel");
});

brokerSub.on("message", (_channel, message) => {
  try {
    const { room, event, data } = JSON.parse(message);
    io.to(room).emit(event, data);
  } catch (e) {
    app.log.error({ e, message }, "Invalid broker payload");
  }
});

// Start server
httpServer.listen(PORT, "0.0.0.0", () => {
  app.log.info(`Realtime listening on :${PORT}`);
});
