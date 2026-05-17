# Feature Backlog

Missing and incomplete functionalities identified during codebase audit (May 2026).
Each item includes implementation notes for both backend (Strapi) and storefront (Vite/React).

---

## CRITICAL — Blocking for Production

---

### 1. Tax Engine (GST) — [x]

**Why missing:** `taxInMinor` is hardcoded to `0n` in `spare-parts-backend/src/api/commerce/services/storefront-checkout.ts`. Legal requirement in India.

**Backend:**
- Add a `tax-rule` content type: `stateCode`, `categorySlug`, `ratePercent`, `isActive`
- Replace the hardcoded `0n` in `storefront-checkout.ts` with a lookup against tax rules using the shipping state + product category
- Add `taxBreakdown` array to order schema (per line item GST split)
- Expose tax rate in `storefrontCatalogBootstrap` GraphQL query so the storefront can show pre-checkout estimates

**Storefront:**
- Show tax line (CGST + SGST or IGST) in cart drawer and checkout summary
- Display inclusive/exclusive tax label on product price

---

### 2. Email Notifications — [ ]

**Why missing:** No email service is wired. No order confirmation, shipment update, or delivery emails exist anywhere in the codebase.

**Backend:**
- Choose a provider: Resend, SendGrid, or Nodemailer (SMTP)
- Add `src/lib/mailer.ts` — thin wrapper around the provider SDK
- Add `src/lib/email-templates/` — HTML templates for:
  - `order-confirmation.html`
  - `order-shipped.html`
  - `order-delivered.html`
  - `password-reset.html`
- Trigger `order-confirmation` email at the end of `storefront-checkout.ts` → `createOrder()`
- Trigger `order-shipped` / `order-delivered` in `admin-shipment.ts` on status change
- Add env vars: `EMAIL_PROVIDER`, `EMAIL_FROM`, `RESEND_API_KEY` (or SMTP vars)

**Storefront:**
- Show "Confirmation email sent to X" on order success page

---

### 3. Password Reset — [ ]

**Why missing:** No forgot-password route, no reset token storage, no UI exists.

**Backend:**
- Add `passwordResetToken` and `passwordResetExpiresAt` fields to `customer-account` schema
- Add two new service methods in `storefront-auth.ts`:
  - `requestPasswordReset(email)` — generates token, stores hash, triggers email
  - `resetPassword(token, newPassword)` — verifies token expiry, updates password hash
- Add two new GraphQL mutations: `storefrontRequestPasswordReset`, `storefrontResetPassword`
- Add route entries in `01-storefront.ts`

**Storefront:**
- Add `/forgot-password` page with email input form
- Add `/reset-password?token=...` page with new password form
- Add "Forgot password?" link on `LoginPage`

---

### 4. Returns & Refunds (RMA) — [ ]

**Why missing:** Footer states "7-day return policy" but there is no schema, no service, and no UI. No `return` or `refund` content type exists.

**Backend:**
- New content type `return-request`: `order` (relation), `customerAccount` (relation), `lineItems` (JSON snapshot), `reason` (enum: DEFECTIVE, WRONG_ITEM, NOT_AS_DESCRIBED, OTHER), `status` (enum: REQUESTED, APPROVED, REJECTED, RECEIVED, REFUNDED), `refundAmountInMinor`, `notes`, `createdAt`
- New service `storefront-returns.ts`: `createReturnRequest()`, `getReturnRequests(customerId)`
- New GraphQL mutations: `storefrontCreateReturnRequest`
- New GraphQL query: `storefrontReturnRequests`
- Admin service method to approve/reject and trigger refund via Razorpay Refund API

**Storefront:**
- Add "Request Return" button on delivered orders in `AccountOrderDetailPage`
- Add `/account/returns` page listing all return requests with status
- Return reason selector + item selection UI

---

### 5. Product Reviews & Ratings — [ ]

**Why missing:** `uiRating` and `uiReviewCount` on GraphQL Product type are synthetically computed (hashed from SKU in `src/index.ts`). No real review data exists anywhere.

**Backend:**
- New content type `product-review`: `product` (relation), `customerAccount` (relation, nullable for guests), `rating` (int 1–5), `title`, `body`, `verifiedPurchase` (bool), `isApproved` (bool), `createdAt`
- New service `storefront-reviews.ts`: `createReview()`, `getProductReviews(productDocumentId, page)`
- New GraphQL mutations: `storefrontCreateReview`
- New GraphQL queries: `storefrontProductReviews(sku, page)`
- Replace the hash-based `uiRating` / `uiReviewCount` computation in `src/index.ts` with real DB aggregates
- Admin moderation: approve/reject reviews via Strapi admin panel

**Storefront:**
- Add reviews section to `ProductDetailsPage` (star breakdown, individual review cards)
- Add "Write a Review" form (visible to customers with verified purchase)
- Show average rating + count on `ProductCard`

---

### 6. Product Variants — [ ]

**Why missing:** Product schema has a single `priceInMinor`, single `primaryImage`, single `quantityOnHand`. No variant concept exists.

**Backend:**
- New content type `product-variant`: `product` (relation), `sku`, `attributes` (JSON: `{color, size, capacity}`), `priceInMinor`, `quantityOnHand`, `quantityReserved`, `image` (media)
- Migrate existing product inventory fields to default variant or keep as standalone product
- Update `storefront-catalog.ts` to populate variants on product detail query
- Update `storefront-checkout.ts` to reserve inventory at variant level
- Update GraphQL Product type in `src/index.ts` to include `variants[]`

**Storefront:**
- Add variant selector UI on `ProductDetailsPage` (color swatches, size buttons)
- Update add-to-cart to pass `variantSku`
- Show variant-specific price and stock availability

---

### 7. Product Image Gallery — [ ]

**Why missing:** Only `primaryImage` (single media field) on product schema. `images[]` in the storefront GraphQL type is always empty.

**Backend:**
- Add `images` (media, multiple) field to product content type schema
- Update `storefront-catalog.ts` product serializer to include `images[]` URLs
- Update GraphQL Product type in `src/index.ts` to return `images: [String!]!`

**Storefront:**
- Replace single image on `ProductDetailsPage` with an image carousel
- Add thumbnail strip below main image
- Add image zoom / lightbox on click

---

## HIGH PRIORITY

---

### 8. Wishlist Backend Persistence — [ ]

**Why missing:** `WishlistContext` uses `localStorage` only. Not synced to the customer account. Lost on new device/browser.

**Backend:**
- New content type `wishlist-item`: `customerAccount` (relation), `product` (relation), `addedAt`
- New service methods in `storefront-account.ts`: `getWishlist()`, `addToWishlist(productDocumentId)`, `removeFromWishlist(productDocumentId)`
- New GraphQL mutations: `storefrontAddToWishlist`, `storefrontRemoveFromWishlist`
- New GraphQL query: `storefrontWishlist`

**Storefront:**
- On login, merge localStorage wishlist into the backend-persisted list
- Replace localStorage reads/writes in `WishlistContext` with GraphQL calls when authenticated

---

### 9. Server-side Pagination & Filtering — [ ]

**Why missing:** `storefrontCatalogBootstrap` loads ALL products in one request. Client-side filtering runs on that in-memory array. Will degrade severely past ~500 products.

**Backend:**
- Update `storefront-catalog.ts` `listProducts()` to accept `page`, `pageSize`, `brandSlug`, `modelSlug`, `categorySlug`, `minPrice`, `maxPrice`, `inStock`, `sortBy` parameters
- Return `{ items, total, page, pageSize }` envelope
- Update GraphQL `storefrontProducts` query signature to accept filter/pagination args

**Storefront:**
- Update `ProductListingPage` to use paginated query instead of in-memory filter
- Add pagination controls or infinite scroll
- Sync active filters to URL query params for shareable filter URLs

---

### 10. Full-Text Search API — [ ]

**Why missing:** Search bar filters `StorefrontDataContext.products` array client-side. No backend search endpoint.

**Backend:**
- Add a `/api/storefront/catalog/search?q=` REST endpoint (or GraphQL `storefrontSearch` query)
- Use Strapi's built-in `$containsi` filter across `name`, `sku`, `description` fields
- Return top N results with product type and URL slug
- Future: integrate Meilisearch or Typesense for full-text

**Storefront:**
- Wire the `SearchBar` component to the new API with debounce (300ms)
- Add an autocomplete dropdown showing product name + image thumbnails
- Add a `/search?q=` results page

---

### 11. Customer Profile Editing — [ ]

**Why missing:** No `storefrontUpdateProfile` mutation exists. No UI in the account section.

**Backend:**
- Add `updateProfile(customerId, { name, email, phone })` to `storefront-account.ts`
- Add `storefrontUpdateProfile` GraphQL mutation with email uniqueness validation
- Add `changePassword(customerId, currentPassword, newPassword)` service method
- Add `storefrontChangePassword` GraphQL mutation

**Storefront:**
- Add `/account/profile` page with editable name, email, phone fields
- Add password change section (current + new + confirm)
- Add link in account sidebar nav

---

### 12. Cash on Delivery (COD) — [ ]

**Why missing:** Only Razorpay payment path exists in checkout service. No COD flag on orders.

**Backend:**
- Add `paymentMethod` enum field to order schema: `RAZORPAY`, `COD`
- Update `storefront-checkout.ts` `createOrder()` to accept `paymentMethod`
- For COD: skip Razorpay flow, set order status to `PENDING_FULFILLMENT` directly
- Add COD availability check (configurable by postal code or order total threshold)
- Add env var: `COD_ENABLED=true`, `COD_MAX_ORDER_AMOUNT_IN_MINOR`

**Storefront:**
- Add payment method selector in checkout (Razorpay card / COD toggle)
- Skip Razorpay modal when COD is selected
- Show "Pay on delivery" badge on order confirmation and order detail pages

---

### 13. Guest Order Tracking — [ ]

**Why missing:** No public order lookup. Guests who checked out cannot find their order without creating an account.

**Backend:**
- Add `storefrontGuestOrder(orderId, email)` GraphQL query — returns order if email matches `contactEmail` on the order
- No auth required; security is the email match

**Storefront:**
- Add a `/track-order` page with order ID + email input
- Redirect to order detail view on successful lookup
- Add "Track your order" link in the header and footer

---

### 14. Low Stock Indicators & Alerts — [ ]

**Why missing:** `quantityOnHand` and `quantityReserved` are tracked but never surfaced in the UI or used for admin alerts.

**Backend:**
- Compute `availableQty = quantityOnHand - quantityReserved` in product serializer
- Add `LOW_STOCK_THRESHOLD` env var (default: 5)
- Add a scheduled task or lifecycle hook to email admin when stock drops below threshold

**Storefront:**
- Show "Only N left" badge on `ProductCard` and `ProductDetailsPage` when `availableQty <= 5`
- Disable "Add to Cart" and show "Out of Stock" when `availableQty <= 0`
- Add stock status filter to product listing ("In Stock only" toggle)

---

### 15. Product Specifications / Attributes — [ ]

**Why missing:** Product schema has only `name`, `description`, `primaryImage`, `priceInMinor`. No structured specs.

**Backend:**
- New content type `product-attribute`: `product` (relation), `name` (e.g. "Compatibility"), `value` (e.g. "Honda Activa 5G, 6G"), `sortOrder`
- Update product serializer in `storefront-catalog.ts` to populate `attributes[]`
- Update GraphQL Product type in `src/index.ts`

**Storefront:**
- Add "Specifications" tab/section on `ProductDetailsPage`
- Show compatibility info prominently (key selling point for spare parts)

---

## MEDIUM PRIORITY

---

### 16. Enhanced Promo Codes — [ ]

**Why missing:** Only percentage-based discount codes with min subtotal + max discount cap. No flat amount, no category-scoped, no multi-use limits.

**Backend:**
- Add fields to `promo-code` schema: `discountType` (PERCENT / FLAT_AMOUNT), `flatDiscountInMinor`, `applicableCategories` (relation, nullable), `usageLimit` (int, nullable), `usageCount` (int), `perCustomerLimit` (int, nullable)
- Update `storefront-promo.ts` to handle flat discount calculation
- Add usage count increment on successful order creation
- Add per-customer usage tracking via a `promo-code-usage` junction table

**Storefront:**
- Show applicable categories restriction in coupon UI if set
- Show remaining uses if limit is set

---

### 17. Shipping Zones & Estimated Delivery — [ ]

**Why missing:** Checkout has flat ₹99 or free shipping hardcoded. No configurable zones.

**Backend:**
- New content type `shipping-zone`: `name`, `states[]` (JSON array of state codes), `carrierId`, `baseRateInMinor`, `freeAboveInMinor`, `estimatedDaysMin`, `estimatedDaysMax`
- Update `storefront-checkout.ts` to look up zone by shipping state instead of flat rate
- Add `estimatedDeliveryDate` to order creation response

**Storefront:**
- Show estimated delivery date on checkout summary and order confirmation
- Show delivery estimate on product detail page (if postal code is entered)

---

### 18. Contact Form — [ ]

**Why missing:** Footer links to a "Contact Us" page that does not exist.

**Backend:**
- New content type `contact-message`: `name`, `email`, `phone`, `subject`, `message`, `isRead`, `createdAt`
- New public REST route: `POST /api/storefront/contact`
- Trigger email notification to admin on new submission

**Storefront:**
- Add `/contact` page with form (name, email, subject, message)
- Add success state ("We'll get back to you within 24 hours")
- Fix footer "Contact Us" link

---

### 19. Public Order Tracking Page — [ ]

**Why missing:** Order tracking is behind `/account/orders` login wall. No public tracking URL.

**Backend:** *(covered in item 13 — Guest Order Tracking)*

**Storefront:**
- Reuse order detail components on the public `/track-order` page
- Show timeline: Order Placed → Payment Confirmed → Shipped → Delivered
- Show carrier tracking number with deep-link to carrier site

---

### 20. Social Login (Google OAuth) — [ ]

**Why missing:** Only email/phone + password auth is implemented.

**Backend:**
- Use `@strapi/plugin-users-permissions` OAuth or implement custom Google OAuth in `storefront-auth.ts`
- Add `googleId` field to `customer-account` schema
- Add `storefrontGoogleLogin(idToken)` GraphQL mutation — verifies Google ID token, creates or links account

**Storefront:**
- Add "Continue with Google" button on `LoginPage` and `RegisterPage`
- Use Google Identity Services (`@react-oauth/google`)

---

### 21. Newsletter Subscription — [ ]

**Why missing:** No subscription UI or backend feature.

**Backend:**
- New content type `newsletter-subscriber`: `email`, `subscribedAt`, `isActive`
- New public route: `POST /api/storefront/newsletter/subscribe`
- Integrate with email provider (Resend/Mailchimp) on subscription

**Storefront:**
- Add email input + subscribe button in Footer
- Show success/already-subscribed states

---

### 22. Category Hierarchy & Landing Pages — [ ]

**Why missing:** `part-category` has no parent relation. No dedicated category browsing page.

**Backend:**
- Add `parent` self-relation to `part-category` schema
- Update catalog service to return nested category tree
- Update `storefrontCatalogBootstrap` to include `categoryTree`

**Storefront:**
- Add `/categories/:slug` page with category hero, description, and filtered product grid
- Add category breadcrumbs on product listing and detail pages
- Add category navigation in header dropdown

---

### 23. Product Comparison — [ ]

**Why missing:** No compare feature exists.

**Backend:** No new backend needed — comparison is UI-only using existing product data.

**Storefront:**
- Add "Compare" checkbox on `ProductCard`
- Add a floating compare bar (shows selected items, max 4)
- Add `/compare` page with side-by-side spec table
- Store comparison selection in URL params

---

## ADMIN PANEL

---

### 24. Sales & Inventory Dashboard — [ ]

**Why missing:** `src/admin/extensions/` exists but is a placeholder with no real widgets.

**Backend:**
- Add admin-only GraphQL or REST endpoints for:
  - Revenue by day/week/month
  - Top-selling products
  - Low-stock products list
  - Orders by status count
  - New customers count

**Admin (Strapi extension):**
- Build custom React dashboard widgets in `src/admin/extensions/`
- Revenue chart (recharts or similar)
- Order status kanban summary
- Low-stock alert table

---

### 25. Bulk Product Import/Export — [ ]

**Why missing:** No import/export tooling exists.

**Backend:**
- Add admin route: `POST /api/admin/products/import` — accepts CSV, validates and bulk-upserts products
- Add admin route: `GET /api/admin/products/export` — returns CSV of all products
- Use `papaparse` for CSV parsing

**Admin:**
- Add import/export buttons to product list view in Strapi admin

---

## SEO & PERFORMANCE

---

### 26. Product Page SEO — [ ]

**Why missing:** `ProductDetailsPage` has no `<meta>` tags. Social sharing shows blank previews.

**Storefront:**
- Add `react-helmet-async` (or Vite's native `<head>` management)
- Set `<title>`, `<meta name="description">`, `<meta property="og:*">` per product using `name`, `description`, `primaryImage`
- Add schema.org `Product` JSON-LD structured data block
- Add canonical `<link>` tag on product pages

---

### 27. Sitemap Generation — [ ]

**Why missing:** No sitemap endpoint or static generation.

**Backend:**
- Add a public route `GET /sitemap.xml`
- Dynamically generate XML with all active product, brand, and category URLs
- Include `<lastmod>` from `updatedAt`

---

### 28. Image Optimization — [ ]

**Why missing:** Raw Strapi media URLs are served without resizing or compression.

**Backend:**
- Enable Strapi's built-in image optimization (sharp) in `config/plugins.ts`
- Configure responsive breakpoints: thumbnail (100px), small (300px), medium (750px)
- Use `?format=webp` query parameter support if using a CDN

**Storefront:**
- Use thumbnail URL on `ProductCard`, full URL on `ProductDetailsPage`

---

## COMPLIANCE & SECURITY

---

### 29. API Rate Limiting — [ ]

**Why missing:** No rate limiting on any route. Auth endpoints are brute-force exploitable.

**Backend:**
- Add `koa-ratelimit` or similar middleware in `config/middlewares.ts`
- Apply stricter limits (5 req/min) to `storefront-auth` routes (login, register, password reset)
- Apply standard limits (100 req/min) to catalog routes

---

### 30. GDPR / Data Privacy — [ ]

**Why missing:** Privacy policy is a static CMS page but no data deletion or export tooling exists.

**Backend:**
- Add `storefrontDeleteAccount` GraphQL mutation — anonymises customer PII (name, email, phone → `DELETED_USER_<id>`)
- Add data export endpoint: `GET /api/storefront/account/export` — returns JSON of all customer data

**Storefront:**
- Add "Delete my account" option in account settings (with confirmation dialog)
- Add "Download my data" link in account settings

---

## TESTING

---

### 31. Checkout E2E Tests — [ ]

**Why missing:** Playwright is installed (`@playwright/test`) but no test files exist for the checkout flow.

**Storefront:**
- Add `tests/e2e/checkout.spec.ts`:
  - Add product to cart
  - Fill shipping address
  - Apply promo code
  - Complete Razorpay test payment
  - Verify order confirmation page
- Add `tests/e2e/auth.spec.ts`: register, login, logout

---

### 32. Payment Integration Tests — [ ]

**Why missing:** Only 3 unit test files exist; no Razorpay webhook integration test.

**Backend:**
- Add `tests/unit/webhook-razorpay.test.ts` — test signature verification with valid and tampered payloads
- Add `tests/integration/checkout.test.ts` — test full order creation flow with a test DB

---

*Last updated: May 2026 | Audit source: full codebase review*
