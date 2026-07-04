#!/bin/bash
set -e

DOMAIN=${LETSENCRYPT_DOMAIN:-"localhost"}
EMAIL=${LETSENCRYPT_EMAIL:-"admin@example.com"}
CERTBOT_MODE=${CERTBOT_MODE:-"standalone"}

echo "=========================================="
echo "Certbot SSL Certificate Manager"
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo "Mode: $CERTBOT_MODE"
echo "=========================================="

# Check if certificate already exists
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  echo "✓ Certificate found for $DOMAIN, skipping certificate generation"
  echo "Starting automatic renewal check..."

  # Run renewal in daemon mode (checks certificates every 12 hours)
  certbot renew \
    --webroot \
    --webroot-path=/var/www/certbot \
    --quiet \
    --deploy-hook="/bin/sh -c 'nginx -s reload 2>/dev/null || true'"

  # Keep the container running - watch for certificate renewal
  echo "Certbot renewal service running..."
  while true; do
    sleep 86400  # Check every 24 hours
    certbot renew \
      --webroot \
      --webroot-path=/var/www/certbot \
      --quiet \
      --deploy-hook="/bin/sh -c 'nginx -s reload 2>/dev/null || true'" || true
  done
else
  echo "✗ No existing certificate found, generating new certificate..."

  # Generate new certificate using webroot plugin
  certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --domain "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    --quiet

  if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "✓ Certificate successfully generated for $DOMAIN"
  else
    echo "✗ Certificate generation failed!"
    exit 1
  fi

  # Start renewal daemon
  echo "Starting automatic renewal service..."
  while true; do
    sleep 86400  # Check every 24 hours
    certbot renew \
      --webroot \
      --webroot-path=/var/www/certbot \
      --quiet \
      --deploy-hook="/bin/sh -c 'nginx -s reload 2>/dev/null || true'" || true
  done
fi
