import type { Core } from '@strapi/strapi';

const config: Core.RouterConfig = {
  type: 'content-api',
  routes: [
    {
      method: 'GET',
      path: '/storefront/catalog/brands',
      handler: 'api::commerce.commerce-storefront.catalogBrands',
      config: { auth: false, policies: [], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/storefront/catalog/brands/:brandSlug/models',
      handler: 'api::commerce.commerce-storefront.catalogModels',
      config: { auth: false, policies: [], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/storefront/catalog/brands/:brandSlug/models/:modelSlug/products',
      handler: 'api::commerce.commerce-storefront.catalogProducts',
      config: { auth: false, policies: [], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/storefront/catalog/brands/:brandSlug/models/:modelSlug/products/:sku',
      handler: 'api::commerce.commerce-storefront.catalogProductDetail',
      config: { auth: false, policies: [], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/storefront/catalog/products/:sku',
      handler: 'api::commerce.commerce-storefront.catalogProductBySku',
      config: { auth: false, policies: [], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/storefront/cms/:slug',
      handler: 'api::commerce.commerce-storefront.cmsBySlug',
      config: { auth: false, policies: [], middlewares: [] },
    },
    {
      method: 'POST',
      path: '/storefront/auth/register',
      handler: 'api::commerce.commerce-storefront.authRegister',
      config: { auth: false, policies: [], middlewares: [] },
    },
    {
      method: 'POST',
      path: '/storefront/auth/login',
      handler: 'api::commerce.commerce-storefront.authLogin',
      config: { auth: false, policies: [], middlewares: [] },
    },
    {
      method: 'POST',
      path: '/storefront/auth/logout',
      handler: 'api::commerce.commerce-storefront.authLogout',
      config: { auth: false, policies: [], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/storefront/auth/session',
      handler: 'api::commerce.commerce-storefront.authSession',
      config: { auth: false, policies: [], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/storefront/account/addresses',
      handler: 'api::commerce.commerce-storefront.accountAddresses',
      config: { auth: false, policies: ['global::storefront-customer'], middlewares: [] },
    },
    {
      method: 'POST',
      path: '/storefront/account/addresses',
      handler: 'api::commerce.commerce-storefront.accountCreateAddress',
      config: { auth: false, policies: ['global::storefront-customer'], middlewares: [] },
    },
    {
      method: 'PATCH',
      path: '/storefront/account/addresses/:id',
      handler: 'api::commerce.commerce-storefront.accountUpdateAddress',
      config: { auth: false, policies: ['global::storefront-customer'], middlewares: [] },
    },
    {
      method: 'DELETE',
      path: '/storefront/account/addresses/:id',
      handler: 'api::commerce.commerce-storefront.accountDeleteAddress',
      config: { auth: false, policies: ['global::storefront-customer'], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/storefront/account/orders',
      handler: 'api::commerce.commerce-storefront.accountOrders',
      config: { auth: false, policies: ['global::storefront-customer'], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/storefront/orders/:id',
      handler: 'api::commerce.commerce-storefront.storefrontOrderById',
      config: { auth: false, policies: ['global::storefront-customer'], middlewares: [] },
    },
    {
      method: 'POST',
      path: '/storefront/checkout/orders',
      handler: 'api::commerce.commerce-storefront.checkoutCreateOrder',
      config: { auth: false, policies: [], middlewares: [] },
    },
  ],
};

export default config;
