import type { Core } from '@strapi/strapi';
import { AppError } from '../../../lib/errors';

const RETURN_REASONS = ['DEFECTIVE', 'WRONG_ITEM', 'NOT_AS_DESCRIBED', 'CHANGED_MIND', 'OTHER'] as const;
type ReturnReason = typeof RETURN_REASONS[number];

function serializeReturnRequest(r: Record<string, unknown>) {
  return {
    id: r.id,
    orderId: (r.order as Record<string, unknown>)?.id ?? null,
    reason: r.reason,
    status: r.status,
    notes: r.notes ?? null,
    refundAmountInMinor: r.refundAmountInMinor ? String(r.refundAmountInMinor) : null,
    lineItems: r.lineItems as Array<{ skuSnapshot: string; nameSnapshot: string; quantity: number; unitPriceInMinor: string }>,
    createdAt: r.createdAt,
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async createReturnRequest(input: {
    orderId: string | number;
    customerId: number;
    reason: string;
    lineItems: Array<{ lineItemId: number }>;
    notes?: string;
  }) {
    if (!RETURN_REASONS.includes(input.reason as ReturnReason)) {
      throw new AppError(400, 'INVALID_RETURN_REASON', `Reason must be one of: ${RETURN_REASONS.join(', ')}`);
    }

    const order = await strapi.db.query('api::order.order').findOne({
      where: { id: input.orderId, customerAccount: input.customerId },
      populate: { lineItems: true },
    });

    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    if (order.status !== 'FULFILLED') {
      throw new AppError(400, 'ORDER_NOT_RETURNABLE', 'Only fulfilled orders are eligible for returns');
    }

    const existing = await strapi.db.query('api::return-request.return-request').count({
      where: { order: input.orderId, status: { $in: ['PENDING', 'APPROVED'] } },
    });
    if (existing > 0) {
      throw new AppError(409, 'RETURN_ALREADY_EXISTS', 'A return request already exists for this order');
    }

    const orderLines = (order.lineItems as Array<Record<string, unknown>>) ?? [];
    const requestedIds = new Set(input.lineItems.map((l) => Number(l.lineItemId)));

    const selectedLines = orderLines.filter((li) => requestedIds.has(Number(li.id)));
    if (selectedLines.length === 0) {
      throw new AppError(400, 'NO_LINE_ITEMS', 'Select at least one item to return');
    }

    const lineItemsSnapshot = selectedLines.map((li) => ({
      skuSnapshot: String(li.skuSnapshot || ''),
      nameSnapshot: String(li.nameSnapshot || ''),
      quantity: Number(li.quantity || 1),
      unitPriceInMinor: String(li.unitPriceInMinor || '0'),
    }));

    const refundAmountInMinor = selectedLines.reduce((sum, li) => {
      return sum + BigInt(li.unitPriceInMinor as string || '0') * BigInt(Number(li.quantity || 1));
    }, BigInt(0));

    const returnRequest = await strapi.db.query('api::return-request.return-request').create({
      data: {
        order: Number(input.orderId),
        customerAccount: input.customerId,
        reason: input.reason,
        status: 'PENDING',
        lineItems: lineItemsSnapshot,
        notes: input.notes ? String(input.notes).trim() : null,
        refundAmountInMinor: String(refundAmountInMinor),
      },
    });

    return serializeReturnRequest({ ...returnRequest, order: { id: input.orderId } });
  },

  async getReturnRequests(customerId: number) {
    const requests = await strapi.db.query('api::return-request.return-request').findMany({
      where: { customerAccount: customerId },
      orderBy: { createdAt: 'desc' },
      populate: { order: { select: ['id', 'status'] } },
    });
    return requests.map((r) => serializeReturnRequest(r as unknown as Record<string, unknown>));
  },
});
