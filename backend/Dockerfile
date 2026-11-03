# =============================================================================
# MediFlow AI — Backend Production Dockerfile
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY database ./database
RUN npm ci

# Generate Prisma Client
RUN cd database && npx prisma generate --schema=schema.prisma

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy built dependencies and app source
COPY --from=builder /app/node_modules ./node_modules
COPY backend ./backend
COPY database ./database

# Expose backend port
EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:5001/api/health || exit 1

# Start server
CMD ["node", "backend/src/server.js"]

