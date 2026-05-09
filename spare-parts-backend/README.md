# Spare parts Strapi backend

Strapi **v5** headless backend for catalog, storefront checkout, Razorpay payments, shipping carriers (Mock / Shiprocket / Delhivery), admin operations, and CMS blocks.

## Quick start

```bash
cd spare-parts-backend
cp .env.example .env
# Edit .env: APP_KEYS, secrets, DATABASE_URL (Postgres) or DATABASE_CLIENT=sqlite
npm install
npm run build
npm run develop
```

Seed sample data (runs `build` first, then `scripts/seed.cjs`):

```bash
npm run seed
```

## Tests

```bash
npm run test
```

## Documentation

- [Runbook](docs/RUNBOOK.md) — local setup, env vars, production checklist
- [HTTP examples](docs/API-EXAMPLES.http) — example requests for key routes
- [Storefront GraphQL](docs/GRAPHQL-STOREFRONT.md) — schema, auth, and error model

## API overview

| Area | Base path | Auth |
|------|-----------|------|
| Storefront catalog & CMS | `/api/storefront/...` | Public reads |
| Customer auth | `/api/storefront/auth/...` | Public register/login |
| Account & orders | `/api/storefront/account/...`, `/api/storefront/orders/...` | Bearer customer JWT |
| Checkout | `POST /api/storefront/checkout/orders` | Optional Bearer JWT |
| Storefront GraphQL | `/graphql` | Public + customer Bearer JWT for protected operations |
| Payments (BFF) | `/api/payments/...` | `x-internal-api-key` |
| Webhooks | `/api/webhooks/...` | Signatures / shipper secret |
| Admin | `/api/admin/...` | `x-internal-api-key` + Strapi admin access token |
