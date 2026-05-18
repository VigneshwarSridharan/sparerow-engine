# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Sparerow Engine is a headless e-commerce platform for spare parts. It consists of:
- **`spare-parts-backend/`** — Strapi v5 backend (Node 22, TypeScript) on port 1337
- **`storefront/`** — Vite + React 18 storefront (TypeScript) on port 4000

PostgreSQL is the production database. SQLite is the default for local dev (no container needed).

---

## Development Commands

### Backend (`spare-parts-backend/`)

```bash
yarn dev          # Hot-reload dev server (port 1337)
yarn build        # TypeScript + admin panel build — required before first `develop`
yarn start        # Production server
yarn test         # Vitest unit tests (no running server needed)
yarn test:watch   # Watch mode
yarn seed         # Seed product/catalog data
yarn seed:legal   # Seed legal/static CMS content
```

> **Important:** Run `yarn build` once before the first `yarn dev`. Schema changes (content-type fields) do not hot-reload — restart the dev server after schema edits.

### Storefront (`storefront/`)

```bash
yarn dev          # Vite dev server (port 4000)
yarn build        # Production build
yarn lint         # ESLint
yarn test         # Vitest unit tests
```

### Docker (full stack)

```bash
# Dev (SQLite, no Postgres)
cp docker-compose.env.example .env
cp spare-parts-backend/.env.docker.example spare-parts-backend/.env
docker compose --profile dev up --build

# Dev with Postgres
docker compose --profile dev --profile with-postgres up --build

# Production
docker compose --profile production up --build -d
```

---

## Architecture

### How the Two Apps Connect

The storefront talks to Strapi exclusively via **GraphQL** (`/graphql`). There is no Apollo Client — a simple `fetch`-based function at `storefront/src/lib/graphql/client.ts` sends all queries and mutations. The endpoint is configured via `VITE_STOREFRONT_GRAPHQL_ENDPOINT` (defaults to `http://localhost:1337/graphql`).

Strapi also exposes a **REST API** used by internal services and webhooks — the storefront does not use REST.

### Backend Custom Code Layout

All business logic lives in a single Strapi "commerce" API module at `spare-parts-backend/src/api/commerce/`:

| Subdirectory | Contents |
|---|---|
| `services/` | 10 service files — catalog, auth, account, checkout, promo codes, Razorpay payments, webhooks, admin ops, shipment sync |
| `controllers/` | 4 controllers — storefront, payment, webhook, admin |
| `routes/` | 4 numbered route files — storefront (01), payment (02), webhooks (03), admin (04) |

The GraphQL schema extension (custom types + resolvers) is registered in `spare-parts-backend/src/index.ts` (~900 lines). All Strapi-native shadow CRUD is disabled for GraphQL; every query/mutation is hand-wired here.

### Route Protection

Routes use Koa-style policies in `spare-parts-backend/src/policies/`:
- `global::storefront-customer` — Bearer JWT, extracts `ctx.state.customerId`
- `global::internal-api-key` — `x-internal-api-key` header (timing-safe compare)
- `global::admin-session` — Strapi admin session (admin routes require both `internal-api-key` + `admin-session`)
- Webhook routes are unauthenticated at the route level; signature verification happens in the controller.

### Storefront State & Data Flow

Global state lives in React Context providers (all wrapping `App.tsx`):
- `StorefrontDataContext` — Bootstrap data (products, brands, models, promo codes) fetched once on mount via `storefrontCatalogBootstrap` GraphQL query
- `CustomerAuthContext` — JWT token management (localStorage), exposes `customerId`
- `CartContext`, `WishlistContext`, `RecentlyViewedContext` — localStorage-persisted

Data fetching uses **TanStack React Query** for server-synced data; contexts handle client-only persistence.

### Pricing & Amounts

All monetary values are stored and passed as **integers in the minor unit** (paise/cents). Field names end in `InMinor` (e.g. `priceInMinor`, `totalInMinor`). Convert to display currency only in the UI layer.

### Order State Machine

Order status transitions are enforced by `spare-parts-backend/src/lib/transitions.ts`. Do not mutate order status directly in services — go through the transitions helper.

### Error Handling

Backend errors use `AppError` from `spare-parts-backend/src/lib/errors.ts`. Controllers wrap service calls in a `handle()` function that serialises `AppError` to HTTP responses and lets unexpected errors bubble to Strapi's error middleware. GraphQL resolvers map these to GraphQL error extensions.

---

## Key Environment Variables

### Backend (`.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_CLIENT` | `sqlite` or `postgres` |
| `DATABASE_URL` | Postgres connection string (if using postgres) |
| `STRAPI_INTERNAL_API_KEY` | Guards payment and admin REST routes |
| `CUSTOMER_JWT_SECRET` | Signs customer session tokens |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay integration |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signature verification |
| `SHIPPING_PRIMARY_CARRIER` | `MOCK`, `SHIPROCKET`, or `DELHIVERY` |
| `SHIPPING_ENABLE_LIVE` | `true` to make real shipping API calls |

### Storefront (Vite)

| Variable | Purpose |
|---|---|
| `VITE_STOREFRONT_GRAPHQL_ENDPOINT` | GraphQL URL (must be browser-accessible); passed as build arg in Docker |

---

## Testing

Backend tests are pure unit tests — they test validators, state machine transitions, and Razorpay signature verification. No Strapi instance or database is required.

```bash
# Run a single test file
cd spare-parts-backend && yarn test tests/unit/validators.test.ts
cd storefront && yarn test src/test/example.test.ts
```

Storefront also has Playwright E2E tests (`@playwright/test`).

---

## Admin Panel Customization

Custom Strapi admin extensions live in `spare-parts-backend/src/admin/` (dashboard widget, assets). These are compiled into the admin panel during `yarn build`.

---

## Linear Integration

To communicate with Linear, use the GraphQL API directly via `curl`. **Do not use a Linear MCP server.**

```bash
curl \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: ${LINEAR_API_KEY}" \
  --data '{ "query": "{ issues { nodes { id title } } }" }' \
  https://api.linear.app/graphql
```

The `LINEAR_API_KEY` environment variable must be set with a valid Linear personal API key. All Linear operations (fetching issues, creating/updating issues, etc.) should go through this endpoint.
