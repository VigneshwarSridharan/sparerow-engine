import type { Core } from '@strapi/strapi';
import { AppError } from '../../../lib/errors';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async adjustInventory(sku: string, delta: number) {
    const normalized = String(sku || '')
      .trim()
      .toUpperCase();
    if (!Number.isFinite(delta) || !Number.isInteger(delta)) {
      throw new AppError(400, 'DELTA_INVALID', 'delta must be an integer');
    }
    const product = await strapi.db.query('api::product.product').findOne({ where: { sku: normalized } });
    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    const next = Number(product.quantityOnHand) + delta;
    if (next < 0) throw new AppError(400, 'INVENTORY_UNDERFLOW', 'quantityOnHand cannot be negative');
    await strapi.db.query('api::product.product').update({
      where: { id: product.id },
      data: { quantityOnHand: next },
    });
    return strapi.db.query('api::product.product').findOne({ where: { id: product.id } });
  },
});
