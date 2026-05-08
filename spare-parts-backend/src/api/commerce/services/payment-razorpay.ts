import type { Core } from '@strapi/strapi';
import axios from 'axios';
import { AppError } from '../../../lib/errors';
import { assertSafeMinorAmount } from '../../../lib/validators';

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
    return {
      razorpayOrderId: rzpId,
      amount: Number(amount),
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
});
