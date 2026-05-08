import type { Core } from '@strapi/strapi';
import { AppError } from '../../../lib/errors';
import { assertShipmentTransition, type ShipmentStatus } from '../../../lib/transitions';
import { getPrimaryCarrier } from '../../../shipping/factory';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async updateShipmentStatus(shipmentId: number, next: ShipmentStatus) {
    const ship = await strapi.db.query('api::shipment.shipment').findOne({ where: { id: shipmentId } });
    if (!ship) throw new AppError(404, 'SHIPMENT_NOT_FOUND', 'Shipment not found');
    assertShipmentTransition(ship.status as ShipmentStatus, next);
    await strapi.db.query('api::shipment.shipment').update({
      where: { id: shipmentId },
      data: { status: next, lastSyncedAt: new Date(), carrierStatusLabel: next },
    });
    return strapi.db.query('api::shipment.shipment').findOne({ where: { id: shipmentId } });
  },

  async syncTracking(shipmentId: number) {
    const ship = await strapi.db.query('api::shipment.shipment').findOne({ where: { id: shipmentId } });
    if (!ship) throw new AppError(404, 'SHIPMENT_NOT_FOUND', 'Shipment not found');
    const ref = ship.carrierShipmentRef as string | undefined;
    if (!ref) throw new AppError(400, 'MISSING_CARRIER_REF', 'No carrier shipment ref');
    const carrier = getPrimaryCarrier(strapi);
    if (!carrier.syncTracking) return ship;
    const sync = await carrier.syncTracking(ref);
    await strapi.db.query('api::shipment.shipment').update({
      where: { id: shipmentId },
      data: {
        trackingNumber: sync.trackingNumber || ship.trackingNumber,
        carrierStatusLabel: sync.carrierStatusLabel || ship.carrierStatusLabel,
        lastSyncedAt: new Date(),
        carrierMetadata: sync.metadata || ship.carrierMetadata,
      },
    });
    return strapi.db.query('api::shipment.shipment').findOne({ where: { id: shipmentId } });
  },

  async readyForPickup(shipmentId: number) {
    const ship = await strapi.db.query('api::shipment.shipment').findOne({ where: { id: shipmentId } });
    if (!ship) throw new AppError(404, 'SHIPMENT_NOT_FOUND', 'Shipment not found');
    const carrier = getPrimaryCarrier(strapi);
    const ref = ship.carrierShipmentRef as string | undefined;
    if (ref && carrier.markReadyForPickup) {
      await carrier.markReadyForPickup(ref);
    }
    assertShipmentTransition(ship.status as ShipmentStatus, 'READY_TO_PICKUP');
    await strapi.db.query('api::shipment.shipment').update({
      where: { id: shipmentId },
      data: { status: 'READY_TO_PICKUP', lastSyncedAt: new Date() },
    });
    return strapi.db.query('api::shipment.shipment').findOne({ where: { id: shipmentId } });
  },
});
