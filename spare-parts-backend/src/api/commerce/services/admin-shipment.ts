import type { Core } from '@strapi/strapi';
import { AppError } from '../../../lib/errors';
import {
  assertOrderTransition,
  assertShipmentTransition,
  mapCarrierStatusToShipmentStatus,
  SHIPMENT_STATUS_ORDER,
  type ShipmentStatus,
} from '../../../lib/transitions';
import { getPrimaryCarrier } from '../../../shipping/factory';
import { sendEmail } from '../../../lib/mailer';
import { orderShippedHtml } from '../../../lib/email-templates/order-shipped';
import { orderDeliveredHtml } from '../../../lib/email-templates/order-delivered';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async bookShipmentForOrder(orderId: number) {
    const order = await strapi.db.query('api::order.order').findOne({
      where: { id: orderId },
      populate: ['lineItems'],
    });
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

    const subtotalInMinor = Number((order as Record<string, unknown>).subtotalInMinor) || undefined;
    const lineItems = ((order as Record<string, unknown>).lineItems as Record<string, unknown>[]) || [];
    const items = lineItems.map((li) => ({
      name: String(li.nameSnapshot || ''),
      sku: String(li.variantSkuSnapshot || li.skuSnapshot || ''),
      units: Number(li.quantity) || 1,
      sellingPriceInMinor: Number(li.unitPriceInMinor) || 0,
    }));
    const result = await carrier.bookShipment({
      orderRef: String(orderId),
      weightGrams,
      orderSubtotalInMinor: subtotalInMinor,
      items,
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

    if ((order as Record<string, unknown>).status === 'PAID') {
      assertOrderTransition('PAID', 'FULFILLMENT_PENDING');
      await strapi.db.query('api::order.order').update({
        where: { id: orderId },
        data: { status: 'FULFILLMENT_PENDING' },
      });
    }
  },

  async updateShipmentStatus(shipmentId: number, next: ShipmentStatus) {
    const ship = await strapi.db.query('api::shipment.shipment').findOne({
      where: { id: shipmentId },
      populate: ['order'],
    });
    if (!ship) throw new AppError(404, 'SHIPMENT_NOT_FOUND', 'Shipment not found');
    assertShipmentTransition(ship.status as ShipmentStatus, next);
    await strapi.db.query('api::shipment.shipment').update({
      where: { id: shipmentId },
      data: { status: next, lastSyncedAt: new Date(), carrierStatusLabel: next },
    });

    const order = ship.order as Record<string, unknown> | null;

    if (next === 'DELIVERED' && order) {
      const orderId = order.id as number;
      const allShipments = await strapi.db
        .query('api::shipment.shipment')
        .findMany({ where: { order: orderId } });
      const allDelivered = allShipments.every(
        (s) => (s as Record<string, unknown>).status === 'DELIVERED'
      );
      if (allDelivered) {
        const freshOrder = await strapi.db
          .query('api::order.order')
          .findOne({ where: { id: orderId } });
        if (freshOrder && (freshOrder as Record<string, unknown>).status === 'FULFILLMENT_PENDING') {
          assertOrderTransition('FULFILLMENT_PENDING', 'FULFILLED');
          await strapi.db.query('api::order.order').update({
            where: { id: orderId },
            data: { status: 'FULFILLED' },
          });
        }
      }
    }
    if (order?.contactEmail) {
      try {
        const orderId = order.id as number;
        const contactEmail = String(order.contactEmail);
        if (next === 'IN_TRANSIT') {
          const html = orderShippedHtml({
            orderId,
            contactEmail,
            shippingRecipientName: String(order.shippingRecipientName || ''),
            trackingNumber: ship.trackingNumber ? String(ship.trackingNumber) : undefined,
            carrier: String(ship.carrier || 'MOCK'),
            carrierStatusLabel: ship.carrierStatusLabel ? String(ship.carrierStatusLabel) : undefined,
          });
          await sendEmail(strapi, contactEmail, `Your Order ORD-${orderId} Has Shipped`, html);
        } else if (next === 'DELIVERED') {
          const html = orderDeliveredHtml({
            orderId,
            contactEmail,
            shippingRecipientName: String(order.shippingRecipientName || ''),
          });
          await sendEmail(strapi, contactEmail, `Order ORD-${orderId} Delivered`, html);
        }
      } catch (e) {
        strapi.log.error(`[mailer] shipment email failed for shipment ${shipmentId}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

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

    await this.advanceFromCarrierStatus(shipmentId, sync.carrierStatusLabel);

    return strapi.db.query('api::shipment.shipment').findOne({ where: { id: shipmentId } });
  },

  // Maps a carrier's free-text status label onto our ShipmentStatus enum and walks the
  // shipment forward through any skipped intermediate states (e.g. a missed IN_TRANSIT
  // webhook before DELIVERED), reusing updateShipmentStatus's order-fulfillment cascade
  // and email side effects for every hop. Shared by both the pull-based sync and the
  // carrier's push webhook so the state machine is only walked in one place.
  async advanceFromCarrierStatus(shipmentId: number, carrierStatusLabel: string | undefined | null) {
    const ship = await strapi.db.query('api::shipment.shipment').findOne({ where: { id: shipmentId } });
    if (!ship) throw new AppError(404, 'SHIPMENT_NOT_FOUND', 'Shipment not found');
    const currentStatus = ship.status as ShipmentStatus;
    if (currentStatus === 'FAILED' || currentStatus === 'DELIVERED') return;

    const mapped = mapCarrierStatusToShipmentStatus(carrierStatusLabel);
    if (!mapped) return;
    if (mapped === 'FAILED') {
      await this.updateShipmentStatus(shipmentId, 'FAILED');
      return;
    }
    const currentIndex = SHIPMENT_STATUS_ORDER.indexOf(currentStatus);
    const targetIndex = SHIPMENT_STATUS_ORDER.indexOf(mapped);
    for (let i = currentIndex + 1; i <= targetIndex; i += 1) {
      await this.updateShipmentStatus(shipmentId, SHIPMENT_STATUS_ORDER[i]);
    }
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
