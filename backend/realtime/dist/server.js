import Fastify from "fastify";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
const PORT = Number(process.env.PORT ?? 4000);
const JWT_SECRET = process.env.JWT_SECRET ?? "dev_only_replace_me";
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const EVENT_CHANNEL = process.env.EVENT_CHANNEL ?? "bingo:events";
const app = Fastify({ logger: true });
await app.register(helmet);
await app.register(jwt, { secret: JWT_SECRET });
app.get("/health", async () => ({ ok: true, service: "realtime" }));
// Important: attach Socket.IO to Fastify's native server
const io = new Server(app.server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
});
// Redis adapter for horizontal scale
const pub = new Redis(REDIS_URL);
const sub = new Redis(REDIS_URL);
io.adapter(createAdapter(pub, sub));
// JWT auth for sockets
async function authMiddleware(socket, next) {
    try {
        const token = socket.handshake.auth?.token ?? socket.handshake.query?.token;
        if (!token)
            return next(new Error("no token"));
        const payload = await app.jwt.verify(token);
        socket.ctx = payload; // { gameId, playerId?, role? }
        next();
    }
    catch {
        next(new Error("auth failed"));
    }
}
const NAMESPACES = ["/player", "/screen", "/console"];
// Build namespaces; join room per game
function makeNamespace(name) {
    const nsp = io.of(name);
    nsp.use(authMiddleware);
    nsp.on("connection", (socket) => {
        const { gameId, role } = socket.ctx ?? {};
        if (!gameId)
            return socket.disconnect(true);
        const room = `game:${gameId}`;
        socket.join(room);
        socket.emit("state:update", { connected: true, ns: name, role, room });
    });
    return nsp;
}
NAMESPACES.forEach(makeNamespace);
// Redis broker subscription → broadcast to ALL namespaces
const brokerSub = new Redis(REDIS_URL);
brokerSub.subscribe(EVENT_CHANNEL, (err) => {
    if (err)
        app.log.error({ err }, "Failed to subscribe to broker channel");
    else
        app.log.info({ EVENT_CHANNEL }, "Subscribed to broker channel");
});
brokerSub.on("message", (_channel, message) => {
    try {
        const { room, event, data } = JSON.parse(message);
        let delivered = 0;
        for (const ns of NAMESPACES) {
            const sockets = io.of(ns).to(room);
            sockets.emit(event, data);
            delivered++;
        }
        app.log.info({ event, room, delivered }, "broker→socket broadcast");
    }
    catch (e) {
        app.log.error({ e, message }, "Invalid broker payload");
    }
});
// Start Fastify (and thereby the Socket.IO server)
await app.listen({ port: PORT, host: "0.0.0.0" });
app.log.info(`Realtime listening on :${PORT}`);
