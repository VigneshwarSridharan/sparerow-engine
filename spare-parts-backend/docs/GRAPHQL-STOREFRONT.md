# Storefront GraphQL API

The storefront should communicate with `spare-parts-backend` through `POST /graphql`.

## Authentication

- Customer auth uses the same JWT issued by `storefrontRegister` and `storefrontLogin`.
- Send `Authorization: Bearer <token>` for customer-only operations.
- Admin/internal REST APIs remain unchanged for backward compatibility.

## Queries

### `storefrontCatalogBootstrap(filter)`

Returns denormalized storefront data for:
- products
- categories
- brands
- models
- promo codes
- inventory + pricing fields

Use this for initial storefront hydration and client-side filtering.

### `storefrontProducts(filter)`
Filtered products with inventory and pricing fields.

### `storefrontProductBySku(sku)`
Single product lookup by SKU.

### `storefrontPromoCode(code)`
Promo code validation and metadata.

### Customer-scoped queries

- `storefrontSession`
- `storefrontMe`
- `storefrontAddresses`
- `storefrontOrders`
- `storefrontOrder(id)`

These require customer Bearer token (except anonymous `storefrontSession` fallback behavior).

## Mutations

- `storefrontRegister(input)`
- `storefrontLogin(input)`
- `storefrontLogout`
- `storefrontCreateAddress(input)`
- `storefrontUpdateAddress(id, input)`
- `storefrontDeleteAddress(id)`
- `storefrontCreateOrder(input)`

`storefrontCreateOrder` performs:
- payload validation
- stock availability checks
- reservation updates
- server-side promo validation/discount calculation
- order persistence

## Error handling

- Domain/application errors are surfaced as GraphQL errors with extensions:
  - `extensions.code` (stable machine code)
  - `extensions.http.status`
  - `extensions.details` (optional)
- Validation and authorization failures are normalized into this format.

## Backward compatibility

- Existing REST routes remain available.
- GraphQL is added as a parallel interface; no existing REST path contracts are removed.
