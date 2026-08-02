import type { Core } from '@strapi/strapi';
import axios from 'axios';
import { AppError } from '../../../lib/errors';
import { verifyRazorpayPaymentSignature } from '../../../lib/razorpay-signature';
import { timingSafeStringEqual } from '../../../lib/secret-compare';
import { assertSafeMinorAmount } from '../../../lib/validators';
import { sendEmail } from '../../../lib/mailer';
import { orderConfirmationHtml } from '../../../lib/email-templates/order-confirmation';
import { assertOrderTransition } from '../../../lib/transitions';

const PAYMENT_COMPLETED_STATUSES = ['PAID', 'FULFILLMENT_PENDING', 'FULFILLED'];

async function loadOrderContinuation(
  strapi: Core.Strapi,
  orderId: number,
  continuationSecret: string
) {
  const order = await strapi.db.query('api::order.order').findOne({ where: { id: orderId } });
  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
  const stored = order.checkoutContinuationSecret as string | null | undefined;
  // Webhook may have already processed and cleared the secret before the browser verify call arrives.
  // If the order is already past PENDING_PAYMENT the downstream idempotent path will validate the payment IDs.
  if (!stored && PAYMENT_COMPLETED_STATUSES.includes(order.status as string)) return order;
  if (!stored || !continuationSecret || !timingSafeStringEqual(stored, continuationSecret)) {
    throw new AppError(403, 'CHECKOUT_FORBIDDEN', 'Invalid checkout continuation');
  }
  return order;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async createRazorpayOrderForStrapiOrder(orderId: number) {
    const order = await strapi.db.query('api::order.order').findOne({ where: { id: orderId } });
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    if (order.status !== 'PENDING_PAYMENT') {
      throw new AppError(409, 'ORDER_NOT_PAYABLE', 'Order is not awaiting payment');
    }
    const keyId = strapi.config.get<string>('payment.razorpay.keyId');
    const keySecret = strapi.config.get<string>('payment.razorpay.keySecret');
    if (!keyId || !keySecret) throw new AppError(503, 'RAZORPAY_NOT_CONFIGURED', 'Razorpay keys missing');

    const amount = assertSafeMinorAmount('total', order.totalInMinor);
    const receipt = `order_${orderId}`.slice(0, 40);
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const res = await axios.post(
      'https://api.razorpay.com/v1/orders',
      {
        amount: Number(amount),
        currency: order.currency || 'INR',
        receipt,
        payment_capture: true,
        notes: { strapiOrderId: String(orderId) },
      },
      { headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' }, timeout: 20000 }
    );
    const rzpId = res.data?.id as string | undefined;
    if (!rzpId) throw new AppError(502, 'RAZORPAY_ORDER_FAILED', 'Razorpay did not return an order id');
    await strapi.db.query('api::order.order').update({
      where: { id: orderId },
      data: { providerOrderId: rzpId },
    });
    const amountNum = Number(amount);
    return {
      razorpayOrderId: rzpId,
      amount: amountNum,
      amountInMinor: amount.toString(),
      currency: order.currency || 'INR',
      keyId,
      strapiOrderId: orderId,
    };
  },

  async getPaymentOrder(orderId: number) {
    const order = await strapi.db.query('api::order.order').findOne({
      where: { id: orderId },
      select: ['id', 'status', 'totalInMinor', 'currency', 'providerOrderId', 'providerPaymentId'],
    });
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    return order;
  },

  async storefrontPrepareRazorpayPayment(orderId: number, continuationSecret: string) {
    const order = await loadOrderContinuation(strapi, orderId, continuationSecret);
    if (order.status !== 'PENDING_PAYMENT') {
      throw new AppError(409, 'ORDER_NOT_PAYABLE', 'Order is not awaiting payment');
    }
    const keyId = strapi.config.get<string>('payment.razorpay.keyId');
    const keySecret = strapi.config.get<string>('payment.razorpay.keySecret');
    if (!keyId || !keySecret) throw new AppError(503, 'RAZORPAY_NOT_CONFIGURED', 'Razorpay keys missing');

    if (order.providerOrderId) {
      const amount = assertSafeMinorAmount('total', order.totalInMinor);
      const amountNum = Number(amount);
      return {
        razorpayOrderId: String(order.providerOrderId),
        amount: amountNum,
        amountInMinor: amount.toString(),
        currency: order.currency || 'INR',
        keyId,
        strapiOrderId: orderId,
      };
    }

    return (
      strapi.service('api::commerce.payment-razorpay') as {
        createRazorpayOrderForStrapiOrder: (id: number) => Promise<Record<string, unknown>>;
      }
    ).createRazorpayOrderForStrapiOrder(orderId);
  },

  async storefrontVerifyRazorpayPayment(input: {
    orderId: number;
    continuationSecret: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    const keySecret = strapi.config.get<string>('payment.razorpay.keySecret');
    if (!keySecret) throw new AppError(503, 'RAZORPAY_NOT_CONFIGURED', 'Razorpay keys missing');

    const order = await loadOrderContinuation(strapi, input.orderId, input.continuationSecret);
    if (order.providerOrderId && order.providerOrderId !== input.razorpayOrderId) {
      throw new AppError(400, 'RAZORPAY_ORDER_MISMATCH', 'Razorpay order mismatch');
    }

    if (PAYMENT_COMPLETED_STATUSES.includes(order.status as string)) {
      if (
        order.providerPaymentId &&
        String(order.providerPaymentId) !== String(input.razorpayPaymentId)
      ) {
        throw new AppError(409, 'PAYMENT_MISMATCH', 'Payment id does not match this order');
      }
      return strapi.db.query('api::order.order').findOne({
        where: { id: input.orderId },
        populate: ['lineItems', 'shipments'],
      });
    }

    if (order.status !== 'PENDING_PAYMENT') {
      throw new AppError(409, 'ORDER_NOT_PAYABLE', 'Order cannot be confirmed');
    }

    const ok = verifyRazorpayPaymentSignature(
      input.razorpayOrderId,
      input.razorpayPaymentId,
      input.razorpaySignature,
      keySecret
    );
    if (!ok) throw new AppError(400, 'RAZORPAY_SIGNATURE_INVALID', 'Invalid Razorpay signature');

    try {
      const keyId = strapi.config.get<string>('payment.razorpay.keyId') || '';
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const payRes = await axios.get<{ status?: string; order_id?: string; amount?: number }>(
        `https://api.razorpay.com/v1/payments/${encodeURIComponent(input.razorpayPaymentId)}`,
        { headers: { Authorization: `Basic ${auth}` }, timeout: 20000 }
      );
      const st = String(payRes.data?.status || '');
      if (!['captured', 'authorized'].includes(st)) {
        throw new AppError(409, 'PAYMENT_NOT_COMPLETE', `Payment status is ${st || 'unknown'}`);
      }
      if (payRes.data?.order_id && String(payRes.data.order_id) !== String(input.razorpayOrderId)) {
        throw new AppError(400, 'RAZORPAY_ORDER_MISMATCH', 'Razorpay payment does not belong to this order');
      }
      const expectedAmt = Number(assertSafeMinorAmount('total', order.totalInMinor));
      const paidAmt = Number(payRes.data?.amount);
      if (Number.isFinite(paidAmt) && paidAmt !== expectedAmt) {
        throw new AppError(400, 'AMOUNT_MISMATCH', 'Paid amount does not match order total');
      }
    } catch (e: unknown) {
      if (e instanceof AppError) throw e;
      throw new AppError(502, 'RAZORPAY_VERIFY_FAILED', 'Unable to confirm payment with Razorpay');
    }

    return (
      strapi.service('api::commerce.payment-razorpay') as {
        markOrderPaid: (
          id: number,
          opts: { providerPaymentId: string; providerOrderId?: string }
        ) => Promise<Record<string, unknown> | null>;
      }
    ).markOrderPaid(input.orderId, {
      providerPaymentId: input.razorpayPaymentId,
      providerOrderId: input.razorpayOrderId,
    });
  },

  // Shared by the browser-driven verify mutation, the payment.captured webhook, and the
  // reconciliation cron below — whichever of the three gets here first performs the
  // transition + side effects; the others see a non-PENDING_PAYMENT status and no-op,
  // so a payment can never get double-booked or double-emailed.
  async markOrderPaid(
    orderId: number,
    opts: { providerPaymentId: string; providerOrderId?: string }
  ) {
    const order = await strapi.db.query('api::order.order').findOne({ where: { id: orderId } });
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');

    if (order.status !== 'PENDING_PAYMENT') {
      return strapi.db.query('api::order.order').findOne({
        where: { id: orderId },
        populate: ['lineItems', 'shipments'],
      });
    }

    assertOrderTransition('PENDING_PAYMENT', 'PAID');

    await strapi.db.query('api::order.order').update({
      where: { id: orderId },
      data: {
        status: 'PAID',
        providerPaymentId: opts.providerPaymentId,
        ...(opts.providerOrderId ? { providerOrderId: opts.providerOrderId } : {}),
        checkoutContinuationSecret: null,
      },
    });

    try {
      const shipmentSvc = strapi.service('api::commerce.admin-shipment') as {
        bookShipmentForOrder: (id: number) => Promise<void>;
      };
      await shipmentSvc.bookShipmentForOrder(orderId);
    } catch (e) {
      strapi.log.error('[payment] bookShipmentForOrder failed for order %d: %s', orderId, e instanceof Error ? e.message : String(e));
    }

    const populated = await strapi.db.query('api::order.order').findOne({
      where: { id: orderId },
      populate: ['lineItems', 'shipments'],
    });

    if (populated?.contactEmail) {
      try {
        const html = orderConfirmationHtml({
          orderId,
          contactEmail: String(populated.contactEmail),
          shippingRecipientName: String(populated.shippingRecipientName || ''),
          shippingLine1: String(populated.shippingLine1 || ''),
          shippingLine2: populated.shippingLine2 ? String(populated.shippingLine2) : undefined,
          shippingCity: String(populated.shippingCity || ''),
          shippingState: String(populated.shippingState || ''),
          shippingPostalCode: String(populated.shippingPostalCode || ''),
          subtotalInMinor: populated.subtotalInMinor as string,
          taxInMinor: populated.taxInMinor as string,
          shippingInMinor: populated.shippingInMinor as string,
          promoDiscountInMinor: populated.promoDiscountInMinor as string | undefined,
          totalInMinor: populated.totalInMinor as string,
          lineItems: ((populated.lineItems as Record<string, unknown>[] | null) ?? []) as never,
        });
        await sendEmail(strapi, String(populated.contactEmail), `Order Confirmed – ORD-${orderId}`, html);
      } catch (e) {
        strapi.log.error('[mailer] order-confirmation failed for order %d: %s', orderId, e instanceof Error ? e.message : String(e));
      }
    }

    return populated;
  },

  async markOrderPaymentFailed(orderId: number, reason: string) {
    const order = await strapi.db.query('api::order.order').findOne({ where: { id: orderId } });
    if (!order || order.status !== 'PENDING_PAYMENT') return;

    assertOrderTransition('PENDING_PAYMENT', 'PAYMENT_FAILED');

    const checkout = strapi.service('api::commerce.storefront-checkout') as {
      releaseReservationForOrder: (id: number) => Promise<void>;
    };
    await checkout.releaseReservationForOrder(orderId);

    await strapi.db.query('api::order.order').update({
      where: { id: orderId },
      data: { status: 'PAYMENT_FAILED', checkoutContinuationSecret: null },
    });
    strapi.log.info('[payment] order %d marked PAYMENT_FAILED (%s)', orderId, reason);
  },

  // Safety net for missed payment.captured/failed webhooks and abandoned browser tabs:
  // periodically re-checks Razorpay directly for orders that never got confirmed.
  async reconcilePendingPayments() {
    const keyId = strapi.config.get<string>('payment.razorpay.keyId');
    const keySecret = strapi.config.get<string>('payment.razorpay.keySecret');
    if (!keyId || !keySecret) {
      strapi.log.warn('[payment] reconcilePendingPayments skipped: Razorpay keys not configured');
      return { checked: 0, paid: 0, failed: 0, flagged: 0 };
    }

    const delayMinutes = strapi.config.get<number>('payment.razorpay.reconcileDelayMinutes') || 10;
    const batchSize = strapi.config.get<number>('payment.razorpay.reconcileBatchSize') || 50;
    const cutoff = new Date(Date.now() - delayMinutes * 60_000);
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const stuck = await strapi.db.query('api::order.order').findMany({
      where: { status: 'PENDING_PAYMENT', providerOrderId: { $notNull: true }, createdAt: { $lt: cutoff } },
      orderBy: { createdAt: 'asc' },
      limit: batchSize,
    });

    const self = strapi.service('api::commerce.payment-razorpay') as {
      markOrderPaid: (
        id: number,
        opts: { providerPaymentId: string; providerOrderId?: string }
      ) => Promise<unknown>;
      markOrderPaymentFailed: (id: number, reason: string) => Promise<void>;
    };

    let paid = 0;
    let failed = 0;
    let flagged = 0;
    for (const order of stuck) {
      try {
        const res = await axios.get<{ items: Array<{ id: string; status: string; amount: number; order_id: string }> }>(
          `https://api.razorpay.com/v1/orders/${encodeURIComponent(String(order.providerOrderId))}/payments`,
          { headers: { Authorization: `Basic ${auth}` }, timeout: 20000 }
        );
        const items = res.data?.items || [];
        const expectedAmt = Number(assertSafeMinorAmount('total', order.totalInMinor));
        const success = items.find((p) => ['captured', 'authorized'].includes(p.status));

        if (success) {
          if (Number(success.amount) !== expectedAmt) {
            strapi.log.warn(
              '[payment] reconcile: order %d payment %s amount mismatch (got %d, expected %d) — leaving for manual review',
              order.id,
              success.id,
              success.amount,
              expectedAmt
            );
            flagged += 1;
            continue;
          }
          await self.markOrderPaid(order.id as number, {
            providerPaymentId: success.id,
            providerOrderId: String(order.providerOrderId),
          });
          strapi.log.info('[payment] reconcile: order %d marked PAID via reconciliation (payment %s)', order.id, success.id);
          paid += 1;
        } else if (items.length > 0 && items.every((p) => p.status === 'failed')) {
          await self.markOrderPaymentFailed(order.id as number, 'razorpay_reconciliation_no_successful_payment');
          failed += 1;
        }
        // else: no payment attempt yet, or still pending/created — leave PENDING_PAYMENT alone.
      } catch (e) {
        strapi.log.error('[payment] reconcile: failed to check order %d: %s', order.id, e instanceof Error ? e.message : String(e));
      }
    }

    return { checked: stuck.length, paid, failed, flagged };
  },
});
