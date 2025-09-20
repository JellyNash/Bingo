import Fastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

const app = Fastify({ logger: true });

await app.register(swagger, {
  openapi: { openapi: "3.1.0", info: { title: "Bingo API", version: "1.0.0" } },
});
await app.register(swaggerUI, { routePrefix: "/docs" });

app.get("/health", async () => ({ ok: true }));

const port = Number(process.env.PORT ?? 3000);
app.listen({ port, host: "0.0.0.0" }).catch((e) => {
  app.log.error(e);
  process.exit(1);
});
