import type { Core } from '@strapi/strapi';
import type { CarrierCode, ShippingCarrier } from './types';
import { MockCarrier } from './mock-carrier';
import { createDelhiveryCarrier } from './delhivery-carrier';
import { createShiprocketCarrier } from './shiprocket-carrier';

export function getPrimaryCarrier(strapi: Core.Strapi): ShippingCarrier {
  const code = (strapi.config.get<string>('shipping.primary') || 'MOCK').toUpperCase() as CarrierCode;
  if (code === 'SHIPROCKET') return createShiprocketCarrier(strapi);
  if (code === 'DELHIVERY') return createDelhiveryCarrier(strapi);
  return new MockCarrier();
}
