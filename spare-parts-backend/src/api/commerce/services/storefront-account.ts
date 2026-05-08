import type { Core } from '@strapi/strapi';
import { AppError } from '../../../lib/errors';
import { assertIndianMobile, assertIndianPostal } from '../../../lib/validators';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async listAddresses(customerId: number) {
    return strapi.db.query('api::customer-address.customer-address').findMany({
      where: { customerAccount: customerId },
      orderBy: { id: 'desc' },
    });
  },

  async createAddress(
    customerId: number,
    body: Record<string, unknown>
  ) {
    const customerName = String(body.customerName ?? '');
    const line1 = String(body.line1 ?? '');
    const line2 = body.line2 != null ? String(body.line2) : undefined;
    const city = String(body.city ?? '');
    const state = String(body.state ?? '');
    const postalCode = assertIndianPostal('postalCode', body.postalCode);
    const countryCode = String(body.countryCode ?? 'IN');
    const phone = assertIndianMobile('phone', body.phone);
    if (!customerName || !line1 || !city || !state) {
      throw new AppError(400, 'ADDRESS_INVALID', 'Missing address fields');
    }
    return strapi.db.query('api::customer-address.customer-address').create({
      data: {
        customerName,
        line1,
        line2,
        city,
        state,
        postalCode,
        countryCode,
        phone,
        customerAccount: customerId,
      },
    });
  },

  async updateAddress(customerId: number, id: number, body: Record<string, unknown>) {
    const existing = await strapi.db.query('api::customer-address.customer-address').findOne({
      where: { id, customerAccount: customerId },
    });
    if (!existing) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found');
    const data: Record<string, unknown> = {};
    if (body.customerName != null) data.customerName = String(body.customerName);
    if (body.line1 != null) data.line1 = String(body.line1);
    if (body.line2 != null) data.line2 = String(body.line2);
    if (body.city != null) data.city = String(body.city);
    if (body.state != null) data.state = String(body.state);
    if (body.postalCode != null) data.postalCode = assertIndianPostal('postalCode', body.postalCode);
    if (body.countryCode != null) data.countryCode = String(body.countryCode);
    if (body.phone != null) data.phone = assertIndianMobile('phone', body.phone);
    return strapi.db.query('api::customer-address.customer-address').update({
      where: { id },
      data,
    });
  },

  async deleteAddress(customerId: number, id: number) {
    const existing = await strapi.db.query('api::customer-address.customer-address').findOne({
      where: { id, customerAccount: customerId },
    });
    if (!existing) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found');
    await strapi.db.query('api::customer-address.customer-address').delete({ where: { id } });
    return { ok: true };
  },

  async listOrders(customerId: number) {
    return strapi.db.query('api::order.order').findMany({
      where: { customerAccount: customerId },
      orderBy: { id: 'desc' },
      populate: ['lineItems'],
      limit: 50,
    });
  },

  async getOrderForCustomer(customerId: number, orderId: number) {
    const order = await strapi.db.query('api::order.order').findOne({
      where: { id: orderId },
      populate: ['lineItems', 'shipments'],
    });
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    if (!order.customerAccount) {
      throw new AppError(403, 'ORDER_FORBIDDEN', 'Guest orders cannot be viewed here');
    }
    if (Number(order.customerAccount) !== customerId) {
      throw new AppError(403, 'ORDER_FORBIDDEN', 'Not your order');
    }
    return order;
  },
});
