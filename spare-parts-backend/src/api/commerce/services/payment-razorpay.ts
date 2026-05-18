import type { Core } from '@strapi/strapi';
import axios from 'axios';
import { AppError } from '../../../lib/errors';
import { verifyRazorpayPaymentSignature } from '../../../lib/razorpay-signature';
import { timingSafeStringEqual } from '../../../lib/secret-compare';
import { assertSafeMinorAmount } from '../../../lib/validators';
import { sendEmail } from '../../../lib/mailer';
import { orderConfirmationHtml } from '../../../lib/email-templates/order-confirmation';

async function loadOrderContinuation(
  strapi: Core.Strapi,
  orderId: number,
  continuationSecret: string
) {
  const order = await strapi.db.query('api::order.order').findOne({ where: { id: orderId } });
  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
  const stored = order.checkoutContinuationSecret as string | null | undefined;
  // Webhook may have already processed and cleared the secret before the browser verify call arrives.
  // If the order is already PAID the downstream idempotent path will validate the payment IDs.
  if (!stored && order.status === 'PAID') return order;
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

    if (order.status === 'PAID') {
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

    await strapi.db.query('api::order.order').update({
      where: { id: input.orderId },
      data: {
        status: 'PAID',
        providerOrderId: input.razorpayOrderId,
        providerPaymentId: input.razorpayPaymentId,
        checkoutContinuationSecret: null,
      },
    });

    try {
      const shipmentSvc = strapi.service('api::commerce.admin-shipment') as {
        bookShipmentForOrder: (id: number) => Promise<void>;
      };
      await shipmentSvc.bookShipmentForOrder(input.orderId);
    } catch (e) {
      strapi.log.error('[payment] bookShipmentForOrder failed for order %d: %s', input.orderId, e instanceof Error ? e.message : String(e));
    }

    const populated = await strapi.db.query('api::order.order').findOne({
      where: { id: input.orderId },
      populate: ['lineItems', 'shipments'],
    });

    if (populated?.contactEmail) {
      try {
        const html = orderConfirmationHtml({
          orderId: input.orderId,
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
        await sendEmail(strapi, String(populated.contactEmail), `Order Confirmed – ORD-${input.orderId}`, html);
      } catch (e) {
        strapi.log.error('[mailer] order-confirmation failed for order %d: %s', input.orderId, e instanceof Error ? e.message : String(e));
      }
    }

    return populated;
  },
});
