import type { Context } from 'koa';
import { factories } from '@strapi/strapi';
import unparsedSymbol from 'koa-body/lib/unparsed';
import { handle } from '../../../lib/errors';

function rawBodyFromCtx(ctx: Context): string {
  const body = ctx.request.body as Record<string, unknown> | undefined;
  if (body && typeof body === 'object' && unparsedSymbol in body) {
    const raw = (body as Record<symbol, unknown>)[unparsedSymbol as unknown as symbol];
    if (Buffer.isBuffer(raw)) return raw.toString('utf8');
    if (typeof raw === 'string') return raw;
  }
  try {
    return JSON.stringify(ctx.request.body ?? {});
  } catch {
    return '';
  }
}

export default factories.createCoreController('api::commerce.singleton-placeholder', ({ strapi }) => ({
  async razorpayWebhook(ctx: Context) {
    await handle(ctx, async () => {
      const raw = rawBodyFromCtx(ctx);
      const sig = ctx.request.header['x-razorpay-signature'] as string | undefined;
      strapi.log.info(`[razorpay-webhook] sig-present=${!!sig} raw-length=${raw.length}`);
      const svc = strapi.service('api::commerce.webhook-razorpay') as {
        verifySignature: (r: string, s: string | undefined) => void;
        handlePayload: (r: string) => Promise<{ ok: boolean; duplicate: boolean }>;
      };
      svc.verifySignature(raw, sig);
      const data = await svc.handlePayload(raw);
      ctx.body = { data };
    });
  },

  async shippingEvents(ctx: Context) {
    await handle(ctx, async () => {
      const secretHeader =
        (ctx.request.header['x-shipper-secret'] as string | undefined) ||
        (ctx.request.header['x-shipping-secret'] as string | undefined);
      const wh = strapi.service('api::commerce.webhook-shipping') as {
        verifyShipperSecret: (h: string | undefined) => void;
        applyCarrierEvent: (b: Record<string, unknown>) => Promise<unknown>;
      };
      wh.verifyShipperSecret(secretHeader);
      const data = await wh.applyCarrierEvent((ctx.request.body || {}) as Record<string, unknown>);
      ctx.body = { data };
    });
  },
}));
