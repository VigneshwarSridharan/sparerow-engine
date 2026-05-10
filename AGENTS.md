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

One Compose file at the repo root (`docker-compose.yml`) runs **Strapi** and the **storefront** together.

- **Setup:** copy `docker-compose.env.example` to `.env` in the repo root (enables the `dev` profile by default). Copy `spare-parts-backend/.env.docker.example` to `spare-parts-backend/.env` and replace placeholder secrets. Then `docker compose up --build`.
- **Development (`dev` profile):** Strapi on **1337**, Vite storefront on **8080** (`STOREFRONT_PORT`). Source is bind-mounted; `node_modules` use named volumes. Admin: http://localhost:1337/admin — storefront: http://localhost:8080
- **`VITE_STOREFRONT_GRAPHQL_ENDPOINT`:** must be a URL the **browser** can reach (default `http://localhost:1337/graphql`). For the `production` profile it is a **build-arg** baked into the static storefront bundle.
- **Postgres in dev:** `docker compose --profile dev --profile with-postgres up --build` and set `DATABASE_CLIENT=postgres` plus `DATABASE_URL=postgresql://strapi:strapi@postgres:5432/strapi_spare` in `spare-parts-backend/.env` (see comments in `.env.docker.example`).
- **Production-style stack:** `docker compose --profile production up --build -d` — `postgres_prod`, production Strapi, nginx storefront on host `${STOREFRONT_PORT:-8080}` → container port 80.

Images: `spare-parts-backend/Dockerfile` and `storefront/Dockerfile` (`development` and `production` targets). Poll-based file watching is enabled for dev services.

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
