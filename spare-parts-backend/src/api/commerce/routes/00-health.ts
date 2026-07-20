import type { Core } from '@strapi/strapi';

const config: Core.RouterConfig = {
  type: 'content-api',
  routes: [
    {
      method: 'GET',
      path: '/health',
      handler: 'api::commerce.commerce-health.check',
      config: { auth: false, policies: [], middlewares: [] },
    },
  ],
};

export default config;
