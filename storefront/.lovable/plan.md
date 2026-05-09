

# Mobile Spare Parts E-Commerce Web App

## Overview
A modern, SPA-style e-commerce platform for mobile spare parts with drawer/modal-based interactions, real product data from the uploaded spreadsheet, and a fuchsia-inspired customizable theme.

## Theme & Design System
- **Fuchsia-inspired** primary palette using CSS variables for full customizability
- Primary: Fuchsia/Magenta, Secondary: Slate, Accent: Amber
- All colors as HSL CSS variables for easy global theme switching
- Premium, clean, mobile-first design with smooth animations

## Data Architecture
Seed data from the uploaded Excel (595 products, 3 brands, 35 models) embedded as structured JSON:
- **Brands** → Apple, Samsung, Xiaomi (expandable)
- **Models** → 35 models with model numbers
- **Products** → Each with name, part type, price, discount, brand, model
- **Variants** → Color/quality variants grouped by base product

## Pages & Sections

### 1. Homepage
- Hero banner with search bar
- Shop by Brand (logo cards)
- Featured/Best Selling products carousel
- New Arrivals grid
- Popular Categories
- Why Choose Us + Trust badges
- Testimonials
- Footer with links

### 2. Product Catalog (SPA-style)
- **Brand selection** → shows brand cards/logos
- **Model selection** → filtered model grid with search
- **Parts listing** → instant filter by part type, price, stock
- Desktop: sticky sidebar filters | Mobile: slide-out filter drawer
- Sort by price, newest, best selling
- Live search across all products

### 3. Product Quick View (Drawer/Modal)
- Opens as a side drawer — no page navigation
- Image gallery, product details, variant selector (quality/color)
- Price with discount badge, stock status
- Add to Cart / Buy Now buttons
- Compatibility notes, description, related products

### 4. Cart Drawer
- Slide-out side panel
- Line items with quantity controls
- Coupon code input
- Subtotal, shipping estimate, total
- Proceed to Checkout button

### 5. Checkout (Modal/Page)
- Customer details form
- Shipping address
- Order summary
- Payment method selection (UI only)
- Place Order button

### 6. Order Success Modal
- Confirmation with order number
- Order summary recap

### 7. User Account Section
- Login / Signup forms
- My Profile, My Orders, Saved Addresses
- Wishlist

## Key Features
- **Live search** across brands, models, parts, SKUs
- **Instant filters** — brand, model, part type, price range, stock status
- **Product variants** — quality/color selectors with different prices
- **Wishlist** with localStorage persistence
- **Recently viewed** products tracking
- **Cart** with full CRUD, persisted in localStorage
- **Coupon/discount code** support in cart
- **Stock badges** — In Stock, Low Stock, Out of Stock
- **Responsive** — mobile-first with touch-friendly interactions
- **Loading skeletons** for all data sections
- **Empty states** for search, cart, wishlist

## Reusable Components
Header, SearchBar, BrandCard, ModelCard, ProductCard, VariantSelector, PriceBadge, StockBadge, ProductQuickView (drawer), CartDrawer, FilterDrawer, CheckoutForm, OfferBanner, Footer, LoadingSkeletons, EmptyStates

## State Management
- React Context for Cart, Wishlist, Auth, and Product browsing state
- All e-commerce state (cart, wishlist, recently viewed) persisted in localStorage
- Clean data layer ready for future Supabase/API integration

