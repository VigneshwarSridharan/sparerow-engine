# syntax=docker/dockerfile:1

# -----------------------------------------------------------------------------
# Dependencies (native modules: bcrypt, better-sqlite3)
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 build-essential \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# -----------------------------------------------------------------------------
# Development: full install + source (Compose bind-mount overrides /app at runtime)
# -----------------------------------------------------------------------------
FROM deps AS development
COPY . .
EXPOSE 1337
CMD ["npm", "run", "develop"]

# -----------------------------------------------------------------------------
# Production: build admin + server, drop devDependencies
# -----------------------------------------------------------------------------
FROM deps AS builder
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=builder --chown=node:node /app /app
USER node
EXPOSE 1337
CMD ["npm", "run", "start"]
