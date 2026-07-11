#!/bin/sh
set -e

# Get domain from environment or use localhost
DOMAIN=${LETSENCRYPT_DOMAIN:-"localhost"}

echo "================================================"
echo "Nginx Reverse Proxy"
echo "Domain: $DOMAIN"
echo "================================================"

# Replace DOMAIN placeholder in nginx config with actual domain
sed -i "s|DOMAIN|$DOMAIN|g" /etc/nginx/conf.d/default.conf

# If using localhost, comment out SSL configuration
if [ "$DOMAIN" = "localhost" ]; then
  echo "⚠ Using localhost - SSL certificates will not be verified"
  # Replace ssl directives with comments to allow nginx to start without certificates
  sed -i 's|ssl_certificate|# ssl_certificate|g' /etc/nginx/conf.d/default.conf
  sed -i 's|ssl_certificate_key|# ssl_certificate_key|g' /etc/nginx/conf.d/default.conf
fi

# Validate nginx configuration
if ! nginx -t 2>&1 | grep -q "successful"; then
  echo "✗ Nginx configuration validation failed!"
  nginx -t
  exit 1
fi

echo "✓ Nginx configuration validated successfully"

# Certificate renewal happens in the sibling certbot container, which has no
# way to reload this container's nginx process directly. Periodically reload
# here instead so renewed certificates (written to the shared volume) actually
# get picked up. A reload is cheap and doesn't drop existing connections.
if [ "$DOMAIN" != "localhost" ]; then
  ( while true; do sleep 43200; nginx -s reload 2>/dev/null || true; done ) &
fi

echo "Starting nginx..."

# Execute the original CMD (nginx)
exec "$@"
