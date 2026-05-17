import axios, { type AxiosInstance } from 'axios';

export type CarrierCode = 'MOCK' | 'SHIPROCKET' | 'DELHIVERY';

export interface BookShipmentInput {
  orderRef: string;
  weightGrams: number;
  orderTotalInMinor?: number;
  pickup: {
    name: string;
    phone: string;
    line1: string;
    city: string;
    state: string;
    postalCode: string;
  };
  drop: {
    name: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    countryCode: string;
  };
}

export interface BookShipmentResult {
  carrierShipmentRef?: string;
  trackingNumber?: string;
  carrierStatusLabel?: string;
  metadata?: Record<string, unknown>;
}

export interface TrackingSyncResult {
  trackingNumber?: string;
  carrierStatusLabel?: string;
  metadata?: Record<string, unknown>;
}

export interface ShippingCarrier {
  readonly code: CarrierCode;
  bookShipment(input: BookShipmentInput): Promise<BookShipmentResult>;
  markReadyForPickup?(carrierShipmentRef: string): Promise<BookShipmentResult>;
  syncTracking?(carrierShipmentRef: string): Promise<TrackingSyncResult>;
}

export async function withTransientRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseMs = 200
): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const msg = e instanceof Error ? e.message : String(e);
      const retryable =
        msg.includes('ECONNRESET') ||
        msg.includes('ETIMEDOUT') ||
        msg.includes('ENOTFOUND') ||
        msg.includes('429') ||
        msg.includes('503');
      if (!retryable || i === attempts - 1) throw e;
      await new Promise((r) => setTimeout(r, baseMs * 2 ** i));
    }
  }
  throw last;
}

export function createAxios(): AxiosInstance {
  return axios.create({ timeout: 25_000 });
}
