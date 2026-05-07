import type { Core } from '@strapi/strapi';

const config: Core.RouterConfig = {
  type: 'content-api',
  routes: [
    {
      method: 'POST',
      path: '/payments/razorpay/order',
      handler: 'api::commerce.commerce-payment.razorpayOrder',
      config: { auth: false, policies: ['global::internal-api-key'], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/payments/orders/:id',
      handler: 'api::commerce.commerce-payment.paymentOrderGet',
      config: { auth: false, policies: ['global::internal-api-key'], middlewares: [] },
    },
  ],
};

export default config;
