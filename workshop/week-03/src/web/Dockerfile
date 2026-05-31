# syntax=docker/dockerfile:1.7
#
# Multi-stage Dockerfile for the React/Vite frontend.
#
# Security / best-practice highlights:
#   - Pinned, slim Node image only in the builder; runtime is the
#     `nginx-unprivileged` Alpine image which runs as uid 101 by default.
#   - `npm ci` installs from the committed lockfile only (no surprise
#     upgrades, faster, deterministic).
#   - Runtime image contains only the static `dist/` bundle and a hardened
#     nginx config (no source, no node_modules, no build tools).
#   - SPA fallback to /index.html so client-side routing works.
#   - Server tokens disabled, sensible security headers attached.
#   - HEALTHCHECK against the served index.
#
# Required runtime env (passed to nginx via envsubst at startup by the
# upstream `nginx-unprivileged` entrypoint):
#   - API_UPSTREAM   e.g. "http://api:8000"  — where /api/* requests are
#                    proxied. Defaults to http://api:8000 (matches the
#                    docker-compose service name).

# -----------------------------------------------------------------------------
# Stage 1: builder — produce the production bundle
# -----------------------------------------------------------------------------
ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-alpine AS builder

ENV NODE_ENV=production \
    npm_config_audit=false \
    npm_config_fund=false

WORKDIR /app

# Cache deps independently of source. Use the lockfile and never resolve
# ranges at build time.
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Copy the rest of the source and build. Tests/coverage are excluded via
# .dockerignore and tsconfig.app.json's `exclude`, so `tsc -b` stays fast.
COPY . .
RUN npm run build \
 && rm -rf node_modules

# -----------------------------------------------------------------------------
# Stage 2: runtime — nginx-unprivileged serves the static bundle
# -----------------------------------------------------------------------------
# nginx-unprivileged runs as uid 101 (nginx) by default, listens on
# 8080 (not 80), and writes its temp/log files to /tmp. Perfect for
# Kubernetes / Container Apps where running as root is forbidden.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

# Tell the orchestrator what we expose.
EXPOSE 8080

# Default upstream — overridable at run time.
ENV API_UPSTREAM=http://api:8000

# Switch to root briefly to write into /etc/nginx and /usr/share/nginx,
# then drop back to the unprivileged user.
USER root

# nginx-unprivileged ships an entrypoint that runs `envsubst` over every
# *.template file in /etc/nginx/templates and writes the result to
# /etc/nginx/conf.d. We use that to inject API_UPSTREAM dynamically.
COPY --chown=nginx:nginx nginx/default.conf.template /etc/nginx/templates/default.conf.template

# Replace the bundled main config so we can disable server_tokens globally
# and keep everything else minimal.
COPY --chown=nginx:nginx nginx/nginx.conf /etc/nginx/nginx.conf

# Drop the default html and replace with our built bundle.
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Liveness probe — wget is part of busybox in Alpine, no extra package
# needed.
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/ || exit 1

# Image runs as the unprivileged `nginx` user (uid 101) provided by
# the base image. Be explicit so this stays correct if the base image
# ever changes its default.
USER 101
