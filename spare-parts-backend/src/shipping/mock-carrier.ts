import type { BookShipmentInput, BookShipmentResult, ShippingCarrier, TrackingSyncResult } from './types';
import { withTransientRetry } from './types';

export class MockCarrier implements ShippingCarrier {
  readonly code = 'MOCK' as const;

  async bookShipment(input: BookShipmentInput): Promise<BookShipmentResult> {
    const ref = `MOCK-${input.orderRef}-${Date.now()}`;
    return withTransientRetry(async () => ({
      carrierShipmentRef: ref,
      trackingNumber: `TRK-${ref}`,
      carrierStatusLabel: 'MOCK_BOOKED',
      metadata: { mode: 'mock', bookedAt: new Date().toISOString() },
    }));
  }

  async markReadyForPickup(carrierShipmentRef: string): Promise<BookShipmentResult> {
    return {
      carrierShipmentRef,
      carrierStatusLabel: 'MOCK_READY',
      metadata: { mode: 'mock' },
    };
  }

  async syncTracking(carrierShipmentRef: string): Promise<TrackingSyncResult> {
    return {
      trackingNumber: `TRK-${carrierShipmentRef}`,
      carrierStatusLabel: 'MOCK_IN_TRANSIT',
      metadata: { mode: 'mock', lastSync: new Date().toISOString() },
    };
  }
}
