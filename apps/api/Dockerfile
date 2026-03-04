FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies only
FROM base AS deps
COPY apps/api/package.json apps/api/package-lock.json* ./
RUN npm ci --omit=dev

# Build stage
FROM base AS builder
COPY apps/api/package.json apps/api/package-lock.json* ./
RUN npm ci
COPY apps/api/ .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Minimal env for build
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV NEXTAUTH_SECRET="build-placeholder"
ENV NEXTAUTH_URL="http://localhost:9091"
RUN npm run build

# Production stage
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 9091
ENV PORT=9091
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:9091/api/trpc || exit 1

CMD ["node", "server.js"]
