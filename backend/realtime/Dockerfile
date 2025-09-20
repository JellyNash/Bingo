# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Enable pnpm
RUN corepack enable

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/realtime/package.json backend/realtime/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter=@bingo/realtime...

# Copy source code
COPY backend/realtime/ backend/realtime/
COPY tsconfig.json ./

# Build the application
WORKDIR /app/backend/realtime
RUN pnpm build

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
COPY --from=build /app/backend/realtime/package.json ./backend/realtime/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --filter=@bingo/realtime... --prod

# Copy built application
COPY --from=build /app/backend/realtime/dist ./backend/realtime/dist

# Switch to non-root user
USER nodeusr

EXPOSE 4000

# Health check
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s \
  CMD wget -qO- http://localhost:4000/health || exit 1

WORKDIR /app/backend/realtime

CMD ["node", "dist/server.js"]