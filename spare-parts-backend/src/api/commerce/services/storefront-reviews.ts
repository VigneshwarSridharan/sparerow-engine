import type { Core } from '@strapi/strapi';
import { AppError } from '../../../lib/errors';

const PAGE_SIZE = 10;

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async getProductReviews(sku: string, page = 1) {
    const normalized = String(sku).trim().toUpperCase();
    const product = await strapi.db.query('api::product.product').findOne({
      where: { sku: normalized, isActive: true },
    });
    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');

    const offset = (Math.max(1, page) - 1) * PAGE_SIZE;
    const [reviews, total] = await Promise.all([
      strapi.db.query('api::product-review.product-review').findMany({
        where: { product: product.id, isApproved: true },
        orderBy: { createdAt: 'desc' },
        limit: PAGE_SIZE,
        offset,
      }),
      strapi.db.query('api::product-review.product-review').count({
        where: { product: product.id, isApproved: true },
      }),
    ]);

    return {
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        body: r.body,
        verifiedPurchase: r.verifiedPurchase,
        createdAt: r.createdAt,
      })),
      total,
      page,
      pageSize: PAGE_SIZE,
      pageCount: Math.ceil(total / PAGE_SIZE),
    };
  },

  async getProductAggregates(productId: number) {
    const [sumResult, countResult] = await Promise.all([
      strapi.db.query('api::product-review.product-review').findMany({
        where: { product: productId, isApproved: true },
        select: ['rating'],
      }),
      strapi.db.query('api::product-review.product-review').count({
        where: { product: productId, isApproved: true },
      }),
    ]);

    if (countResult === 0) return { averageRating: 0, reviewCount: 0 };
    const sum = sumResult.reduce((acc, r) => acc + Number(r.rating), 0);
    return {
      averageRating: Math.round((sum / countResult) * 10) / 10,
      reviewCount: countResult,
    };
  },

  async getBulkAggregates(productIds: number[]): Promise<Map<number, { averageRating: number; reviewCount: number }>> {
    if (productIds.length === 0) return new Map();
    const allReviews = await strapi.db.query('api::product-review.product-review').findMany({
      where: { product: { id: { $in: productIds } }, isApproved: true },
      select: ['rating'],
      populate: { product: { select: ['id'] } },
    });
    const accMap = new Map<number, { sum: number; count: number }>();
    for (const r of allReviews) {
      const pid = (r.product as { id?: number })?.id;
      if (!pid) continue;
      const existing = accMap.get(pid) ?? { sum: 0, count: 0 };
      accMap.set(pid, { sum: existing.sum + Number(r.rating), count: existing.count + 1 });
    }
    return new Map(
      Array.from(accMap.entries()).map(([pid, { sum, count }]) => [
        pid,
        { averageRating: Math.round((sum / count) * 10) / 10, reviewCount: count },
      ])
    );
  },

  async createReview(input: {
    sku: string;
    rating: number;
    title: string;
    body?: string;
    customerId?: number;
  }) {
    const normalized = String(input.sku).trim().toUpperCase();
    const product = await strapi.db.query('api::product.product').findOne({
      where: { sku: normalized, isActive: true },
    });
    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');

    const rating = Math.round(Number(input.rating));
    if (rating < 1 || rating > 5) throw new AppError(400, 'INVALID_RATING', 'Rating must be 1–5');

    const title = String(input.title || '').trim();
    if (!title) throw new AppError(400, 'REVIEW_TITLE_REQUIRED', 'Review title is required');

    let verifiedPurchase = false;
    if (input.customerId) {
      const purchaseCount = await strapi.db.query('api::order.order').count({
        where: {
          customerAccount: input.customerId,
          status: { $in: ['DELIVERED', 'PAYMENT_RECEIVED'] },
          lineItems: { product: product.id },
        },
      });
      verifiedPurchase = purchaseCount > 0;
    }

    const review = await strapi.db.query('api::product-review.product-review').create({
      data: {
        product: product.id,
        customerAccount: input.customerId ?? null,
        rating,
        title,
        body: input.body ? String(input.body).trim() : null,
        verifiedPurchase,
        isApproved: false,
      },
    });

    return {
      id: review.id,
      rating: review.rating,
      title: review.title,
      body: review.body,
      verifiedPurchase: review.verifiedPurchase,
      isApproved: review.isApproved,
    };
  },
});
