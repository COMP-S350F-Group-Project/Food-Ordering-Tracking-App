# syntax=docker/dockerfile:1.7

# Multi-stage build for Food Ordering & Tracking demo

ARG NODE_VERSION=20.12.2

FROM node:${NODE_VERSION}-slim AS base
WORKDIR /app
ENV NPM_CONFIG_AUDIT=false NPM_CONFIG_FUND=false

# --- deps: backend ---
FROM base AS deps-backend
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci

# --- deps: frontend ---
FROM base AS deps-frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# --- build ---
FROM base AS build
WORKDIR /app
COPY --from=deps-backend /app/node_modules ./node_modules
COPY --from=deps-frontend /app/frontend/node_modules ./frontend/node_modules

# Copy sources
COPY package.json package-lock.json tsconfig.json ./
COPY src ./src
COPY frontend ./frontend

# Build frontend and backend
RUN npm --prefix frontend run build \
 && npm run build

# --- runner ---
FROM node:${NODE_VERSION}-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    FRONTEND_DIST=/app/frontend-dist

# Install runtime deps only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Copy app assets
COPY --from=build /app/dist ./dist
COPY --from=build /app/frontend/dist ${FRONTEND_DIST}

# Create non-root user (use node) and fix ownership
RUN chown -R node:node /app
USER node

EXPOSE 3000

# Simple healthcheck using Node's http client
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get({host:'127.0.0.1',port:process.env.PORT||3000,path:'/healthz'},r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))" || exit 1

CMD ["node", "dist/server.js"]
