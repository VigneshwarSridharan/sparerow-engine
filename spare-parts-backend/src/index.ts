import type { Core } from '@strapi/strapi';
import { GraphQLError } from 'graphql';
import * as Sentry from '@sentry/node';
import { AppError } from './lib/errors';
import { computeProductUiFlags } from './lib/product-ui-flags';
import {
  getCachedStorefrontCatalogMeta,
  setCachedStorefrontCatalogMeta,
} from './api/commerce/services/storefront-catalog-meta-cache';

function throwGraphQLError(error: unknown): never {
  if (error instanceof AppError) {
    throw new GraphQLError(error.message, {
      extensions: {
        code: error.code,
        http: { status: error.status },
        details: error.details,
      },
    });
  }
  Sentry.captureException(error);
  throw error;
}

function normalizeModelName(name: string): string {
  return name
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    if (process.env.SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: 0.1,
      });
    }

    const extensionService = strapi.plugin('graphql')?.service('extension');
    if (!extensionService) return;

    extensionService.use(() => ({
      typeDefs: `
        type StorefrontBrand {
          id: ID!
          documentId: String
          slug: String!
          name: String!
          isActive: Boolean!
          productCount: Int!
          logoUrl: String
        }

        type StorefrontModel {
          id: ID!
          documentId: String
          slug: String!
          name: String!
          isActive: Boolean!
          modelNumber: String!
          brandId: ID!
          brandSlug: String!
          productCount: Int!
        }

        type StorefrontCategory {
          id: ID!
          documentId: String
          slug: String!
          name: String!
          isActive: Boolean!
          productCount: Int!
        }

        type StorefrontProductVariant {
          id: ID!
          sku: String!
          attributes: String
          priceInMinor: String!
          quantityOnHand: Int!
          quantityReserved: Int!
          availableToSell: Int!
          imageUrl: String
          isActive: Boolean!
        }

        type StorefrontProduct {
          id: ID!
          documentId: String
          sku: String!
          name: String!
          description: String
          priceInMinor: String!
          quantityOnHand: Int!
          quantityReserved: Int!
          availableToSell: Int!
          isActive: Boolean!
          brandId: ID!
          brandSlug: String!
          brandName: String!
          modelId: ID!
          modelSlug: String!
          modelName: String!
          categoryId: ID
          categorySlug: String
          categoryName: String
          uiPrice: Int!
          uiDiscountPrice: Int!
          uiDiscountPercent: Int!
          uiRating: Float!
          uiReviewCount: Int!
          uiFeatured: Boolean!
          uiBestSeller: Boolean!
          uiNewArrival: Boolean!
          uiWarranty: String!
          primaryImageUrl: String
          imageUrls: [String!]!
          variants: [StorefrontProductVariant!]!
        }

        type StorefrontPromoCode {
          id: ID!
          code: String!
          description: String
          discountPercent: Int!
          minOrderSubtotalInMinor: String!
          maxDiscountInMinor: String
          startsAt: String
          endsAt: String
          isActive: Boolean!
        }

        type StorefrontCustomer {
          id: ID!
          email: String
          phone: String
        }

        type StorefrontSession {
          authenticated: Boolean!
          customer: StorefrontCustomer
        }

        input StorefrontCatalogFilterInput {
          brandSlug: String
          modelSlug: String
          categorySlug: String
          search: String
          inStockOnly: Boolean
          ids: [ID!]
          skus: [String!]
          limit: Int
          offset: Int
        }

        type StorefrontCatalogMeta {
          brands: [StorefrontBrand!]!
          categories: [StorefrontCategory!]!
          partTypes: [String!]!
          promoCodes: [StorefrontPromoCode!]!
          defaultTaxRatePercent: Int!
          originStateCode: String!
          maxPriceInMinor: String!
        }

        type StorefrontHomeFilters {
          brands: [StorefrontBrand!]!
          categories: [StorefrontCategory!]!
        }

        type StorefrontProductSections {
          featured: [StorefrontProduct!]!
          bestSellers: [StorefrontProduct!]!
          newArrivals: [StorefrontProduct!]!
        }

        type StorefrontAddress {
          id: ID!
          customerName: String!
          line1: String!
          line2: String
          city: String!
          state: String!
          postalCode: String!
          countryCode: String!
          phone: String!
        }

        input StorefrontAddressInput {
          customerName: String!
          line1: String!
          line2: String
          city: String!
          state: String!
          postalCode: String!
          countryCode: String
          phone: String!
        }

        input StorefrontAuthInput {
          email: String
          phone: String
          password: String!
        }

        type StorefrontAuthPayload {
          token: String!
          customer: StorefrontCustomer!
        }

        input StorefrontCheckoutLineInput {
          sku: String!
          quantity: Int!
          variantSku: String
        }

        input StorefrontGuestShippingInput {
          customerName: String!
          line1: String!
          line2: String
          city: String!
          state: String!
          postalCode: String!
          countryCode: String
          phone: String!
        }

        input StorefrontCreateOrderInput {
          lines: [StorefrontCheckoutLineInput!]!
          contactPhone: String!
          contactEmail: String
          promoCode: String
          shippingAddressId: ID
          guestShipping: StorefrontGuestShippingInput
        }

        type StorefrontOrderLine {
          id: ID!
          skuSnapshot: String!
          nameSnapshot: String!
          unitPriceInMinor: String!
          quantity: Int!
          lineTotalInMinor: String!
        }

        type StorefrontShipment {
          id: ID!
          carrier: String!
          status: String!
          trackingNumber: String
          carrierShipmentRef: String
          carrierStatusLabel: String
          lastSyncedAt: String
        }

        type StorefrontOrder {
          id: ID!
          createdAt: String
          status: String!
          currency: String!
          subtotalInMinor: String!
          taxInMinor: String!
          taxRatePercent: Int!
          shippingInMinor: String!
          totalInMinor: String!
          promoCode: String
          promoDiscountInMinor: String
          contactEmail: String!
          contactPhone: String!
          shippingRecipientName: String!
          shippingLine1: String!
          shippingLine2: String
          shippingCity: String!
          shippingState: String!
          shippingPostalCode: String!
          shippingCountryCode: String!
          shippingPhone: String!
          lineItems: [StorefrontOrderLine!]!
          shipments: [StorefrontShipment!]!
        }

        type StorefrontCreateOrderPayload {
          order: StorefrontOrder!
          paymentContinuationSecret: String!
        }

        type StorefrontRazorpayPreparedOrder {
          razorpayOrderId: String!
          amountInMinor: String!
          amount: Int!
          currency: String!
          keyId: String!
          strapiOrderId: ID!
        }

        input StorefrontVerifyRazorpayPaymentInput {
          orderId: ID!
          paymentContinuationSecret: String!
          razorpayOrderId: String!
          razorpayPaymentId: String!
          razorpaySignature: String!
        }

        type StorefrontMutationResult {
          ok: Boolean!
        }

        type StorefrontCmsPage {
          slug: String!
          title: String!
          body: String
        }

        type StorefrontFaq {
          id: ID!
          question: String!
          answer: String
          sortOrder: Int!
        }

        type StorefrontReview {
          id: ID!
          rating: Int!
          title: String!
          body: String
          verifiedPurchase: Boolean!
          createdAt: String
        }

        type StorefrontProductReviewsPayload {
          reviews: [StorefrontReview!]!
          total: Int!
          page: Int!
          pageSize: Int!
          pageCount: Int!
        }

        input StorefrontCreateReviewInput {
          sku: String!
          rating: Int!
          title: String!
          body: String
        }

        type StorefrontReturnLineItem {
          skuSnapshot: String!
          nameSnapshot: String!
          quantity: Int!
          unitPriceInMinor: String!
        }

        type StorefrontReturnRequest {
          id: ID!
          orderId: ID!
          reason: String!
          status: String!
          notes: String
          refundAmountInMinor: String
          lineItems: [StorefrontReturnLineItem!]!
          createdAt: String!
        }

        input StorefrontReturnLineItemInput {
          lineItemId: ID!
        }

        input StorefrontCreateReturnRequestInput {
          orderId: ID!
          reason: String!
          lineItems: [StorefrontReturnLineItemInput!]!
          notes: String
        }

        type Query {
          storefrontCatalogMeta: StorefrontCatalogMeta!
          storefrontHomeFilters: StorefrontHomeFilters!
          storefrontModelsByBrand(brandSlug: String!): [StorefrontModel!]!
          storefrontProductSections(limit: Int): StorefrontProductSections!
          storefrontProducts(filter: StorefrontCatalogFilterInput): [StorefrontProduct!]!
          storefrontProductBySku(sku: String!): StorefrontProduct
          storefrontPromoCode(code: String!): StorefrontPromoCode
          storefrontSession(token: String): StorefrontSession!
          storefrontMe(token: String): StorefrontCustomer
          storefrontAddresses(token: String!): [StorefrontAddress!]!
          storefrontOrders(token: String!): [StorefrontOrder!]!
          storefrontOrder(id: ID!, token: String!): StorefrontOrder
          storefrontReturnRequests(token: String!): [StorefrontReturnRequest!]!
          storefrontCmsPage(slug: String!): StorefrontCmsPage
          storefrontFaqs: [StorefrontFaq!]!
          storefrontProductReviews(sku: String!, page: Int): StorefrontProductReviewsPayload!
        }

        type Mutation {
          storefrontRegister(input: StorefrontAuthInput!): StorefrontAuthPayload!
          storefrontLogin(input: StorefrontAuthInput!): StorefrontAuthPayload!
          storefrontLogout: StorefrontMutationResult!
          storefrontCreateAddress(token: String!, input: StorefrontAddressInput!): StorefrontAddress!
          storefrontUpdateAddress(token: String!, id: ID!, input: StorefrontAddressInput!): StorefrontAddress!
          storefrontDeleteAddress(token: String!, id: ID!): StorefrontMutationResult!
          storefrontCreateOrder(token: String, input: StorefrontCreateOrderInput!): StorefrontCreateOrderPayload!
          storefrontPrepareRazorpayPayment(orderId: ID!, paymentContinuationSecret: String!): StorefrontRazorpayPreparedOrder!
          storefrontVerifyRazorpayPayment(input: StorefrontVerifyRazorpayPaymentInput!): StorefrontOrder!
          storefrontCreateReturnRequest(token: String!, input: StorefrontCreateReturnRequestInput!): StorefrontReturnRequest!
          storefrontRequestPasswordReset(email: String!): StorefrontMutationResult!
          storefrontResetPassword(token: String!, newPassword: String!): StorefrontMutationResult!
          storefrontCreateReview(token: String, input: StorefrontCreateReviewInput!): StorefrontReview!
        }
      `,
      resolvers: {
        Query: {
          storefrontCatalogMeta: async () => {
            try {
              const fromCache = getCachedStorefrontCatalogMeta();
              if (fromCache) return fromCache;

              const catalog = strapi.service('api::commerce.storefront-catalog') as {
                listBrands: () => Promise<Array<Record<string, unknown>>>;
                listCategories: () => Promise<Array<Record<string, unknown>>>;
                listCatalogCounts: () => Promise<{
                  brandCounts: Map<string, number>;
                  modelCounts: Map<string, number>;
                  categoryCounts: Map<string, number>;
                }>;
                getMaxPriceInMinor: () => Promise<number>;
              };
              const [brandsRaw, categoriesRaw, counts, promosRaw, maxPriceInMinor] = await Promise.all([
                catalog.listBrands(),
                catalog.listCategories(),
                catalog.listCatalogCounts(),
                strapi.db.query('api::promo-code.promo-code').findMany({ where: { isActive: true }, orderBy: { code: 'asc' } }),
                catalog.getMaxPriceInMinor(),
              ]);

              const brands = brandsRaw.map((brand) => ({
                ...brand,
                productCount: counts.brandCounts.get(String(brand.id)) || 0,
              }));
              const categories = categoriesRaw.map((category) => ({
                ...category,
                productCount: counts.categoryCounts.get(String(category.id)) || 0,
              }));
              const partTypes = categories
                .filter((category) => (category.productCount as number) > 0)
                .map((category) => String((category as Record<string, unknown>).name));

              const promoCodes = promosRaw.map((promo) => ({
                id: promo.id,
                code: String(promo.code || ''),
                description: String(promo.description || ''),
                discountPercent: Number(promo.discountPercent || 0),
                minOrderSubtotalInMinor: String(promo.minOrderSubtotalInMinor || '0'),
                maxDiscountInMinor:
                  promo.maxDiscountInMinor != null ? String(promo.maxDiscountInMinor) : null,
                startsAt: promo.startsAt ? String(promo.startsAt) : null,
                endsAt: promo.endsAt ? String(promo.endsAt) : null,
                isActive: Boolean(promo.isActive),
              }));

              const taxRulesRaw = await strapi.db.query('api::tax-rule.tax-rule').findMany({
                where: { isActive: true },
              });
              const globalTaxRule = taxRulesRaw.find(
                (r) => !r.categorySlug && !r.stateCode
              );
              const defaultTaxRatePercent = globalTaxRule ? Number(globalTaxRule.ratePercent) : 0;
              const originStateCode = String(strapi.config.get('shipping.origin.state') || '');

              const result = {
                brands,
                categories,
                partTypes,
                promoCodes,
                defaultTaxRatePercent,
                originStateCode,
                maxPriceInMinor: String(maxPriceInMinor),
              };
              setCachedStorefrontCatalogMeta(result);
              return result;
            } catch (error) {
              throwGraphQLError(error);
            }
          },
          storefrontHomeFilters: async () => {
            try {
              const catalog = strapi.service('api::commerce.storefront-catalog') as {
                listBrandsWithCounts: () => Promise<Array<Record<string, unknown>>>;
                listCategoriesWithCounts: () => Promise<Array<Record<string, unknown>>>;
              };
              const [brands, categories] = await Promise.all([
                catalog.listBrandsWithCounts(),
                catalog.listCategoriesWithCounts(),
              ]);
              return { brands, categories };
            } catch (error) {
              throwGraphQLError(error);
            }
          },
          storefrontModelsByBrand: async (_: unknown, args: { brandSlug: string }) => {
            try {
              const catalog = strapi.service('api::commerce.storefront-catalog') as {
                listModelsWithCounts: (brandSlug: string) => Promise<Array<Record<string, unknown>>>;
              };
              const models = await catalog.listModelsWithCounts(args.brandSlug);
              return models.map((model) => ({
                ...model,
                modelNumber: normalizeModelName(String(model.name || '')),
              }));
            } catch (error) {
              throwGraphQLError(error);
            }
          },
          storefrontProductSections: async (_: unknown, args: { limit?: number }) => {
            try {
              const catalog = strapi.service('api::commerce.storefront-catalog') as {
                listFeaturedProducts: (limit: number) => Promise<Array<Record<string, unknown>>>;
                listBestSellerProducts: (limit: number) => Promise<Array<Record<string, unknown>>>;
                listNewArrivalProducts: (limit: number) => Promise<Array<Record<string, unknown>>>;
              };
              const reviewService = strapi.service('api::commerce.storefront-reviews') as {
                getBulkAggregates: (ids: number[]) => Promise<Map<number, { averageRating: number; reviewCount: number }>>;
              };
              const limit = Math.min(Math.max(Number(args.limit) || 8, 1), 24);
              const [featuredRaw, bestSellersRaw, newArrivalsRaw] = await Promise.all([
                catalog.listFeaturedProducts(limit),
                catalog.listBestSellerProducts(limit),
                catalog.listNewArrivalProducts(limit),
              ]);
              const productIds = [...featuredRaw, ...bestSellersRaw, ...newArrivalsRaw]
                .map((p) => Number(p.id))
                .filter(Boolean);
              const reviewAggregates = await reviewService.getBulkAggregates(productIds);
              const serialize = (product: Record<string, unknown>) => {
                const sku = String(product.sku || '');
                const pid = Number(product.id);
                const agg = reviewAggregates.get(pid);
                const flags = computeProductUiFlags(sku, Number(product.availableToSell || 0), agg);
                const model = (product.partModel || {}) as Record<string, unknown>;
                const brand = (model.brand || {}) as Record<string, unknown>;
                const category = (product.partCategory || {}) as Record<string, unknown>;
                const priceInMinor = Number(product.priceInMinor || 0);
                return {
                  ...product,
                  brandId: brand.id,
                  brandSlug: brand.slug,
                  brandName: brand.name || '',
                  modelId: model.id,
                  modelSlug: model.slug,
                  modelName: model.name || '',
                  categoryId: category.id || null,
                  categorySlug: category.slug || null,
                  categoryName: category.name || null,
                  uiPrice: Math.round(priceInMinor / 100),
                  uiDiscountPrice: Math.round(priceInMinor / 100),
                  uiDiscountPercent: 0,
                  uiRating: flags.rating,
                  uiReviewCount: flags.reviewCount,
                  uiFeatured: flags.featured,
                  uiBestSeller: flags.bestSeller,
                  uiNewArrival: flags.newArrival,
                  uiWarranty: '90 Days',
                };
              };
              return {
                featured: featuredRaw.map(serialize),
                bestSellers: bestSellersRaw.map(serialize),
                newArrivals: newArrivalsRaw.map(serialize),
              };
            } catch (error) {
              throwGraphQLError(error);
            }
          },
          storefrontProducts: async (_: unknown, args: { filter?: Record<string, unknown> }) => {
            try {
              const catalog = strapi.service('api::commerce.storefront-catalog') as {
                listAllProducts: (filters?: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>;
              };
              const reviewService = strapi.service('api::commerce.storefront-reviews') as {
                getBulkAggregates: (ids: number[]) => Promise<Map<number, { averageRating: number; reviewCount: number }>>;
              };
              const catalogData = await catalog.listAllProducts(args.filter);
              const productIds = catalogData.map((p) => Number(p.id)).filter(Boolean);
              const reviewAggregates = await reviewService.getBulkAggregates(productIds);
              return catalogData.map((product) => {
                const sku = String(product.sku || '');
                const pid = Number(product.id);
                const agg = reviewAggregates.get(pid);
                const flags = computeProductUiFlags(sku, Number(product.availableToSell || 0), agg);
                const model = (product.partModel || {}) as Record<string, unknown>;
                const brand = (model.brand || {}) as Record<string, unknown>;
                const category = (product.partCategory || {}) as Record<string, unknown>;
                const priceInMinor = Number(product.priceInMinor || 0);
                return {
                  ...product,
                  brandId: brand.id,
                  brandSlug: brand.slug,
                  brandName: brand.name || '',
                  modelId: model.id,
                  modelSlug: model.slug,
                  modelName: model.name || '',
                  categoryId: category.id || null,
                  categorySlug: category.slug || null,
                  categoryName: category.name || null,
                  uiPrice: Math.round(priceInMinor / 100),
                  uiDiscountPrice: Math.round(priceInMinor / 100),
                  uiDiscountPercent: 0,
                  uiRating: flags.rating,
                  uiReviewCount: flags.reviewCount,
                  uiFeatured: flags.featured,
                  uiBestSeller: flags.bestSeller,
                  uiNewArrival: flags.newArrival,
                  uiWarranty: '90 Days',
                };
              });
            } catch (error) {
              throwGraphQLError(error);
            }
          },
          storefrontProductBySku: async (_: unknown, args: { sku: string }) => {
            try {
              const catalog = strapi.service('api::commerce.storefront-catalog') as {
                getProductBySku: (sku: string) => Promise<Record<string, unknown>>;
              };
              const reviewService = strapi.service('api::commerce.storefront-reviews') as {
                getProductAggregates: (productId: number) => Promise<{ averageRating: number; reviewCount: number }>;
              };
              const product = await catalog.getProductBySku(args.sku);
              const sku = String(product.sku || '');
              const pid = Number(product.id);
              const agg = await reviewService.getProductAggregates(pid);
              const flags = computeProductUiFlags(
                sku,
                Number(product.availableToSell || 0),
                agg.reviewCount > 0 ? agg : undefined
              );
              const model = (product.partModel || {}) as Record<string, unknown>;
              const brand = (model.brand || {}) as Record<string, unknown>;
              const category = (product.partCategory || {}) as Record<string, unknown>;
              const priceInMinor = Number(product.priceInMinor || 0);
              return {
                ...product,
                brandId: brand.id,
                brandSlug: brand.slug,
                brandName: brand.name || '',
                modelId: model.id,
                modelSlug: model.slug,
                modelName: model.name || '',
                categoryId: category.id || null,
                categorySlug: category.slug || null,
                categoryName: category.name || null,
                uiPrice: Math.round(priceInMinor / 100),
                uiDiscountPrice: Math.round(priceInMinor / 100),
                uiDiscountPercent: 0,
                uiRating: flags.rating,
                uiReviewCount: flags.reviewCount,
                uiFeatured: flags.featured,
                uiBestSeller: flags.bestSeller,
                uiNewArrival: flags.newArrival,
                uiWarranty: '90 Days',
              };
            } catch (error) {
              throwGraphQLError(error);
            }
          },
          storefrontPromoCode: async (_: unknown, args: { code: string }) => {
            try {
              const promoService = strapi.service('api::commerce.storefront-promo') as {
                resolvePromo: (codeInput: string) => Promise<Record<string, unknown> | null>;
              };
              const promo = await promoService.resolvePromo(args.code);
              if (!promo) return null;
              return {
                ...promo,
                minOrderSubtotalInMinor: String(promo.minOrderSubtotalInMinor || '0'),
                maxDiscountInMinor:
                  promo.maxDiscountInMinor != null ? String(promo.maxDiscountInMinor) : null,
              };
            } catch (error) {
              throwGraphQLError(error);
            }
          },
          storefrontSession: async (
            _: unknown,
            args: { token?: string },
            context: { koaContext: { request: { header: { authorization?: string } } } }
          ) => {
            try {
              const auth = strapi.service('api::commerce.storefront-auth') as {
                session: (authorization?: string) => Promise<Record<string, unknown>>;
              };
              const token = String(args.token || '').trim();
              const authorization = token
                ? `Bearer ${token}`
                : context.koaContext.request.header.authorization;
              return auth.session(authorization);
            } catch (error) {
              throwGraphQLError(error);
            }
          },
          storefrontMe: async (
            _: unknown,
            args: { token?: string },
            context: { koaContext: { request: { header: { authorization?: string } } } }
          ) => {
            try {
              const auth = strapi.service('api::commerce.storefront-auth') as {
                session: (authorization?: string) => Promise<{ authenticated: boolean; customer?: Record<string, unknown> }>;
              };
              const token = String(args.token || '').trim();
              const authorization = token
                ? `Bearer ${token}`
                : context.koaContext.request.header.authorization;
              const session = await auth.session(authorization);
              return session.authenticated ? session.customer : null;
            } catch (error) {
              throwGraphQLError(error);
            }
          },
          storefrontAddresses: async (
            _: unknown,
            args: { token: string },
            context: { koaContext: { request: { header: { authorization?: string } } } }
          ) => {
            try {
              const auth = strapi.service('api::commerce.storefront-auth') as {
                verifyCustomerToken: (token: string) => { sub: number };
              };
              const raw =
                String(args.token || '').trim() ||
                context.koaContext.request.header.authorization?.replace(/^Bearer\s+/i, '').trim();
              if (!raw) throw new AppError(401, 'AUTH_REQUIRED', 'Authentication required');
              const { sub } = auth.verifyCustomerToken(raw);
              const account = strapi.service('api::commerce.storefront-account') as {
                listAddresses: (customerId: number) => Promise<Array<Record<string, unknown>>>;
              };
              return account.listAddresses(sub);
            } catch (error) {
              throwGraphQLError(error);
            }
          },
          storefrontOrders: async (
            _: unknown,
            args: { token: string },
            context: { koaContext: { request: { header: { authorization?: string } } } }
          ) => {
            try {
              const auth = strapi.service('api::commerce.storefront-auth') as {
                verifyCustomerToken: (token: string) => { sub: number };
              };
              const raw =
                String(args.token || '').trim() ||
                context.koaContext.request.header.authorization?.replace(/^Bearer\s+/i, '').trim();
              if (!raw) throw new AppError(401, 'AUTH_REQUIRED', 'Authentication required');
              const { sub } = auth.verifyCustomerToken(raw);
              const account = strapi.service('api::commerce.storefront-account') as {
                listOrders: (customerId: number) => Promise<Array<Record<string, unknown>>>;
              };
              return account.listOrders(sub);
            } catch (error) {
              throwGraphQLError(error);
            }
          },
          storefrontOrder: async (
            _: unknown,
            args: { id: string; token: string },
            context: { koaContext: { request: { header: { authorization?: string } } } }
          ) => {
            try {
              const auth = strapi.service('api::commerce.storefront-auth') as {
                verifyCustomerToken: (token: string) => { sub: number };
              };
              const raw =
                String(args.token || '').trim() ||
                context.koaContext.request.header.authorization?.replace(/^Bearer\s+/i, '').trim();
              if (!raw) throw new AppError(401, 'AUTH_REQUIRED', 'Authentication required');
              const { sub } = auth.verifyCustomerToken(raw);
              const account = strapi.service('api::commerce.storefront-account') as {
                getOrderForCustomer: (customerId: number, orderId: number) => Promise<Record<string, unknown>>;
              };
              return account.getOrderForCustomer(sub, Number(args.id));
            } catch (error) {
              throwGraphQLError(error);
            }
          },
          storefrontReturnRequests: async (_: unknown, args: { token: string }) => {
            try {
              const auth = strapi.service('api::commerce.storefront-auth') as {
                verifyCustomerToken: (token: string) => { sub: number };
              };
              const { sub } = auth.verifyCustomerToken(args.token);
              const returnsService = strapi.service('api::commerce.storefront-returns') as {
                getReturnRequests: (customerId: number) => Promise<Array<Record<string, unknown>>>;
              };
              return returnsService.getReturnRequests(sub);
            } catch (error) {
              throwGraphQLError(error);
            }
          },
          storefrontCmsPage: async (_: unknown, args: { slug: string }) => {
            try {
              const slug = String(args.slug || '').trim();
              const block = await strapi.db.query('api::cms-block.cms-block').findOne({
                where: { slug, isActive: true },
              });
              if (!block) return null;
              return { slug: String(block.slug), title: String(block.title), body: block.body ? String(block.body) : null };
            } catch (error) {
              throwGraphQLError(error);
            }
          },
          storefrontFaqs: async () => {
            try {
              const faqs = await strapi.db.query('api::faq.faq').findMany({
                where: { isActive: true },
                orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
              });
              return faqs.map((f) => ({
                id: f.id,
                question: String(f.question || ''),
                answer: f.answer ? String(f.answer) : null,
                sortOrder: Number(f.sortOrder ?? 0),
              }));
            } catch (error) {
              throwGraphQLError(error);
            }
          },
          storefrontProductReviews: async (_: unknown, args: { sku: string; page?: number }) => {
            try {
              const reviewService = strapi.service('api::commerce.storefront-reviews') as {
                getProductReviews: (sku: string, page?: number) => Promise<Record<string, unknown>>;
              };
              return reviewService.getProductReviews(args.sku, args.page ?? 1);
            } catch (error) {
              throwGraphQLError(error);
            }
          },
        },
        Mutation: {
          storefrontRegister: async (_: unknown, args: { input: Record<string, unknown> }) => {
            try {
              const auth = strapi.service('api::commerce.storefront-auth') as {
                register: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
              };
              return auth.register(args.input);
            } catch (error) {
              throwGraphQLError(error);
            }
          },
          storefrontLogin: async (_: unknown, args: { input: Record<string, unknown> }) => {
            try {
              const auth = strapi.service('api::commerce.storefront-auth') as {
                login: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
              };
              return auth.login(args.input);
            } catch (error) {
              throwGraphQLError(error);
            }
          },
          storefrontLogout: async () => ({ ok: true }),
          storefrontRequestPasswordReset: async (_: unknown, args: { email: string }) => {
            try {
              const auth = strapi.service('api::commerce.storefront-auth') as {
                requestPasswordReset: (email: string) => Promise<{ ok: boolean }>;
              };
              return await auth.requestPasswordReset(args.email);
            } catch (error) {
              throwGraphQLError(error);
            }
          },
          storefrontResetPassword: async (_: unknown, args: { token: string; newPassword: string }) => {
            try {
              const auth = strapi.service('api::commerce.storefront-auth') as {
                resetPassword: (token: string, newPassword: string) => Promise<{ ok: boolean }>;
              };
              return await auth.resetPassword(args.token, args.newPassword);
            } catch (error) {
              throwGraphQLError(error);
            }
          },
          storefrontCreateReview: async (
            _: unknown,
            args: { token?: string; input: { sku: string; rating: number; title: string; body?: string } },
            context: { koaContext: { request: { header: { authorization?: string } } } }
          ) => {
            try {
              const reviewService = strapi.service('api::commerce.storefront-reviews') as {
                createReview: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
              };
              let customerId: number | undefined;
              const raw =
                String(args.token || '').trim() ||
                context.koaContext.request.header.authorization?.replace(/^Bearer\s+/i, '').trim();
              if (raw) {
                try {
                  const auth = strapi.service('api::commerce.storefront-auth') as {
                    verifyCustomerToken: (token: string) => { sub: number };
                  };
                  customerId = auth.verifyCustomerToken(raw).sub;
                } catch {
                  customerId = undefined;
                }
              }
              return reviewService.createReview({ ...args.input, customerId });
            } catch (error) {
              throwGraphQLError(error);
            }
          },
          storefrontCreateReturnRequest: async (
            _: unknown,
            args: {
              token: string;
              input: {
                orderId: string;
                reason: string;
                lineItems: Array<{ lineItemId: string }>;
                notes?: string;
              };
            }
          ) => {
            try {
              const auth = strapi.service('api::commerce.storefront-auth') as {
                verifyCustomerToken: (token: string) => { sub: number };
              };
              const { sub } = auth.verifyCustomerToken(args.token);
              const returnsService = strapi.service('api::commerce.storefront-returns') as {
                createReturnRequest: (input: {
                  orderId: string | number;
                  customerId: number;
                  reason: string;
                  lineItems: Array<{ lineItemId: number }>;
                  notes?: string;
                }) => Promise<Record<string, unknown>>;
              };
              return returnsService.createReturnRequest({
                orderId: args.input.orderId,
                customerId: sub,
                reason: args.input.reason,
                lineItems: args.input.lineItems.map((l) => ({ lineItemId: Number(l.lineItemId) })),
                notes: args.input.notes,
              });
            } catch (error) {
              throwGraphQLError(error);
            }
          },
          storefrontCreateAddress: async (
            _: unknown,
            args: { token: string; input: Record<string, unknown> },
            context: { koaContext: { request: { header: { authorization?: string } } } }
          ) => {
            try {
              const auth = strapi.service('api::commerce.storefront-auth') as {
                verifyCustomerToken: (token: string) => { sub: number };
              };
              const raw =
                String(args.token || '').trim() ||
                context.koaContext.request.header.authorization?.replace(/^Bearer\s+/i, '').trim();
              if (!raw) throw new AppError(401, 'AUTH_REQUIRED', 'Authentication required');
              const { sub } = auth.verifyCustomerToken(raw);
              const account = strapi.service('api::commerce.storefront-account') as {
                createAddress: (customerId: number, input: Record<string, unknown>) => Promise<Record<string, unknown>>;
              };
              return account.createAddress(sub, args.input);
            } catch (error) {
              throwGraphQLError(error);
            }
          },
          storefrontUpdateAddress: async (
            _: unknown,
            args: { token: string; id: string; input: Record<string, unknown> },
            context: { koaContext: { request: { header: { authorization?: string } } } }
          ) => {
            try {
              const auth = strapi.service('api::commerce.storefront-auth') as {
                verifyCustomerToken: (token: string) => { sub: number };
              };
              const raw =
                String(args.token || '').trim() ||
                context.koaContext.request.header.authorization?.replace(/^Bearer\s+/i, '').trim();
              if (!raw) throw new AppError(401, 'AUTH_REQUIRED', 'Authentication required');
              const { sub } = auth.verifyCustomerToken(raw);
              const account = strapi.service('api::commerce.storefront-account') as {
                updateAddress: (
                  customerId: number,
                  addressId: number,
                  input: Record<string, unknown>
                ) => Promise<Record<string, unknown>>;
              };
              return account.updateAddress(sub, Number(args.id), args.input);
            } catch (error) {
              throwGraphQLError(error);
            }
          },
          storefrontDeleteAddress: async (
            _: unknown,
            args: { token: string; id: string },
            context: { koaContext: { request: { header: { authorization?: string } } } }
          ) => {
            try {
              const auth = strapi.service('api::commerce.storefront-auth') as {
                verifyCustomerToken: (token: string) => { sub: number };
              };
              const raw =
                String(args.token || '').trim() ||
                context.koaContext.request.header.authorization?.replace(/^Bearer\s+/i, '').trim();
              if (!raw) throw new AppError(401, 'AUTH_REQUIRED', 'Authentication required');
              const { sub } = auth.verifyCustomerToken(raw);
              const account = strapi.service('api::commerce.storefront-account') as {
                deleteAddress: (customerId: number, addressId: number) => Promise<{ ok: boolean }>;
              };
              return account.deleteAddress(sub, Number(args.id));
            } catch (error) {
              throwGraphQLError(error);
            }
          },
          storefrontCreateOrder: async (
            _: unknown,
            args: { token?: string; input: Record<string, unknown> },
            context: { koaContext: { request: { header: { authorization?: string } } } }
          ) => {
            try {
              const auth = strapi.service('api::commerce.storefront-auth') as {
                verifyCustomerToken: (token: string) => { sub: number };
              };
              const raw =
                String(args.token || '').trim() ||
                context.koaContext.request.header.authorization?.replace(/^Bearer\s+/i, '').trim();
              let customerId: number | undefined;
              if (raw) {
                try {
                  customerId = auth.verifyCustomerToken(raw).sub;
                } catch {
                  customerId = undefined;
                }
              }
              const checkout = strapi.service('api::commerce.storefront-checkout') as {
                placeOrder: (input: Record<string, unknown>) => Promise<{
                  order: Record<string, unknown>;
                  continuationSecret: string;
                }>;
              };
              const input = args.input || {};
              const { order: created, continuationSecret } = await checkout.placeOrder({
                lines: input.lines,
                contactPhone: input.contactPhone,
                contactEmail: input.contactEmail,
                promoCode: input.promoCode,
                shippingAddressId: input.shippingAddressId != null ? Number(input.shippingAddressId) : undefined,
                guestShipping: input.guestShipping,
                customerId,
              });
              return { order: created, paymentContinuationSecret: continuationSecret };
            } catch (error) {
              throwGraphQLError(error);
            }
          },
          storefrontPrepareRazorpayPayment: async (
            _: unknown,
            args: { orderId: string; paymentContinuationSecret: string }
          ) => {
            try {
              const pay = strapi.service('api::commerce.payment-razorpay') as {
                storefrontPrepareRazorpayPayment: (
                  orderId: number,
                  continuation: string
                ) => Promise<Record<string, unknown>>;
              };
              return pay.storefrontPrepareRazorpayPayment(
                Number(args.orderId),
                String(args.paymentContinuationSecret || '').trim()
              );
            } catch (error) {
              throwGraphQLError(error);
            }
          },
          storefrontVerifyRazorpayPayment: async (
            _: unknown,
            args: { input: Record<string, unknown> }
          ) => {
            try {
              const pay = strapi.service('api::commerce.payment-razorpay') as {
                storefrontVerifyRazorpayPayment: (input: Record<string, unknown>) => Promise<unknown>;
              };
              const inp = args.input || {};
              return pay.storefrontVerifyRazorpayPayment({
                orderId: Number(inp.orderId),
                continuationSecret: String(inp.paymentContinuationSecret || '').trim(),
                razorpayOrderId: String(inp.razorpayOrderId || '').trim(),
                razorpayPaymentId: String(inp.razorpayPaymentId || '').trim(),
                razorpaySignature: String(inp.razorpaySignature || '').trim(),
              });
            } catch (error) {
              throwGraphQLError(error);
            }
          },
        },
        StorefrontOrder: {
          createdAt: (parent: Record<string, unknown>) =>
            parent.createdAt != null ? String(parent.createdAt) : null,
          taxInMinor: (parent: Record<string, unknown>) => String(parent.taxInMinor ?? '0'),
          taxRatePercent: (parent: Record<string, unknown>) => Number(parent.taxRatePercent ?? 0),
          contactEmail: (parent: Record<string, unknown>) => String(parent.contactEmail ?? ''),
          contactPhone: (parent: Record<string, unknown>) => String(parent.contactPhone ?? ''),
          shipments: (parent: Record<string, unknown>) => {
            const rows = parent.shipments;
            return Array.isArray(rows) ? rows : [];
          },
        },
        StorefrontShipment: {
          lastSyncedAt: (parent: Record<string, unknown>) =>
            parent.lastSyncedAt != null ? String(parent.lastSyncedAt) : null,
        },
      },
      resolversConfig: {
        'Query.storefrontCatalogMeta': { auth: false },
        'Query.storefrontHomeFilters': { auth: false },
        'Query.storefrontModelsByBrand': { auth: false },
        'Query.storefrontProductSections': { auth: false },
        'Query.storefrontProducts': { auth: false },
        'Query.storefrontProductBySku': { auth: false },
        'Query.storefrontPromoCode': { auth: false },
        'Query.storefrontSession': { auth: false },
        'Query.storefrontMe': { auth: false },
        'Query.storefrontAddresses': { auth: false },
        'Query.storefrontOrders': { auth: false },
        'Query.storefrontOrder': { auth: false },
        'Mutation.storefrontRegister': { auth: false },
        'Mutation.storefrontLogin': { auth: false },
        'Mutation.storefrontLogout': { auth: false },
        'Mutation.storefrontCreateAddress': { auth: false },
        'Mutation.storefrontUpdateAddress': { auth: false },
        'Mutation.storefrontDeleteAddress': { auth: false },
        'Mutation.storefrontCreateOrder': { auth: false },
        'Mutation.storefrontPrepareRazorpayPayment': { auth: false },
        'Mutation.storefrontVerifyRazorpayPayment': { auth: false },
        'Mutation.storefrontRequestPasswordReset': { auth: false },
        'Mutation.storefrontResetPassword': { auth: false },
        'Query.storefrontReturnRequests': { auth: false },
        'Mutation.storefrontCreateReturnRequest': { auth: false },
        'Query.storefrontCmsPage': { auth: false },
        'Query.storefrontFaqs': { auth: false },
        'Query.storefrontProductReviews': { auth: false },
        'Mutation.storefrontCreateReview': { auth: false },
      },
    }));
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const knex = strapi.db.connection;
    if (knex?.client?.config?.client !== 'postgres') {
      return;
    }
    try {
      await knex.raw(`
        CREATE UNIQUE INDEX IF NOT EXISTS part_models_brand_slug_uid
        ON part_models (brand_id, slug);
      `);
      await knex.raw(`
        CREATE UNIQUE INDEX IF NOT EXISTS webhook_deliveries_provider_event_uid
        ON webhook_deliveries (provider, event_id);
      `);
    } catch (e) {
      strapi.log.warn('Bootstrap index creation skipped or failed');
      strapi.log.debug(e);
    }
  },
};
