import type { Context } from 'koa';
import { factories } from '@strapi/strapi';
import { AppError } from '../../../lib/errors';

function handle(ctx: Context, fn: () => Promise<void>) {
  return (async () => {
    try {
      await fn();
    } catch (e: unknown) {
      if (e instanceof AppError) {
        ctx.status = e.status;
        ctx.body = { error: { code: e.code, message: e.message } };
        return;
      }
      throw e;
    }
  })();
}

export default factories.createCoreController('api::commerce.singleton-placeholder', ({ strapi }) => ({
  async razorpayOrder(ctx: Context) {
    await handle(ctx, async () => {
      const body = ctx.request.body as { orderId?: number };
      const orderId = Number(body?.orderId);
      if (!Number.isFinite(orderId)) throw new AppError(400, 'INVALID_ORDER', 'orderId required');
      const data = await strapi.service('api::commerce.payment-razorpay').createRazorpayOrderForStrapiOrder(orderId);
      ctx.body = { data };
    });
  },

  async paymentOrderGet(ctx: Context) {
    await handle(ctx, async () => {
      const data = await strapi.service('api::commerce.payment-razorpay').getPaymentOrder(Number(ctx.params.id));
      ctx.body = { data };
    });
  },
}));
