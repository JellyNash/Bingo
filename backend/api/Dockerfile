# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Enable pnpm
RUN corepack enable

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/api/package.json backend/api/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter=@bingo/api...

# Copy source code
COPY backend/api/ backend/api/
COPY tsconfig.json ./

# Build the application
WORKDIR /app/backend/api
RUN pnpm add -D typescript && pnpm build

# Runtime stage
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup -S nodegrp && adduser -S nodeusr -G nodegrp

# Enable pnpm
RUN corepack enable

# Copy package files
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/backend/api/package.json ./backend/api/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --filter=@bingo/api... --prod

# Copy built application
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