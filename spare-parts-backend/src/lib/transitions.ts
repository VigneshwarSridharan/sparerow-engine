export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PAYMENT_FAILED'
  | 'ABANDONED'
  | 'FULFILLMENT_PENDING'
  | 'CANCELLED'
  | 'FULFILLED';

export type ShipmentStatus =
  | 'DRAFT'
  | 'BOOKED'
  | 'READY_TO_PICKUP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'FAILED';

const orderTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'PAYMENT_FAILED', 'ABANDONED', 'CANCELLED'],
  PAID: ['FULFILLMENT_PENDING', 'FULFILLED', 'CANCELLED'],
  PAYMENT_FAILED: [],
  ABANDONED: [],
  FULFILLMENT_PENDING: ['FULFILLED', 'CANCELLED'],
  CANCELLED: [],
  FULFILLED: [],
};

const shipmentTransitions: Record<ShipmentStatus, ShipmentStatus[]> = {
  DRAFT: ['BOOKED', 'FAILED'],
  BOOKED: ['READY_TO_PICKUP', 'IN_TRANSIT', 'FAILED'],
  READY_TO_PICKUP: ['IN_TRANSIT', 'FAILED'],
  IN_TRANSIT: ['DELIVERED', 'FAILED'],
  DELIVERED: [],
  FAILED: [],
};

export function assertOrderTransition(from: OrderStatus, to: OrderStatus): void {
  const allowed = orderTransitions[from];
  if (!allowed.includes(to)) {
    throw new Error(`ORDER_INVALID_TRANSITION:${from}->${to}`);
  }
}

export function assertShipmentTransition(from: ShipmentStatus, to: ShipmentStatus): void {
  if (from === to) return;
  const allowed = shipmentTransitions[from];
  if (!allowed.includes(to)) {
    throw new Error(`SHIPMENT_INVALID_TRANSITION:${from}->${to}`);
  }
}

// Linear progression of the non-terminal-failure states, used to walk a shipment
// forward through any skipped intermediate statuses when a carrier sync reveals it
// has already reached a later state (e.g. a missed IN_TRANSIT webhook before DELIVERED).
export const SHIPMENT_STATUS_ORDER: ShipmentStatus[] = [
  'DRAFT',
  'BOOKED',
  'READY_TO_PICKUP',
  'IN_TRANSIT',
  'DELIVERED',
];

// Maps a carrier's free-text status label (e.g. Shiprocket's `current_status`) onto our
// ShipmentStatus enum. Returns null when the label doesn't map to a known state, so callers
// can leave the shipment status untouched rather than guessing.
export function mapCarrierStatusToShipmentStatus(rawLabel: string | null | undefined): ShipmentStatus | null {
  if (!rawLabel) return null;
  const label = rawLabel.toUpperCase();
  if (/RTO|CANCEL|LOST|UNDELIVERED|RETURN|FAILED/.test(label)) return 'FAILED';
  if (label.includes('DELIVERED')) return 'DELIVERED';
  if (/IN.?TRANSIT|OUT FOR DELIVERY|SHIPPED|PICKED ?UP/.test(label)) return 'IN_TRANSIT';
  if (/PICKUP|READY TO SHIP|MANIFESTED/.test(label)) return 'READY_TO_PICKUP';
  return null;
}

export async function assertOrderCanBecomeFulfilled(
  strapi: { db: { query: (uid: string) => { findMany: (q: unknown) => Promise<{ status: ShipmentStatus }[]> } } },
  orderId: number | string
): Promise<void> {
  const shipments = await strapi.db.query('api::shipment.shipment').findMany({
    where: { order: orderId },
  });
  if (shipments.length === 0) {
    throw new Error('ORDER_FULFILL_REQUIRES_SHIPMENTS');
  }
  const allDelivered = shipments.every((s) => s.status === 'DELIVERED');
  if (!allDelivered) {
    throw new Error('ORDER_FULFILL_REQUIRES_ALL_SHIPMENTS_DELIVERED');
  }
}
