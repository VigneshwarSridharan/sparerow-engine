import type { Core } from '@strapi/strapi';
import crypto from 'crypto';
import { AppError } from '../../../lib/errors';
import { assertShipmentTransition, type ShipmentStatus } from '../../../lib/transitions';

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

  async applyCarrierEvent(body: { shipmentId?: number; trackingNumber?: string; nextStatus?: ShipmentStatus }) {
    const shipmentId = Number(body.shipmentId);
    if (!Number.isFinite(shipmentId)) throw new AppError(400, 'INVALID_SHIPMENT', 'Invalid shipment id');
    const nextStatus = body.nextStatus;
    if (!nextStatus) throw new AppError(400, 'STATUS_REQUIRED', 'nextStatus required');
    const ship = await strapi.db.query('api::shipment.shipment').findOne({ where: { id: shipmentId } });
    if (!ship) throw new AppError(404, 'SHIPMENT_NOT_FOUND', 'Shipment not found');
    assertShipmentTransition(ship.status as ShipmentStatus, nextStatus);
    await strapi.db.query('api::shipment.shipment').update({
      where: { id: shipmentId },
      data: {
        status: nextStatus,
        trackingNumber: body.trackingNumber || ship.trackingNumber,
        lastSyncedAt: new Date(),
        carrierStatusLabel: nextStatus,
      },
    });
    return strapi.db.query('api::shipment.shipment').findOne({ where: { id: shipmentId } });
  },
});
