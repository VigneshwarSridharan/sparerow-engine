import type { Core } from '@strapi/strapi';

export default ({ env }: Core.Config.Shared.ConfigParams) => ({
  jwtSecret: env('CUSTOMER_JWT_SECRET', env('JWT_SECRET')),
  storefrontUrl: env('STOREFRONT_URL', 'http://localhost:4000'),
});
