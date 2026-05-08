# Runbook — spare-parts Strapi backend

## Local setup

1. Install Node 20+ and Postgres 14+ (or use `DATABASE_CLIENT=sqlite` for quick trials).
2. Copy `spare-parts-backend/.env.example` to `.env` and set:
   - `APP_KEYS` (comma-separated), `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY`
   - `DATABASE_URL` for Postgres, or `DATABASE_CLIENT=sqlite` to use the bundled SQLite file under `.tmp/`
   - `STRAPI_INTERNAL_API_KEY` (long random string for BFF/admin routes)
   - `CUSTOMER_JWT_SECRET` (storefront JWT signing secret)
   - Razorpay and shipping variables as needed (see `.env.example`)
3. From `spare-parts-backend/`: `npm install`, `npm run build`, `npm run develop`
4. Optional: `npm run seed` for demo catalog/CMS (rebuilds first).
5. Open the Strapi admin, create the first admin user, then use that account’s access token for `/api/admin/*` routes together with `x-internal-api-key`.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run develop` | Dev server with reload |
| `npm run build` | Compile server + admin panel |
| `npm run start` | Production server (run after `build`) |
| `npm run test` | Vitest unit tests (validators + transition guards) |
| `npm run seed` | Sample data (`npm run build` then `node scripts/seed.cjs`) |

## Production hardening checklist

- [ ] Use Postgres with backups and connection pooling appropriate to load.
- [ ] Set strong unique values for all secrets in `.env`; never commit `.env`.
- [ ] Restrict CORS in `config/middlewares.ts` / server config to known storefront origins.
- [ ] Terminate TLS at your edge (load balancer / reverse proxy); forward `X-Forwarded-*` correctly.
- [ ] Keep `STRAPI_INTERNAL_API_KEY` only on trusted BFFs; rotate periodically.
- [ ] Configure Razorpay webhook URL in the Razorpay dashboard; use the same `RAZORPAY_WEBHOOK_SECRET`.
- [ ] Configure Shiprocket / carrier webhooks to call `/api/webhooks/shipping-events` with the configured secret header.
- [ ] Set `SHIPPING_ENABLE_LIVE=true` only when credentials are valid and you intend real bookings.
- [ ] Run `npm run build` in CI; deploy the `dist` output and `node_modules` or use your platform’s build pipeline.
- [ ] Monitor logs; avoid logging raw payment payloads or tokens (the codebase redacts common patterns in `sanitizeForLog` where used).
- [ ] Review Strapi admin RBAC so only trusted staff have admin access.

## Postgres indexes

On bootstrap, the app attempts to create unique indexes (ignored if they already exist):

- `(brand_id, slug)` on `part_models`
- `(provider, event_id)` on `webhook_deliveries`

If your deployment user cannot `CREATE INDEX`, create them manually once.
