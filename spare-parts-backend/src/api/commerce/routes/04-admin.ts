import type { Core } from '@strapi/strapi';

const config: Core.RouterConfig = {
  type: 'content-api',
  routes: [
    {
      method: 'POST',
      path: '/admin/inventory/adjust',
      handler: 'api::commerce.commerce-admin.inventoryAdjust',
      config: { auth: false, policies: ['global::internal-api-key', 'global::admin-session'], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/admin/orders',
      handler: 'api::commerce.commerce-admin.ordersList',
      config: { auth: false, policies: ['global::internal-api-key', 'global::admin-session'], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/admin/orders/ops-summary',
      handler: 'api::commerce.commerce-admin.ordersSummary',
      config: { auth: false, policies: ['global::internal-api-key', 'global::admin-session'], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/admin/orders/:orderId',
      handler: 'api::commerce.commerce-admin.orderGet',
      config: { auth: false, policies: ['global::internal-api-key', 'global::admin-session'], middlewares: [] },
    },
    {
      method: 'PATCH',
      path: '/admin/orders/:orderId/status',
      handler: 'api::commerce.commerce-admin.orderPatchStatus',
      config: { auth: false, policies: ['global::internal-api-key', 'global::admin-session'], middlewares: [] },
    },
    {
      method: 'PATCH',
      path: '/admin/shipments/:shipmentId/status',
      handler: 'api::commerce.commerce-admin.shipmentPatchStatus',
      config: { auth: false, policies: ['global::internal-api-key', 'global::admin-session'], middlewares: [] },
    },
    {
      method: 'POST',
      path: '/admin/shipments/:shipmentId/ready-for-pickup',
      handler: 'api::commerce.commerce-admin.shipmentReady',
      config: { auth: false, policies: ['global::internal-api-key', 'global::admin-session'], middlewares: [] },
    },
    {
      method: 'POST',
      path: '/admin/shipments/:shipmentId/sync-tracking',
      handler: 'api::commerce.commerce-admin.shipmentSync',
      config: { auth: false, policies: ['global::internal-api-key', 'global::admin-session'], middlewares: [] },
    },
  ],
};

export default config;
