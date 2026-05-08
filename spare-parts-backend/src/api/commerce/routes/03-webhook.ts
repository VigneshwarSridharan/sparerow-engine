import type { Core } from '@strapi/strapi';

const config: Core.RouterConfig = {
  type: 'content-api',
  routes: [
    {
      method: 'POST',
      path: '/webhooks/razorpay',
      handler: 'api::commerce.commerce-webhook.razorpayWebhook',
      config: { auth: false, policies: [], middlewares: [] },
    },
    {
      method: 'POST',
      path: '/webhooks/shipping-events',
      handler: 'api::commerce.commerce-webhook.shippingEvents',
      config: { auth: false, policies: [], middlewares: [] },
    },
  ],
};

export default config;
