import type { Core } from '@strapi/strapi';
import { GraphQLError } from 'graphql';
import { AppError } from './lib/errors';

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
  throw error;
}

function normalizeModelName(name: string): string {
  return name
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hashToRange(input: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  const normalized = Math.abs(hash % 1000) / 1000;
  return min + (max - min) * normalized;
}

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
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
          modelId: ID!
          modelSlug: String!
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
        }

        type StorefrontCatalogBootstrap {
          brands: [StorefrontBrand!]!
          models: [StorefrontModel!]!
          categories: [StorefrontCategory!]!
          products: [StorefrontProduct!]!
          promoCodes: [StorefrontPromoCode!]!
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

        type StorefrontOrder {
          id: ID!
          status: String!
          currency: String!
          subtotalInMinor: String!
          taxInMinor: String!
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
        }

        type StorefrontMutationResult {
          ok: Boolean!
        }

        extend type Query {
          storefrontCatalogBootstrap(filter: StorefrontCatalogFilterInput): StorefrontCatalogBootstrap!
          storefrontProducts(filter: StorefrontCatalogFilterInput): [StorefrontProduct!]!
          storefrontProductBySku(sku: String!): StorefrontProduct
          storefrontPromoCode(code: String!): StorefrontPromoCode
          storefrontSession: StorefrontSession!
          storefrontMe: StorefrontCustomer
          storefrontAddresses: [StorefrontAddress!]!
          storefrontOrders: [StorefrontOrder!]!
          storefrontOrder(id: ID!): StorefrontOrder
        }

        extend type Mutation {
          storefrontRegister(input: StorefrontAuthInput!): StorefrontAuthPayload!
          storefrontLogin(input: StorefrontAuthInput!): StorefrontAuthPayload!
          storefrontLogout: StorefrontMutationResult!
          storefrontCreateAddress(input: StorefrontAddressInput!): StorefrontAddress!
          storefrontUpdateAddress(id: ID!, input: StorefrontAddressInput!): StorefrontAddress!
          storefrontDeleteAddress(id: ID!): StorefrontMutationResult!
          storefrontCreateOrder(input: StorefrontCreateOrderInput!): StorefrontOrder!
        }
      `,
      resolvers: {
        Query: {
          storefrontCatalogBootstrap: async (_: unknown, args: { filter?: Record<string, unknown> }) => {
            try {
              const catalog = strapi.service('api::commerce.storefront-catalog') as {
                listBrands: () => Promise<Array<Record<string, unknown>>>;
                listAllModels: () => Promise<Array<Record<string, unknown>>>;
                listCategories: () => Promise<Array<Record<string, unknown>>>;
                listAllProducts: (filters?: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>;
              };
              const promoService = strapi.service('api::commerce.storefront-promo') as {
                resolvePromo: (codeInput: string) => Promise<Record<string, unknown> | null>;
              };
              const [brandsRaw, modelsRaw, categoriesRaw, productsRaw, promosRaw] = await Promise.all([
                catalog.listBrands(),
                catalog.listAllModels(),
                catalog.listCategories(),
                catalog.listAllProducts(args.filter),
                strapi.db.query('api::promo-code.promo-code').findMany({ where: { isActive: true }, orderBy: { code: 'asc' } }),
              ]);
              const modelProductCount = new Map<string, number>();
              const brandProductCount = new Map<string, number>();
              const categoryProductCount = new Map<string, number>();
              for (const product of productsRaw) {
                const modelId = String((product.partModel as Record<string, unknown>)?.id || '');
                const brandId = String(((product.partModel as Record<string, unknown>)?.brand as Record<string, unknown>)?.id || '');
                const categoryId = String((product.partCategory as Record<string, unknown>)?.id || '');
                if (modelId) modelProductCount.set(modelId, (modelProductCount.get(modelId) || 0) + 1);
                if (brandId) brandProductCount.set(brandId, (brandProductCount.get(brandId) || 0) + 1);
                if (categoryId) categoryProductCount.set(categoryId, (categoryProductCount.get(categoryId) || 0) + 1);
              }

              const brands = brandsRaw.map((brand) => ({
                ...brand,
                productCount: brandProductCount.get(String(brand.id)) || 0,
              }));
              const models = modelsRaw.map((model) => {
                const brand = model.brand as Record<string, unknown>;
                return {
                  ...model,
                  modelNumber: normalizeModelName(String(model.name || '')),
                  brandId: brand?.id,
                  brandSlug: brand?.slug,
                  productCount: modelProductCount.get(String(model.id)) || 0,
                };
              });
              const categories = categoriesRaw.map((category) => ({
                ...category,
                productCount: categoryProductCount.get(String(category.id)) || 0,
              }));

              const products = productsRaw.map((product) => {
                const sku = String(product.sku || '');
                const rating = Number(hashToRange(sku, 3.8, 4.9).toFixed(1));
                const reviews = Math.round(hashToRange(`${sku}-reviews`, 25, 420));
                const model = (product.partModel || {}) as Record<string, unknown>;
                const brand = (model.brand || {}) as Record<string, unknown>;
                const category = (product.partCategory || {}) as Record<string, unknown>;
                const priceInMinor = Number(product.priceInMinor || 0);
                return {
                  ...product,
                  brandId: brand.id,
                  brandSlug: brand.slug,
                  modelId: model.id,
                  modelSlug: model.slug,
                  categoryId: category.id || null,
                  categorySlug: category.slug || null,
                  categoryName: category.name || null,
                  uiPrice: Math.round(priceInMinor / 100),
                  uiDiscountPrice: Math.round(priceInMinor / 100),
                  uiDiscountPercent: 0,
                  uiRating: rating,
                  uiReviewCount: reviews,
                  uiFeatured: Number(product.availableToSell || 0) > 0 && reviews > 150,
                  uiBestSeller: reviews > 250,
                  uiNewArrival: reviews < 80,
                  uiWarranty: '90 Days',
                };
              });

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

              return { brands, models, categories, products, promoCodes };
            } catch (error) {
              throwGraphQLError(error);
            }
          },
          storefrontProducts: async (_: unknown, args: { filter?: Record<string, unknown> }) => {
            try {
              const catalog = strapi.service('api::commerce.storefront-catalog') as {
                listAllProducts: (filters?: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>;
              };
              const catalogData = await catalog.listAllProducts(args.filter);
              return catalogData.map((product) => {
                const sku = String(product.sku || '');
                const rating = Number(hashToRange(sku, 3.8, 4.9).toFixed(1));
                const reviews = Math.round(hashToRange(`${sku}-reviews`, 25, 420));
                const model = (product.partModel || {}) as Record<string, unknown>;
                const brand = (model.brand || {}) as Record<string, unknown>;
                const category = (product.partCategory || {}) as Record<string, unknown>;
                const priceInMinor = Number(product.priceInMinor || 0);
                return {
                  ...product,
                  brandId: brand.id,
                  brandSlug: brand.slug,
                  modelId: model.id,
                  modelSlug: model.slug,
                  categoryId: category.id || null,
                  categorySlug: category.slug || null,
                  categoryName: category.name || null,
                  uiPrice: Math.round(priceInMinor / 100),
                  uiDiscountPrice: Math.round(priceInMinor / 100),
                  uiDiscountPercent: 0,
                  uiRating: rating,
                  uiReviewCount: reviews,
                  uiFeatured: Number(product.availableToSell || 0) > 0 && reviews > 150,
                  uiBestSeller: reviews > 250,
                  uiNewArrival: reviews < 80,
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
              const product = await catalog.getProductBySku(args.sku);
              const sku = String(product.sku || '');
              const rating = Number(hashToRange(sku, 3.8, 4.9).toFixed(1));
              const reviews = Math.round(hashToRange(`${sku}-reviews`, 25, 420));
              const model = (product.partModel || {}) as Record<string, unknown>;
              const brand = (model.brand || {}) as Record<string, unknown>;
              const category = (product.partCategory || {}) as Record<string, unknown>;
              const priceInMinor = Number(product.priceInMinor || 0);
              return {
                ...product,
                brandId: brand.id,
                brandSlug: brand.slug,
                modelId: model.id,
                modelSlug: model.slug,
                categoryId: category.id || null,
                categorySlug: category.slug || null,
                categoryName: category.name || null,
                uiPrice: Math.round(priceInMinor / 100),
                uiDiscountPrice: Math.round(priceInMinor / 100),
                uiDiscountPercent: 0,
                uiRating: rating,
                uiReviewCount: reviews,
                uiFeatured: Number(product.availableToSell || 0) > 0 && reviews > 150,
                uiBestSeller: reviews > 250,
                uiNewArrival: reviews < 80,
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
          storefrontSession: async (_: unknown, __: unknown, context: { koaContext: { request: { header: { authorization?: string } } } }) => {
            try {
              const auth = strapi.service('api::commerce.storefront-auth') as {
                session: (authorization?: string) => Promise<Record<string, unknown>>;
              };
              return auth.session(context.koaContext.request.header.authorization);
            } catch (error) {
              throwGraphQLError(error);
            }
          },
          storefrontMe: async (_: unknown, __: unknown, context: { koaContext: { request: { header: { authorization?: string } } } }) => {
            try {
              const auth = strapi.service('api::commerce.storefront-auth') as {
                session: (authorization?: string) => Promise<{ authenticated: boolean; customer?: Record<string, unknown> }>;
              };
              const session = await auth.session(context.koaContext.request.header.authorization);
              return session.authenticated ? session.customer : null;
            } catch (error) {
              throwGraphQLError(error);
            }
          },
          storefrontAddresses: async (_: unknown, __: unknown, context: { koaContext: { request: { header: { authorization?: string } } } }) => {
            try {
              const auth = strapi.service('api::commerce.storefront-auth') as {
                verifyCustomerToken: (token: string) => { sub: number };
              };
              const raw = context.koaContext.request.header.authorization?.replace(/^Bearer\s+/i, '').trim();
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
          storefrontOrders: async (_: unknown, __: unknown, context: { koaContext: { request: { header: { authorization?: string } } } }) => {
            try {
              const auth = strapi.service('api::commerce.storefront-auth') as {
                verifyCustomerToken: (token: string) => { sub: number };
              };
              const raw = context.koaContext.request.header.authorization?.replace(/^Bearer\s+/i, '').trim();
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
          storefrontOrder: async (_: unknown, args: { id: string }, context: { koaContext: { request: { header: { authorization?: string } } } }) => {
            try {
              const auth = strapi.service('api::commerce.storefront-auth') as {
                verifyCustomerToken: (token: string) => { sub: number };
              };
              const raw = context.koaContext.request.header.authorization?.replace(/^Bearer\s+/i, '').trim();
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
          storefrontCreateAddress: async (
            _: unknown,
            args: { input: Record<string, unknown> },
            context: { koaContext: { request: { header: { authorization?: string } } } }
          ) => {
            try {
              const auth = strapi.service('api::commerce.storefront-auth') as {
                verifyCustomerToken: (token: string) => { sub: number };
              };
              const raw = context.koaContext.request.header.authorization?.replace(/^Bearer\s+/i, '').trim();
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
            args: { id: string; input: Record<string, unknown> },
            context: { koaContext: { request: { header: { authorization?: string } } } }
          ) => {
            try {
              const auth = strapi.service('api::commerce.storefront-auth') as {
                verifyCustomerToken: (token: string) => { sub: number };
              };
              const raw = context.koaContext.request.header.authorization?.replace(/^Bearer\s+/i, '').trim();
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
            args: { id: string },
            context: { koaContext: { request: { header: { authorization?: string } } } }
          ) => {
            try {
              const auth = strapi.service('api::commerce.storefront-auth') as {
                verifyCustomerToken: (token: string) => { sub: number };
              };
              const raw = context.koaContext.request.header.authorization?.replace(/^Bearer\s+/i, '').trim();
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
            args: { input: Record<string, unknown> },
            context: { koaContext: { request: { header: { authorization?: string } } } }
          ) => {
            try {
              const auth = strapi.service('api::commerce.storefront-auth') as {
                verifyCustomerToken: (token: string) => { sub: number };
              };
              const raw = context.koaContext.request.header.authorization?.replace(/^Bearer\s+/i, '').trim();
              let customerId: number | undefined;
              if (raw) {
                try {
                  customerId = auth.verifyCustomerToken(raw).sub;
                } catch {
                  customerId = undefined;
                }
              }
              const checkout = strapi.service('api::commerce.storefront-checkout') as {
                placeOrder: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
              };
              const input = args.input || {};
              return checkout.placeOrder({
                lines: input.lines,
                contactPhone: input.contactPhone,
                contactEmail: input.contactEmail,
                promoCode: input.promoCode,
                shippingAddressId: input.shippingAddressId != null ? Number(input.shippingAddressId) : undefined,
                guestShipping: input.guestShipping,
                customerId,
              });
            } catch (error) {
              throwGraphQLError(error);
            }
          },
        },
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
