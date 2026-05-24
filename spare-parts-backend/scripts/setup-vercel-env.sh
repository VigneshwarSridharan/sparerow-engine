#!/usr/bin/env bash
# Run this from spare-parts-backend/ to populate Vercel env vars.
# Fill in YOUR_* placeholders before running.

set -e

cd "$(dirname "$0")/.."

ENV=production

add() {
  printf '%s' "$2" | vercel env add "$1" "$ENV" --force
  echo "  ✓ $1"
}

echo "→ Setting Strapi core secrets..."
add APP_KEYS         "UBDSBfhLFyGQ5NUoaG6D5A==,YoXmD1rBrZj4dgutzg6KMQ==,1OHzAXIsCeWKjjwjP9mwfA==,d6OTrlwTvH5N6vEyAyBfxA=="
add API_TOKEN_SALT   "1UuK9Lj/NRoVSgxrD17YDm5SGDy2MGvB8hzbb60wKtc="
add ADMIN_JWT_SECRET "VR2tKPo05HlEszSdLhStlBMXnTUWAua2hGi3yGOZq80="
add TRANSFER_TOKEN_SALT "GyhZr9im3g83rsYXW0xD6XgRkBHPZ+1BXiPEim7P5i0="
add JWT_SECRET       "j5FqJjxo8tEiuu+rLZkJhRmIMilxLoanEIsndIbQ7eg="
add ENCRYPTION_KEY   "w4KJM77f5/X9n+VLqW1ykTMeGaOJD1xOkjQMjHHuI2w="
add STRAPI_INTERNAL_API_KEY "+5q6QlndsZm27ngDlZtfC8cKB4v0f73XUDsjBRybSdaTscadyaSoP4FO1OEPoF7S"
add CUSTOMER_JWT_SECRET "pqERXtaT4751i2NUYvUPhV5rUoN9NDIcXWCLi0j2ipA="

echo "→ Setting server config..."
add HOST "0.0.0.0"
add PORT "1337"
add NODE_ENV "production"

echo "→ Setting database (Neon Postgres)..."
add DATABASE_CLIENT "postgres"
add DATABASE_URL    "postgresql://neondb_owner:npg_hfKb9ql1rIxO@ep-fancy-sound-aoy0te0d-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"   # ← replace this

echo "→ Setting Razorpay..."
add RAZORPAY_KEY_ID      "rzp_test_Si6WinmM8GYsgH"       # ← replace
add RAZORPAY_KEY_SECRET  "ly41fSH4Tu7zHe4d2FfztImz"   # ← replace
add RAZORPAY_WEBHOOK_SECRET "b6d3ac2ce4e97bfbc49d91ad4a56e46e314d881264a5112762fbab6e2c3b29eb" # ← replace

echo "→ Setting shipping (MOCK mode — safe default)..."
add SHIPPING_PRIMARY_CARRIER "SHIPROCKET"
add SHIPPING_ENABLE_LIVE     "true"
add SHIPROCKET_EMAIL "vigneshwarsridharan@gmail.com"
add SHIPROCKET_PASSWORD "c^syrCj%9M1E$!8%#eHluFmGQo7BkF#J"
add SHIPROCKET_PICKUP_LOCATION "Home"
add SHIPPING_DEFAULT_WEIGHT_GRAMS "500"
add SHIPPING_ORIGIN_NAME     "Warehouse"
add SHIPPING_ORIGIN_PHONE    "9876543210"
add SHIPPING_ORIGIN_LINE1    "Industrial Area Phase 1"
add SHIPPING_ORIGIN_CITY     "Bengaluru"
add SHIPPING_ORIGIN_POSTAL_CODE "560001"
add SHIPPING_ORIGIN_STATE    "KA"

echo "→ Setting email (Resend)..."
add EMAIL_FROM    "orders@sparehub.com"
add RESEND_API_KEY "re_Svp3AfD5_CdePZc9S3eL51TXb3Yrnioqx"   # ← replace

echo ""
echo "Done! Review values above then run: vercel --cwd . deploy --prod"
