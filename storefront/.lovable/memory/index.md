# Project Memory

## Core
Mobile spare parts e-commerce SPA. Nova Violet theme (dark near-black bg, violet primary 262 83% 66%, magenta-violet accent 280 70% 60%). React + Tailwind + shadcn/ui.
595 products from Excel: 3 brands (Apple/Samsung/Xiaomi), 35 models, 17 part types.
All prices in INR (₹). Cart/wishlist in localStorage. SPA-style with drawer/modal interactions.
2026-07-16: redesigned from the prior "Warm Commerce" theme (light, indigo primary, amber accent) to Nova Violet at the customer's explicit request, matching a reference screenshot (dark bg, violet/gradient CTAs, glowing card borders). This supersedes the earlier "fuchsia theme rejected" note below — that was a different unsolicited direction the user called "flashy and cheap"; this one is customer-directed. Do not treat this as a revert.
Earlier note (superseded): fuchsia theme rejected — user called it "flashy and cheap".

## Memories
- [Theme tokens](mem://design/theme) — Nova Violet: violet primary, near-black bg, magenta-violet accent
- [Data structure](mem://features/data) — Brand→Model→Product hierarchy, seed data from Excel
- [E-commerce flow](mem://features/ecommerce) — Cart drawer, checkout dialog, wishlist, coupon codes
