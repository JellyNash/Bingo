import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import YAML from "yaml";

export default fp(async (app) => {
  const specPath =
    process.env.OPENAPI_SPEC_PATH ??
    resolve(process.cwd(), "../../contracts/openapi/bingo.yaml");
  const openapi = YAML.parse(readFileSync(specPath, "utf8"));

  await app.register(swagger, { openapi });
  await app.register(swaggerUI, { routePrefix: "/docs" });
});