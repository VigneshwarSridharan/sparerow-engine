import type { Core } from '@strapi/strapi';
import { AppError } from '../../../lib/errors';
import { assertShipmentTransition, type ShipmentStatus } from '../../../lib/transitions';
import { getPrimaryCarrier } from '../../../shipping/factory';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async bookShipmentForOrder(orderId: number) {
    const order = await strapi.db.query('api::order.order').findOne({ where: { id: orderId } });
    if (!order) return;

    const shipments = await strapi.db.query('api::shipment.shipment').findMany({
      where: { order: orderId, status: 'DRAFT' },
    });
    if (shipments.length === 0) return;

    const shipment = shipments[0] as Record<string, unknown>;
    if (shipment.carrierShipmentRef) return; // already booked

    const carrier = getPrimaryCarrier(strapi);
    const weightGrams = strapi.config.get<number>('shipping.defaultWeightGrams') || 500;
    const origin = strapi.config.get<{
      name: string; phone: string; line1: string;
      city: string; postalCode: string; state: string;
    }>('shipping.origin');

    const totalInMinor = Number((order as Record<string, unknown>).totalInMinor) || undefined;
    const result = await carrier.bookShipment({
      orderRef: String(orderId),
      weightGrams,
      orderTotalInMinor: totalInMinor,
      pickup: {
        name: origin.name,
        phone: origin.phone,
        line1: origin.line1,
        city: origin.city,
        state: origin.state,
        postalCode: origin.postalCode,
      },
      drop: {
        name: String((order as Record<string, unknown>).shippingRecipientName || ''),
        phone: String((order as Record<string, unknown>).shippingPhone || ''),
        line1: String((order as Record<string, unknown>).shippingLine1 || ''),
        line2: (order as Record<string, unknown>).shippingLine2
          ? String((order as Record<string, unknown>).shippingLine2)
          : undefined,
        city: String((order as Record<string, unknown>).shippingCity || ''),
        state: String((order as Record<string, unknown>).shippingState || ''),
        postalCode: String((order as Record<string, unknown>).shippingPostalCode || ''),
        countryCode: String((order as Record<string, unknown>).shippingCountryCode || 'IN'),
      },
    });

    await strapi.db.query('api::shipment.shipment').update({
      where: { id: shipment.id as number },
      data: {
        status: 'BOOKED',
        carrierShipmentRef: result.carrierShipmentRef,
        trackingNumber: result.trackingNumber,
        carrierStatusLabel: result.carrierStatusLabel || 'BOOKED',
        lastSyncedAt: new Date(),
        carrierMetadata: result.metadata || {},
      },
    });
  },

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
