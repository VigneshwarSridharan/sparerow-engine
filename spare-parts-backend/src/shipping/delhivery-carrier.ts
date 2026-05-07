import type { Core } from '@strapi/strapi';
import type { BookShipmentInput, BookShipmentResult, ShippingCarrier } from './types';
import { createAxios, withTransientRetry } from './types';

export class DelhiveryCarrier implements ShippingCarrier {
  readonly code = 'DELHIVERY' as const;

  constructor(private readonly strapi: Core.Strapi) {}

  async bookShipment(input: BookShipmentInput): Promise<BookShipmentResult> {
    const live = this.strapi.config.get<boolean>('shipping.enableLive');
    const token = this.strapi.config.get<string>('shipping.delhivery.token');
    const warehouse = this.strapi.config.get<string>('shipping.delhivery.warehouse');
    if (!live || !token) {
      return {
        carrierShipmentRef: `DLV-DEV-${input.orderRef}`,
        carrierStatusLabel: 'SIMULATED',
        metadata: { simulated: true },
      };
    }
    const http = createAxios();
    const waybillPayload = {
      shipments: [
        {
          name: input.drop.name,
          add: input.drop.line1,
          pin: input.drop.postalCode,
          city: input.drop.city,
          state: input.drop.state,
          country: input.drop.countryCode,
          phone: input.drop.phone,
          order: input.orderRef,
          payment_mode: 'Pre-paid',
          weight: Math.max(0.05, input.weightGrams / 1000),
        },
      ],
      pickup_location: { name: warehouse },
    };
    const res = await withTransientRetry(() =>
      http.post('https://track.delhivery.com/api/cmu/create.json', waybillPayload, {
        headers: { Authorization: `Token ${token}` },
        params: { format: 'json' },
      })
    );
    return {
      carrierShipmentRef: res.data?.packages?.[0]?.waybill ?? String(res.data?.rmk ?? ''),
      trackingNumber: res.data?.packages?.[0]?.waybill,
      carrierStatusLabel: 'BOOKED',
      metadata: { raw: res.data },
    };
  }
}

export function createDelhiveryCarrier(strapi: Core.Strapi) {
  return new DelhiveryCarrier(strapi);
}
