#!/usr/bin/env sh
set -e
cd /app

if [ ! -d node_modules/@strapi/strapi ]; then
  echo "docker-entrypoint.dev: installing dependencies (empty node_modules volume or first run)..."
  npm ci
fi

exec "$@"
