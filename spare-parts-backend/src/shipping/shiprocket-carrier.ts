import type { Core } from '@strapi/strapi';
import type { BookShipmentInput, BookShipmentResult, ShippingCarrier, TrackingSyncResult } from './types';
import { createAxios, withTransientRetry } from './types';

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(strapiInstance: Core.Strapi): Promise<string> {
  const email = strapiInstance.config.get<string>('shipping.shiprocket.email');
  const password = strapiInstance.config.get<string>('shipping.shiprocket.password');
  if (!email || !password) {
    throw new Error('SHIPROCKET_CREDENTIALS_MISSING');
  }
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5000) {
    return cachedToken.token;
  }
  const http = createAxios();
  const res = await withTransientRetry(() =>
    http.post('https://apiv2.shiprocket.in/v1/external/auth/login', { email, password })
  );
  const token = res.data?.token as string | undefined;
  if (!token) throw new Error('SHIPROCKET_AUTH_FAILED');
  cachedToken = { token, expiresAt: Date.now() + 9 * 60 * 60 * 1000 };
  return token;
}

export class ShiprocketCarrier implements ShippingCarrier {
  readonly code = 'SHIPROCKET' as const;

  constructor(private readonly strapi: Core.Strapi) {}

  async bookShipment(input: BookShipmentInput): Promise<BookShipmentResult> {
    const live = this.strapi.config.get<boolean>('shipping.enableLive');
    if (!live) {
      return {
        carrierShipmentRef: `SR-DEV-${input.orderRef}`,
        trackingNumber: undefined,
        carrierStatusLabel: 'SIMULATED',
        metadata: { simulated: true },
      };
    }
    const token = await getToken(this.strapi);
    const http = createAxios();
    const pickupLocation = this.strapi.config.get<string>('shipping.shiprocket.pickupLocation');
    const orderDate = new Date().toISOString().slice(0, 10);
    const nameParts = input.drop.name.trim().split(/\s+/);
    const firstName = nameParts[0] || input.drop.name;
    const lastName = nameParts.slice(1).join(' ') || '.';
    // Shiprocket's adhoc order-create endpoint is keyed by order_id: resubmitting the
    // same order_id returns the existing record as-is rather than creating a fresh one,
    // so a once-canceled order stays permanently canceled under that id. Suffixing with
    // the current timestamp guarantees every booking attempt (including retries) gets a
    // fresh Shiprocket order rather than colliding with a prior failed attempt.
    const shiprocketOrderId = `${input.orderRef}-${Date.now()}`;
    const res = await withTransientRetry(() =>
      http.post(
        'https://apiv2.shiprocket.in/v1/external/orders/create/adhoc',
        {
          order_id: shiprocketOrderId,
          order_date: orderDate,
          pickup_location: pickupLocation,
          payment_method: 'Prepaid',
          sub_total: input.orderSubtotalInMinor != null ? Math.max(1, Math.round(input.orderSubtotalInMinor / 100)) : 1,
          billing_customer_name: firstName,
          billing_last_name: lastName,
          billing_address: input.drop.line1,
          billing_address_2: input.drop.line2 || '',
          billing_city: input.drop.city,
          billing_pincode: input.drop.postalCode,
          billing_state: input.drop.state,
          billing_country: input.drop.countryCode,
          billing_email: 'noreply@example.com',
          billing_phone: input.drop.phone,
          shipping_is_billing: true,
          order_items: input.items.length > 0
            ? input.items.map((it) => ({
                name: it.name,
                sku: it.sku,
                units: it.units,
                selling_price: Math.max(1, Math.round(it.sellingPriceInMinor / 100)),
              }))
            : [{ name: 'Spare parts', sku: input.orderRef, units: 1, selling_price: input.orderSubtotalInMinor != null ? Math.max(1, Math.round(input.orderSubtotalInMinor / 100)) : 1 }],
          weight: Math.max(0.05, input.weightGrams / 1000),
          length: 10,
          breadth: 10,
          height: 5,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
    );
    const shipmentId = res.data?.shipment_id ?? res.data?.payload?.shipment_id;
    const remoteStatus = String(res.data?.status || '').toUpperCase();
    if (remoteStatus === 'CANCELED' || remoteStatus === 'CANCELLED') {
      throw new Error(
        `SHIPROCKET_ORDER_CANCELED: Shiprocket created order ${input.orderRef} (shipment_id=${shipmentId ?? 'unknown'}) but canceled it immediately — check seller onboarding/KYC and pickup address verification in the Shiprocket dashboard.`
      );
    }
    return {
      carrierShipmentRef: shipmentId != null ? String(shipmentId) : undefined,
      trackingNumber: res.data?.awb_code ? String(res.data.awb_code) : undefined,
      carrierStatusLabel: 'BOOKED',
      metadata: { raw: res.data },
    };
  }

  async markReadyForPickup(carrierShipmentRef: string): Promise<BookShipmentResult> {
    const live = this.strapi.config.get<boolean>('shipping.enableLive');
    if (!live) {
      return { carrierShipmentRef, carrierStatusLabel: 'SIMULATED_READY', metadata: { simulated: true } };
    }
    const token = await getToken(this.strapi);
    const http = createAxios();
    const pickup = this.strapi.config.get<string>('shipping.shiprocket.pickupLocation');
    const res = await withTransientRetry(() =>
      http.post(
        'https://apiv2.shiprocket.in/v1/external/courier/generate/pickup',
        { shipment_id: [Number(carrierShipmentRef)], pickup_location: pickup },
        { headers: { Authorization: `Bearer ${token}` } }
      )
    );
    return { carrierShipmentRef, carrierStatusLabel: 'PICKUP_REQUESTED', metadata: { raw: res.data } };
  }

  async syncTracking(carrierShipmentRef: string): Promise<TrackingSyncResult> {
    const live = this.strapi.config.get<boolean>('shipping.enableLive');
    if (!live) {
      return { carrierStatusLabel: 'SIMULATED_IN_TRANSIT', metadata: { simulated: true } };
    }
    const token = await getToken(this.strapi);
    const http = createAxios();
    const res = await withTransientRetry(() =>
      http.get(`https://apiv2.shiprocket.in/v1/external/courier/track/shipment/${carrierShipmentRef}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    const track = res.data?.tracking_data?.shipment_track ?? res.data;
    return {
      trackingNumber: track?.awb ?? undefined,
      carrierStatusLabel: track?.current_status ?? 'UPDATED',
      metadata: { raw: res.data },
    };
  }
}

export function createShiprocketCarrier(strapi: Core.Strapi) {
  return new ShiprocketCarrier(strapi);
}
