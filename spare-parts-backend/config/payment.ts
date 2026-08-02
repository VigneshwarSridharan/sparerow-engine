import type { Core } from '@strapi/strapi';

export default ({ env }: Core.Config.Shared.ConfigParams) => ({
  razorpay: {
    keyId: env('RAZORPAY_KEY_ID', ''),
    keySecret: env('RAZORPAY_KEY_SECRET', ''),
    webhookSecret: env('RAZORPAY_WEBHOOK_SECRET', ''),
    reconcileDelayMinutes: env.int('RAZORPAY_RECONCILE_DELAY_MINUTES', 10),
    reconcileBatchSize: env.int('RAZORPAY_RECONCILE_BATCH_SIZE', 50),
  },
  internalApiKey: env('STRAPI_INTERNAL_API_KEY', ''),
});
