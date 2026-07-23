import type { Core } from '@strapi/strapi';
import crypto from 'crypto';
import { AppError } from '../../../lib/errors';

function timingSafeHeader(received: string | undefined, expected: string): boolean {
  const a = Buffer.from(String(received || ''), 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  verifyShipperSecret(header: string | undefined) {
    const secret = strapi.config.get<string>('shipping.shiprocket.webhookSecret');
    if (!secret) throw new AppError(503, 'SHIPPING_WEBHOOK_NOT_CONFIGURED', 'Shipper webhook secret missing');
    if (!timingSafeHeader(header, secret)) {
      throw new AppError(401, 'INVALID_SHIPPING_SECRET', 'Invalid shipper secret');
    }
  },

  // Shiprocket sends this fixed dummy payload as a connectivity check before it will
  // let you save a webhook in its dashboard — it expects a 2xx even though no real
  // shipment has this awb, so it must be acknowledged rather than treated as a miss.
  isVerificationPing(body: Record<string, unknown>) {
    return String(body.awb) === '123456';
  },

  // Shiprocket's order-status webhook payload, e.g.:
  // { awb, current_status, shipment_status, order_id, current_timestamp, scans: [...] }
  // It correlates by awb (tracking number) — there is no internal shipment id in the
  // payload — and carries the status as a free-text label rather than our enum.
  async applyCarrierEvent(body: Record<string, unknown>) {
    if (this.isVerificationPing(body)) {
      return { ok: true, verification: true };
    }

    const awb = body.awb != null ? String(body.awb) : undefined;
    if (!awb) throw new AppError(400, 'INVALID_SHIPMENT', 'awb required');
    const ship = await strapi.db.query('api::shipment.shipment').findOne({ where: { trackingNumber: awb } });
    if (!ship) throw new AppError(404, 'SHIPMENT_NOT_FOUND', `No shipment found for awb ${awb}`);

    const carrierStatusLabel = (body.current_status || body.shipment_status) as string | undefined;
    if (!carrierStatusLabel) throw new AppError(400, 'STATUS_REQUIRED', 'current_status required');

    const shipmentId = ship.id as number;
    await strapi.db.query('api::shipment.shipment').update({
      where: { id: shipmentId },
      data: {
        carrierStatusLabel,
        lastSyncedAt: new Date(),
        carrierMetadata: body,
      },
    });

    const adminShipment = strapi.service('api::commerce.admin-shipment') as {
      advanceFromCarrierStatus: (id: number, label: string | undefined | null) => Promise<void>;
    };
    await adminShipment.advanceFromCarrierStatus(shipmentId, carrierStatusLabel);

    return strapi.db.query('api::shipment.shipment').findOne({ where: { id: shipmentId } });
  },
});
