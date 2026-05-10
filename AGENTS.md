# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Sparerow Engine is a headless e-commerce backend for spare parts built on **Strapi v5** (TypeScript). The codebase lives in `spare-parts-backend/`.

### Running the application

```bash
cd spare-parts-backend
npm run build      # Compiles TS + builds Strapi admin panel (~20s)
npm run develop    # Starts dev server with hot-reload on port 1337
```

- The build step is required before the first `develop` run (compiles admin panel).
- After the initial build, `npm run develop` handles TS recompilation automatically.
- Admin panel: http://localhost:1337/admin

### Docker (optional)

From the repository root:

- **Development (SQLite + Vite storefront):** copy `spare-parts-backend/.env.docker.example` to `spare-parts-backend/.env`, replace placeholder secrets, then run `docker compose up --build`. Starts Strapi on port **1337** and the storefront dev server on **8080** (`STOREFRONT_PORT`). Source for both apps is bind-mounted with named volumes for `node_modules`. Strapi admin: http://localhost:1337/admin — storefront: http://localhost:8080
- **`VITE_STOREFRONT_GRAPHQL_ENDPOINT`:** must be a URL the **browser** can reach (default `http://localhost:1337/graphql` when Compose publishes Strapi on localhost). Set at compose time for dev; for `docker-compose.prod.yml` it is a **build-arg** baked into the static bundle.
- **Development with Postgres:** `docker compose -f docker-compose.yml -f docker-compose.postgres.yml up --build`
- **Production-style stack:** `docker compose -f docker-compose.prod.yml up --build` — nginx serves the storefront on `${STOREFRONT_PORT:-8080}` → container port 80.

Images: `spare-parts-backend/Dockerfile` and `storefront/Dockerfile` each expose `development` and `production` targets. Poll-based file watching is enabled for Strapi and the storefront in Compose where relevant.

### Database

- Dev uses **SQLite** (`DATABASE_CLIENT=sqlite` in `.env`). No external DB needed.
- The `.env` file must exist before running the app. Copy from `.env.example` and generate random secrets for all `change-me` values.
- SQLite data lives at `spare-parts-backend/.tmp/data.db` (auto-created on first boot).

### Tests and linting

```bash
cd spare-parts-backend
npm run test       # Vitest unit tests (validators + order state transitions)
```

- No lint script is currently defined in `package.json`; TypeScript compilation (`npm run build`) serves as the type-check gate.
- Tests are pure unit tests and require no running server or database.

### Key API routes (all prefixed with `/api/`)

- Storefront (public): `/storefront/catalog/brands`, `/storefront/auth/register`, `/storefront/checkout/orders`
- Payments (internal): `/payments/razorpay/order` (requires `x-internal-api-key` header)
- Admin: `/admin/orders/ops-summary` (requires internal key + Strapi admin Bearer)
- Webhooks: `/webhooks/shipping-events`

See `docs/API-EXAMPLES.http` for full request examples.

### Environment variables

All secrets are configured via `spare-parts-backend/.env`. Critical ones:
- `APP_KEYS`, `ADMIN_JWT_SECRET`, `JWT_SECRET`, `CUSTOMER_JWT_SECRET` — auth signing
- `STRAPI_INTERNAL_API_KEY` — BFF/admin route protection
- `SHIPPING_PRIMARY_CARRIER=MOCK` — uses built-in mock carrier (no external service needed)
- Razorpay and shipping carrier keys are optional for local dev.

### Gotchas

- Strapi requires `npm run build` before the first `npm run develop`; without it the admin panel won't load.
- If you change content-type schemas in `src/api/*/content-types/`, you must restart the dev server (it does not hot-reload schema changes).
- The seed script (`npm run seed`) calls `npm run build` internally before seeding sample data.
