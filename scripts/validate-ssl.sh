#!/bin/bash
set -e

# SSL Certificate Validation Script
# Checks if SSL certificate is properly configured and renewed

DOMAIN=${1:-"localhost"}
TIMEOUT=10

echo "========================================"
echo "SSL Certificate Validation"
echo "Domain: $DOMAIN"
echo "========================================"
echo ""

# Check if domain is localhost
if [ "$DOMAIN" = "localhost" ]; then
  echo "⚠ Using localhost - SSL certificate validation skipped"
  echo "For production testing, use your actual domain"
  exit 0
fi

# Function to check HTTPS connectivity
check_https() {
  echo "1. Testing HTTPS connectivity..."
  if curl -I --max-time $TIMEOUT "https://$DOMAIN/" 2>/dev/null | grep -q "200\|301"; then
    echo "   ✓ HTTPS connection successful"
    return 0
  else
    echo "   ✗ HTTPS connection failed"
    return 1
  fi
}

# Function to check HTTP redirect
check_http_redirect() {
  echo "2. Testing HTTP → HTTPS redirect..."
  REDIRECT=$(curl -I --max-time $TIMEOUT "http://$DOMAIN/" 2>/dev/null | grep -i "location" || true)
  if echo "$REDIRECT" | grep -q "https://"; then
    echo "   ✓ HTTP redirects to HTTPS"
    echo "   Location: $REDIRECT"
    return 0
  else
    echo "   ✗ HTTP does not redirect to HTTPS"
    return 1
  fi
}

# Function to check certificate validity
check_cert_validity() {
  echo "3. Checking certificate validity..."
  CERT_INFO=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -text 2>/dev/null)

  if [ -z "$CERT_INFO" ]; then
    echo "   ✗ Could not retrieve certificate"
    return 1
  fi

  ISSUER=$(echo "$CERT_INFO" | grep -i "issuer:" | head -1)
  EXPIRY=$(echo "$CERT_INFO" | grep -i "not after" || true)

  echo "   ✓ Certificate found"
  echo "   Issuer: $ISSUER"
  echo "   Expiry: $EXPIRY"

  # Check if Let's Encrypt issued
  if echo "$ISSUER" | grep -q "Let's Encrypt"; then
    echo "   ✓ Certificate is from Let's Encrypt"
    return 0
  else
    echo "   ⚠ Certificate is not from Let's Encrypt"
    return 0
  fi
}

# Function to check certificate expiration
check_cert_expiration() {
  echo "4. Checking certificate expiration date..."
  EXPIRY_DATE=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null || echo "notAfter=unknown")
  EXPIRY_EPOCH=$(date -d "${EXPIRY_DATE#*=}" +%s 2>/dev/null || echo 0)
  NOW_EPOCH=$(date +%s)
  DAYS_UNTIL=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))

  echo "   Certificate expires in: $DAYS_UNTIL days"

  if [ "$DAYS_UNTIL" -lt 7 ]; then
    echo "   ✗ Certificate expiring soon - renewal may have failed"
    return 1
  elif [ "$DAYS_UNTIL" -lt 30 ]; then
    echo "   ⚠ Certificate expiring within 30 days"
    return 0
  else
    echo "   ✓ Certificate is valid for $DAYS_UNTIL days"
    return 0
  fi
}

# Function to test GraphQL endpoint
check_graphql() {
  echo "5. Testing GraphQL endpoint..."
  RESPONSE=$(curl -s -X POST "https://$DOMAIN/graphql" \
    -H "Content-Type: application/json" \
    -d '{"query": "{ __typename }"}' 2>/dev/null || echo "{}")

  if echo "$RESPONSE" | grep -q "data\|errors"; then
    echo "   ✓ GraphQL endpoint responding"
    echo "   Response: $RESPONSE" | head -c 100
    echo ""
    return 0
  else
    echo "   ✗ GraphQL endpoint not responding"
    return 1
  fi
}

# Function to test storefront
check_storefront() {
  echo "6. Testing Storefront..."
  if curl -s --max-time $TIMEOUT "https://$DOMAIN/" 2>/dev/null | grep -q "React\|<!DOCTYPE\|<html"; then
    echo "   ✓ Storefront loading"
    return 0
  else
    echo "   ✗ Storefront not loading"
    return 1
  fi
}

# Run all checks
SUCCESS=0
FAILED=0

check_https && ((SUCCESS++)) || ((FAILED++))
check_http_redirect && ((SUCCESS++)) || ((FAILED++))
check_cert_validity && ((SUCCESS++)) || ((FAILED++))
check_cert_expiration && ((SUCCESS++)) || ((FAILED++))
check_graphql && ((SUCCESS++)) || ((FAILED++))
check_storefront && ((SUCCESS++)) || ((FAILED++))

echo ""
echo "========================================"
echo "Validation Results: $SUCCESS passed, $FAILED failed"
echo "========================================"

if [ $FAILED -eq 0 ]; then
  echo "✓ All SSL checks passed!"
  exit 0
else
  echo "✗ Some checks failed - see details above"
  exit 1
fi
