import type { Core } from '@strapi/strapi';
import crypto from 'crypto';
import { AppError } from '../../../lib/errors';
import { sendEmail } from '../../../lib/mailer';
import { orderConfirmationHtml } from '../../../lib/email-templates/order-confirmation';

function timingSafeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  verifySignature(rawBody: string, signatureHeader: string | undefined): void {
    const secret = strapi.config.get<string>('payment.razorpay.webhookSecret');
    if (!secret) throw new AppError(503, 'WEBHOOK_NOT_CONFIGURED', 'Webhook secret missing');
    if (!signatureHeader) throw new AppError(401, 'MISSING_SIGNATURE', 'Missing signature');
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    if (!timingSafeEqual(expected, signatureHeader)) {
      throw new AppError(401, 'INVALID_SIGNATURE', 'Invalid signature');
    }
  },

  async handlePayload(rawBody: string) {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      throw new AppError(400, 'INVALID_JSON', 'Invalid JSON');
    }
    const event = String(payload.event || '');
    const entity = (payload.payload as Record<string, Record<string, unknown>> | undefined)?.payment
      ?.entity as Record<string, unknown> | undefined;
    const eventId = String(
      (payload as { id?: string }).id || `${event}-${(entity?.order_id as string | undefined) ?? 'na'}`
    );
    const provider = 'razorpay';
    const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');

    const dup = await strapi.db.query('api::webhook-delivery.webhook-delivery').findOne({
      where: { provider, eventId },
    });
    if (dup) return { ok: true, duplicate: true as const };

    try {
      await strapi.db.query('api::webhook-delivery.webhook-delivery').create({
        data: {
          provider,
          eventId,
          payloadHash,
          receivedAt: new Date(),
        },
      });
    } catch {
      return { ok: true, duplicate: true as const };
    }

    if (event === 'payment.captured' && entity) {
      const rzpOrderId = String((entity as Record<string, unknown>).order_id || '');
      const paymentId = String((entity as Record<string, unknown>).id || '');
      const order = await strapi.db.query('api::order.order').findOne({
        where: { providerOrderId: rzpOrderId },
        populate: ['lineItems'],
      });
      if (order) {
        const wasPending = order.status === 'PENDING_PAYMENT';
        await strapi.db.query('api::order.order').update({
          where: { id: order.id },
          data: {
            status: 'PAID',
            providerPaymentId: paymentId,
            checkoutContinuationSecret: null,
          },
        });
        try {
          const shipmentSvc = strapi.service('api::commerce.admin-shipment') as {
            bookShipmentForOrder: (id: number) => Promise<void>;
          };
          await shipmentSvc.bookShipmentForOrder(order.id as number);
        } catch (e) {
          strapi.log.error('[webhook] bookShipmentForOrder failed for order %d: %s', order.id, e instanceof Error ? e.message : String(e));
        }
        if (wasPending && order.contactEmail) {
          try {
            const html = orderConfirmationHtml({
              orderId: order.id as number,
              contactEmail: String(order.contactEmail),
              shippingRecipientName: String(order.shippingRecipientName || ''),
              shippingLine1: String(order.shippingLine1 || ''),
              shippingLine2: order.shippingLine2 ? String(order.shippingLine2) : undefined,
              shippingCity: String(order.shippingCity || ''),
              shippingState: String(order.shippingState || ''),
              shippingPostalCode: String(order.shippingPostalCode || ''),
              subtotalInMinor: order.subtotalInMinor as string,
              taxInMinor: order.taxInMinor as string,
              shippingInMinor: order.shippingInMinor as string,
              promoDiscountInMinor: order.promoDiscountInMinor as string | undefined,
              totalInMinor: order.totalInMinor as string,
              lineItems: ((order.lineItems as Record<string, unknown>[] | null) ?? []) as never,
            });
            await sendEmail(strapi, String(order.contactEmail), `Order Confirmed – ORD-${order.id}`, html);
          } catch (e) {
            strapi.log.error('[mailer] order-confirmation failed for order %d: %s', order.id, e instanceof Error ? e.message : String(e));
          }
        }
      }
    }

    if (event === 'payment.failed' && entity) {
      const rzpOrderId = String((entity as Record<string, unknown>).order_id || '');
      const order = await strapi.db.query('api::order.order').findOne({
        where: { providerOrderId: rzpOrderId },
      });
      if (order && order.status === 'PENDING_PAYMENT') {
        const checkout = strapi.service('api::commerce.storefront-checkout') as {
          releaseReservationForOrder: (id: number) => Promise<void>;
        };
        await checkout.releaseReservationForOrder(order.id as number);
        await strapi.db.query('api::order.order').update({
          where: { id: order.id },
          data: { status: 'PAYMENT_FAILED', checkoutContinuationSecret: null },
        });
      }
    }

    return { ok: true, duplicate: false as const };
  },
});
