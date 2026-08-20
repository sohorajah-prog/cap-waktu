# syntax=docker/dockerfile:1

# Alpine is safe here: better-sqlite3 ships a musl prebuild, so no build
# toolchain is needed to install it.
FROM node:24-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1

# ── Dependencies ───────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Build ──────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── Runtime ────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
# Written to at runtime, so it must be a mounted volume — see README.
ENV CAP_WAKTU_DATA_DIR=/app/data

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Read from disk at runtime rather than imported, so tracing never sees them.
COPY --from=builder /app/seed ./seed
COPY --from=builder /app/src/db/migrations ./src/db/migrations

# The database and the uploaded images live here. Declared so a container run
# without an explicit mount still keeps its data across restarts.
RUN mkdir -p /app/data && chown -R node:node /app/data
VOLUME ["/app/data"]

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
