# Multi-stage production Dockerfile for EcoShield Disaster Intelligence Platform
# Stage 1: Build static assets and worker bundle
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build Vite frontend (dist/client) and Server Worker (dist/server/index.js)
RUN npm run build

# Stage 2: Production runtime
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled bundles and server from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/worker ./worker
COPY --from=builder /app/src/regions.js ./src/regions.js
COPY --from=builder /app/server.js ./server.js

# Expose standard web port
EXPOSE 3000

# Container healthcheck using native node script
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/healthz').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Run as non-privileged user for security
USER node

# Start EcoShield production server
CMD ["node", "server.js"]
