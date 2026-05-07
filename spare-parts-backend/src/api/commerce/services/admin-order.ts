import type { Core } from '@strapi/strapi';
import { AppError } from '../../../lib/errors';
import {
  assertOrderTransition,
  assertOrderCanBecomeFulfilled,
  type OrderStatus,
} from '../../../lib/transitions';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async listOrders(filters: { status?: OrderStatus }) {
    const where = filters.status ? { status: filters.status } : {};
    return strapi.db.query('api::order.order').findMany({
      where,
      orderBy: { id: 'desc' },
      populate: ['lineItems', 'shipments', 'customerAccount'],
      limit: 100,
    });
  },

  async opsSummary() {
    const pending = await strapi.db.query('api::order.order').count({ where: { status: 'PENDING_PAYMENT' } });
    const paid = await strapi.db.query('api::order.order').count({ where: { status: 'PAID' } });
    const fulfill = await strapi.db.query('api::order.order').count({ where: { status: 'FULFILLMENT_PENDING' } });
    const draftShipments = await strapi.db.query('api::shipment.shipment').count({ where: { status: 'DRAFT' } });
    return { pendingPayment: pending, paid, fulfillmentPending: fulfill, draftShipments };
  },

  async getOrder(orderId: number) {
    const order = await strapi.db.query('api::order.order').findOne({
      where: { id: orderId },
      populate: ['lineItems', 'shipments', 'customerAccount'],
    });
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    return order;
  },

  async updateStatus(orderId: number, next: OrderStatus) {
    const order = await strapi.db.query('api::order.order').findOne({ where: { id: orderId } });
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    const from = order.status as OrderStatus;
    assertOrderTransition(from, next);
    if (next === 'FULFILLED') {
      await assertOrderCanBecomeFulfilled(strapi, order.id as number);
    }
    await strapi.db.query('api::order.order').update({
      where: { id: orderId },
      data: { status: next },
    });
    return strapi.db.query('api::order.order').findOne({
      where: { id: orderId },
      populate: ['lineItems', 'shipments'],
    });
  },
});
