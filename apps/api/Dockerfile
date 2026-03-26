# TripLedger API - Cloud Run Optimized Dockerfile
# Multi-stage build for minimal production image
# Build context should be the monorepo root directory

# =====================
# Stage 1: Builder
# =====================
FROM node:20-alpine AS builder
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache openssl

# Copy root package files for workspace resolution
COPY package.json package-lock.json ./

# Copy the api package.json
COPY apps/api/package.json ./apps/api/

# Copy prisma schema (needed for generate)
COPY apps/api/prisma ./apps/api/prisma/

# Install all dependencies using npm workspaces
RUN npm ci --workspace=apps/api --include-workspace-root

# Copy api source code
COPY apps/api ./apps/api/

# Generate Prisma client
WORKDIR /app/apps/api
RUN npx prisma generate

# Build the application
RUN npm run build

# =====================
# Stage 2: Production
# =====================
FROM node:20-alpine AS runner
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache openssl dumb-init

ENV NODE_ENV=production
ENV PORT=8080

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy root package files
COPY --from=builder /app/package.json /app/package-lock.json ./

# Copy api package.json
COPY --from=builder /app/apps/api/package.json ./apps/api/

# Install production dependencies only
RUN npm ci --workspace=apps/api --include-workspace-root --omit=dev

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/public ./apps/api/public

# Copy generated Prisma client from node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Switch to non-root user
USER nestjs

# Cloud Run uses PORT environment variable (default 8080)
EXPOSE 8080

# Set working directory to api
WORKDIR /app/apps/api

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the server (migrations should be run separately or via Cloud Run jobs)
CMD ["node", "dist/main.js"]
