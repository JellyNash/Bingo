# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Enable pnpm
RUN corepack enable

# Copy workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/api/package.json backend/api/
COPY backend/orchestrator/package.json backend/orchestrator/

# Install workspace dependencies (api + orchestrator)
RUN pnpm install --no-frozen-lockfile

# Copy sources
COPY backend/api/ backend/api/
COPY backend/orchestrator/ backend/orchestrator/
COPY tsconfig.json ./

# Build orchestrator then API
RUN pnpm --filter @bingo/orchestrator build && pnpm --filter bingo-api build

# Runtime stage
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup -S nodegrp && adduser -S nodeusr -G nodegrp

# Enable pnpm
RUN corepack enable

########################
# Install production deps
########################

# Copy workspace manifests
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/backend/api/package.json ./backend/api/
COPY --from=build /app/backend/orchestrator/package.json ./backend/orchestrator/

# Install only prod dependencies for needed packages
RUN pnpm install --no-frozen-lockfile --prod

# Copy built artifacts
COPY --from=build /app/backend/orchestrator/dist ./backend/orchestrator/dist
COPY --from=build /app/backend/api/dist ./backend/api/dist

# Copy any additional files if needed (like prisma schemas if using prisma)
# COPY --from=build /app/backend/api/prisma ./backend/api/prisma

# Switch to non-root user
USER nodeusr

EXPOSE 3000

# Health check
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s \
  CMD wget -qO- http://localhost:3000/healthz || exit 1

WORKDIR /app/backend/api

CMD ["node", "dist/server.js"]
