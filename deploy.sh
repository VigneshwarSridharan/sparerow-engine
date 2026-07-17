#!/usr/bin/env bash
#
# Deploys the production stack to the VPS.
#
# Builds strapi_prod + storefront_prod images locally (the VPS is a small
# 3-core box that reliably wedges its Docker daemon under a build load),
# ships them over SSH, recreates the containers, and health-checks the
# result. Run from the repo root on the machine you want to build on.
#
# Requires: SPAREROW_SSH_PASS env var, sshpass, docker, ssh, scp.
# Usage: ./deploy.sh

set -euo pipefail

VPS_HOST="root@51.254.16.210"
VPS_DIR="/root/sparerow-engine"
DOMAIN="https://sparerow.in"
STRAPI_IMAGE="spare-parts-engine-strapi_prod:latest"
STOREFRONT_IMAGE="spare-parts-engine-storefront_prod:latest"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

step() { printf '\n\033[1;34m==> %s\033[0m\n' "$1"; }
fail() { printf '\n\033[1;31mDEPLOY FAILED: %s\033[0m\n' "$1" >&2; exit 1; }

[ -n "${SPAREROW_SSH_PASS:-}" ] || fail "SPAREROW_SSH_PASS is not set"
command -v sshpass >/dev/null 2>&1 || fail "sshpass is required (brew install hudochenkov/sshpass/sshpass)"

ssh_vps() { sshpass -p "$SPAREROW_SSH_PASS" ssh -o StrictHostKeyChecking=no "$VPS_HOST" "$@"; }
scp_vps() { sshpass -p "$SPAREROW_SSH_PASS" scp -o StrictHostKeyChecking=no "$@"; }

step "Checking local branch is main and clean"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
[ "$BRANCH" = "main" ] || fail "not on main (currently on $BRANCH)"
[ -z "$(git status --porcelain)" ] || fail "working tree has uncommitted changes"

git fetch origin main --quiet
LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse origin/main)"
[ "$LOCAL_SHA" = "$REMOTE_SHA" ] || fail "local main ($LOCAL_SHA) differs from origin/main ($REMOTE_SHA) — push or pull first"

step "Building strapi_prod + storefront_prod images locally"
docker compose --profile production build strapi_prod storefront_prod

step "Saving images to $TMP_DIR"
docker save "$STRAPI_IMAGE" | gzip > "$TMP_DIR/strapi_prod.tar.gz"
docker save "$STOREFRONT_IMAGE" | gzip > "$TMP_DIR/storefront_prod.tar.gz"
ls -lh "$TMP_DIR"

step "Shipping images to VPS ($VPS_HOST)"
scp_vps "$TMP_DIR/strapi_prod.tar.gz" "$TMP_DIR/storefront_prod.tar.gz" "$VPS_HOST:/root/"

step "Loading images and recreating containers on VPS"
ssh_vps bash <<REMOTE
set -e
cd "$VPS_DIR"
git fetch origin main --quiet
git checkout main --quiet
git reset --hard origin/main --quiet
docker load < /root/strapi_prod.tar.gz
docker load < /root/storefront_prod.tar.gz
rm -f /root/strapi_prod.tar.gz /root/storefront_prod.tar.gz
docker compose --profile production up -d strapi_prod storefront_prod
REMOTE

step "Waiting for containers to settle"
sleep 8

step "Health-checking $DOMAIN"
HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$DOMAIN/" || echo 000)"
GQL_CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 -X POST "$DOMAIN/graphql" \
  -H 'Content-Type: application/json' \
  --data '{"query":"{ __typename }"}' || echo 000)"

if [ "$HTTP_CODE" = "200" ] && [ "$GQL_CODE" = "200" ]; then
  step "DEPLOY OK — storefront HTTP $HTTP_CODE, graphql HTTP $GQL_CODE"
else
  fail "health check failed — storefront HTTP $HTTP_CODE, graphql HTTP $GQL_CODE (containers may still be starting; check: ssh $VPS_HOST 'cd $VPS_DIR && docker compose ps')"
fi
