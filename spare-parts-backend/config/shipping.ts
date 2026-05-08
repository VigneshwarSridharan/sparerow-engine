import type { Core } from '@strapi/strapi';

export default ({ env }: Core.Config.Shared.ConfigParams) => ({
  primary: env('SHIPPING_PRIMARY_CARRIER', 'MOCK'),
  enableLive: env.bool('SHIPPING_ENABLE_LIVE', false),
  shiprocket: {
    email: env('SHIPROCKET_EMAIL', ''),
    password: env('SHIPROCKET_PASSWORD', ''),
    pickupLocation: env('SHIPROCKET_PICKUP_LOCATION', ''),
    webhookSecret: env('SHIPROCKET_WEBHOOK_SECRET', ''),
  },
  delhivery: {
    token: env('DELHIVERY_API_TOKEN', ''),
    warehouse: env('DELHIVERY_PICKUP_WAREHOUSE', ''),
  },
  defaultWeightGrams: env.int('SHIPPING_DEFAULT_WEIGHT_GRAMS', 500),
  origin: {
    name: env('SHIPPING_ORIGIN_NAME', ''),
    phone: env('SHIPPING_ORIGIN_PHONE', ''),
    line1: env('SHIPPING_ORIGIN_LINE1', ''),
    city: env('SHIPPING_ORIGIN_CITY', ''),
    postalCode: env('SHIPPING_ORIGIN_POSTAL_CODE', ''),
    state: env('SHIPPING_ORIGIN_STATE', ''),
  },
});
