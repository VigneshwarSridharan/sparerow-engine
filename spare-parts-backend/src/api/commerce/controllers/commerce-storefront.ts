import type { Context } from 'koa';
import { factories } from '@strapi/strapi';
import { AppError, handle } from '../../../lib/errors';

export default factories.createCoreController('api::commerce.singleton-placeholder', ({ strapi }) => ({
  async catalogBrands(ctx: Context) {
    await handle(ctx, async () => {
      const data = await strapi.service('api::commerce.storefront-catalog').listBrands();
      ctx.body = { data };
    });
  },
  async catalogModels(ctx: Context) {
    await handle(ctx, async () => {
      const data = await strapi.service('api::commerce.storefront-catalog').listModels(ctx.params.brandSlug);
      ctx.body = { data };
    });
  },
  async catalogProducts(ctx: Context) {
    await handle(ctx, async () => {
      const data = await strapi
        .service('api::commerce.storefront-catalog')
        .listProducts(ctx.params.brandSlug, ctx.params.modelSlug);
      ctx.body = { data };
    });
  },
  async catalogProductDetail(ctx: Context) {
    await handle(ctx, async () => {
      const data = await strapi
        .service('api::commerce.storefront-catalog')
        .getProductByBrandModelSku(ctx.params.brandSlug, ctx.params.modelSlug, ctx.params.sku);
      ctx.body = { data };
    });
  },
  async catalogProductBySku(ctx: Context) {
    await handle(ctx, async () => {
      const data = await strapi.service('api::commerce.storefront-catalog').getProductBySku(ctx.params.sku);
      ctx.body = { data };
    });
  },
  async cmsBySlug(ctx: Context) {
    await handle(ctx, async () => {
      const data = await strapi.service('api::commerce.storefront-catalog').getCmsBlock(ctx.params.slug);
      ctx.body = { data };
    });
  },

  async authRegister(ctx: Context) {
    await handle(ctx, async () => {
      const data = await strapi.service('api::commerce.storefront-auth').register(ctx.request.body || {});
      ctx.body = { data };
    });
  },
  async authLogin(ctx: Context) {
    await handle(ctx, async () => {
      const data = await strapi.service('api::commerce.storefront-auth').login(ctx.request.body || {});
      ctx.body = { data };
    });
  },
  async authLogout(ctx: Context) {
    ctx.body = { data: { ok: true } };
  },
  async authSession(ctx: Context) {
    await handle(ctx, async () => {
      const data = await strapi
        .service('api::commerce.storefront-auth')
        .session(ctx.request.header.authorization);
      ctx.body = { data };
    });
  },

  async accountAddresses(ctx: Context) {
    await handle(ctx, async () => {
      const id = ctx.state.customerId as number;
      const data = await strapi.service('api::commerce.storefront-account').listAddresses(id);
      ctx.body = { data };
    });
  },
  async accountCreateAddress(ctx: Context) {
    await handle(ctx, async () => {
      const id = ctx.state.customerId as number;
      const data = await strapi.service('api::commerce.storefront-account').createAddress(id, ctx.request.body || {});
      ctx.body = { data };
    });
  },
  async accountUpdateAddress(ctx: Context) {
    await handle(ctx, async () => {
      const id = ctx.state.customerId as number;
      const data = await strapi
        .service('api::commerce.storefront-account')
        .updateAddress(id, Number(ctx.params.id), ctx.request.body || {});
      ctx.body = { data };
    });
  },
  async accountDeleteAddress(ctx: Context) {
    await handle(ctx, async () => {
      const id = ctx.state.customerId as number;
      const data = await strapi.service('api::commerce.storefront-account').deleteAddress(id, Number(ctx.params.id));
      ctx.body = { data };
    });
  },
  async accountOrders(ctx: Context) {
    await handle(ctx, async () => {
      const id = ctx.state.customerId as number;
      const data = await strapi.service('api::commerce.storefront-account').listOrders(id);
      ctx.body = { data };
    });
  },
  async storefrontOrderById(ctx: Context) {
    await handle(ctx, async () => {
      const id = ctx.state.customerId as number;
      const data = await strapi.service('api::commerce.storefront-account').getOrderForCustomer(id, Number(ctx.params.id));
      ctx.body = { data };
    });
  },

  async checkoutCreateOrder(ctx: Context) {
    await handle(ctx, async () => {
      const body = ctx.request.body as Record<string, unknown>;
      let customerId: number | undefined = ctx.state.customerId as number | undefined;
      if (!customerId) {
        const raw = ctx.request.header.authorization?.replace(/^Bearer\s+/i, '')?.trim();
        if (raw) {
          try {
            const auth = strapi.service('api::commerce.storefront-auth') as {
              verifyCustomerToken: (t: string) => { sub: number };
            };
            customerId = auth.verifyCustomerToken(raw).sub;
          } catch {
            customerId = undefined;
          }
        }
      }
      const { order, continuationSecret } = await strapi.service('api::commerce.storefront-checkout').placeOrder({
        lines: (body.lines as []) || [],
        contactPhone: String(body.contactPhone || ''),
        contactEmail: body.contactEmail != null ? String(body.contactEmail) : undefined,
        promoCode: body.promoCode != null ? String(body.promoCode) : undefined,
        customerId,
        shippingAddressId: body.shippingAddressId != null ? Number(body.shippingAddressId) : undefined,
        guestShipping: body.guestShipping as Record<string, unknown> | undefined,
      });
      ctx.body = { data: order, paymentContinuationSecret: continuationSecret };
    });
  },
}));
