# syntax=docker/dockerfile:1.7
# Production image for the Smart PME Finance web app: Vite build served by nginx,
# which also proxies /api/ to the API container (same origin, so the refresh cookie works).
# Build context = repository root:  docker build -f apps/web/Dockerfile .

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /app
# The web build does not need a generated Prisma client.
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm --workspace=apps/web run build

FROM nginxinc/nginx-unprivileged:1.28-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/web/nginx-security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
