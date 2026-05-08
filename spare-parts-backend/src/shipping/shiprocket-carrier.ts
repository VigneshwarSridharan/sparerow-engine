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
    const res = await withTransientRetry(() =>
      http.post(
        'https://apiv2.shiprocket.in/v1/external/orders/create/adhoc',
        {
          order_id: input.orderRef,
          pickup_location: pickupLocation,
          billing_customer_name: input.drop.name,
          billing_address: input.drop.line1,
          billing_city: input.drop.city,
          billing_pincode: input.drop.postalCode,
          billing_state: input.drop.state,
          billing_country: input.drop.countryCode,
          billing_email: 'noreply@example.com',
          billing_phone: input.drop.phone,
          shipping_is_billing: true,
          order_items: [{ name: 'Spare parts', sku: input.orderRef, units: 1, selling_price: 1 }],
          weight: Math.max(0.05, input.weightGrams / 1000),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
    );
    const shipmentId = res.data?.shipment_id ?? res.data?.payload?.shipment_id;
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
