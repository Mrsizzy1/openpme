# syntax=docker/dockerfile:1.7
# Production image for the Smart PME Finance API (compiled code, no ts-node).
# Build context = repository root:  docker build -f apps/api/Dockerfile .

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-bookworm-slim AS base
# Prisma engines need OpenSSL.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---- 1. Build: every dependency, Prisma client, shared package, then the API ----
FROM base AS build
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate --schema prisma/schema.prisma
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN npm run build:shared && npm run build:api

# ---- 2. Production dependencies only (no TypeScript, no Vite, no Prisma CLI) ----
FROM base AS prod-deps
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev --ignore-scripts \
  && mkdir -p apps/api/node_modules packages/shared/node_modules

# ---- 3. Runtime ----
FROM base AS runtime
ENV NODE_ENV=production
# Prisma CLI (same version as the lockfile) to apply migrations at startup.
COPY package-lock.json ./
RUN npm install -g "prisma@$(node -p "require('./package-lock.json').packages['node_modules/prisma'].version")" \
  && npm cache clean --force
COPY package.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=prod-deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY prisma ./prisma

USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3001) + '/api/v1/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["sh", "-c", "prisma migrate deploy --schema prisma/schema.prisma && exec node apps/api/dist/main.js"]
