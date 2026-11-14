# =============================================================================
# MediFlow AI — Backend Production Dockerfile
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package definitions and database schema
COPY backend/package*.json ./backend/
COPY database ./database

# Install backend dependencies
WORKDIR /app/backend
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate --schema=../database/schema.prisma

FROM node:20-alpine AS runner

WORKDIR /app/backend
ENV NODE_ENV=production

# Copy built dependencies and app source
COPY --from=builder /app/backend/node_modules ./node_modules
COPY backend ./
COPY database ../database

# Expose backend port (Cloud providers dynamically pass PORT)
EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:${PORT:-5001}/api/health || exit 1

# Start Express & Socket.IO server
CMD ["node", "src/server.js"]
