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
  async inventoryAdjust(ctx: Context) {
    await handle(ctx, async () => {
      const body = ctx.request.body as { sku?: string; delta?: number };
      const data = await strapi
        .service('api::commerce.admin-inventory')
        .adjustInventory(String(body.sku || ''), Number(body.delta));
      ctx.body = { data };
    });
  },

  async ordersList(ctx: Context) {
    await handle(ctx, async () => {
      const status = ctx.query.status as string | undefined;
      const data = await strapi.service('api::commerce.admin-order').listOrders(
        status ? { status: status as never } : {}
      );
      ctx.body = { data };
    });
  },

  async ordersSummary(ctx: Context) {
    await handle(ctx, async () => {
      const data = await strapi.service('api::commerce.admin-order').opsSummary();
      ctx.body = { data };
    });
  },

  async orderGet(ctx: Context) {
    await handle(ctx, async () => {
      const data = await strapi.service('api::commerce.admin-order').getOrder(Number(ctx.params.orderId));
      ctx.body = { data };
    });
  },

  async orderPatchStatus(ctx: Context) {
    await handle(ctx, async () => {
      const body = ctx.request.body as { status?: string };
      if (!body.status) throw new AppError(400, 'STATUS_REQUIRED', 'status required');
      const data = await strapi
        .service('api::commerce.admin-order')
        .updateStatus(Number(ctx.params.orderId), body.status as never);
      ctx.body = { data };
    });
  },

  async orderBookShipment(ctx: Context) {
    await handle(ctx, async () => {
      const svc = strapi.service('api::commerce.admin-shipment') as {
        bookShipmentForOrder: (id: number) => Promise<void>;
      };
      await svc.bookShipmentForOrder(Number(ctx.params.orderId));
      ctx.body = { ok: true };
    });
  },

  async shipmentPatchStatus(ctx: Context) {
    await handle(ctx, async () => {
      const body = ctx.request.body as { status?: string };
      if (!body.status) throw new AppError(400, 'STATUS_REQUIRED', 'status required');
      const data = await strapi
        .service('api::commerce.admin-shipment')
        .updateShipmentStatus(Number(ctx.params.shipmentId), body.status as never);
      ctx.body = { data };
    });
  },

  async shipmentReady(ctx: Context) {
    await handle(ctx, async () => {
      const data = await strapi.service('api::commerce.admin-shipment').readyForPickup(Number(ctx.params.shipmentId));
      ctx.body = { data };
    });
  },

  async shipmentSync(ctx: Context) {
    await handle(ctx, async () => {
      const data = await strapi.service('api::commerce.admin-shipment').syncTracking(Number(ctx.params.shipmentId));
      ctx.body = { data };
    });
  },
}));
