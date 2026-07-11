#!/bin/bash
set -e

# LETSENCRYPT_DOMAIN accepts a comma-separated list (e.g. "example.com,www.example.com").
# The first entry names the certificate (matches nginx's ssl_certificate path).
DOMAIN_LIST=${LETSENCRYPT_DOMAIN:-"localhost"}
EMAIL=${LETSENCRYPT_EMAIL:-"admin@example.com"}
CERTBOT_MODE=${CERTBOT_MODE:-"standalone"}

DOMAIN=$(echo "$DOMAIN_LIST" | cut -d',' -f1 | xargs)

DOMAIN_ARGS=""
IFS=',' read -ra DOMAIN_ARR <<< "$DOMAIN_LIST"
for d in "${DOMAIN_ARR[@]}"; do
  DOMAIN_ARGS="$DOMAIN_ARGS --domain $(echo "$d" | xargs)"
done

echo "=========================================="
echo "Certbot SSL Certificate Manager"
echo "Domains: $DOMAIN_LIST"
echo "Email: $EMAIL"
echo "Mode: $CERTBOT_MODE"
echo "=========================================="

issue_certificate() {
  certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    $DOMAIN_ARGS \
    --expand \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    --quiet
}

run_renewal_loop() {
  echo "Certbot renewal service running..."
  while true; do
    sleep 86400  # Check every 24 hours
    certbot renew \
      --webroot \
      --webroot-path=/var/www/certbot \
      --quiet \
      --deploy-hook="/bin/sh -c 'nginx -s reload 2>/dev/null || true'" || true
  done
}

# Check whether the existing certificate already covers every requested domain
cert_covers_all_domains() {
  cert_file="/etc/letsencrypt/live/$DOMAIN/cert.pem"
  [ -f "$cert_file" ] || return 1
  sans=$(openssl x509 -in "$cert_file" -noout -ext subjectAltName 2>/dev/null || true)
  for d in "${DOMAIN_ARR[@]}"; do
    d_trimmed=$(echo "$d" | xargs)
    echo "$sans" | grep -q "DNS:$d_trimmed\b" || return 1
  done
  return 0
}

if [ -d "/etc/letsencrypt/live/$DOMAIN" ] && cert_covers_all_domains; then
  echo "✓ Certificate found for $DOMAIN and covers all requested domains, skipping generation"
  echo "Starting automatic renewal check..."
  certbot renew \
    --webroot \
    --webroot-path=/var/www/certbot \
    --quiet \
    --deploy-hook="/bin/sh -c 'nginx -s reload 2>/dev/null || true'"
  run_renewal_loop
else
  if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "✗ Existing certificate does not cover all requested domains, expanding..."
  else
    echo "✗ No existing certificate found, generating new certificate..."
  fi

  issue_certificate

  if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "✓ Certificate successfully issued for $DOMAIN_LIST"
  else
    echo "✗ Certificate generation failed!"
    exit 1
  fi

  echo "Starting automatic renewal service..."
  run_renewal_loop
fi
