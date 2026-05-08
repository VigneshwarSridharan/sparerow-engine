import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::customer-account.customer-account', {
  except: ['find', 'findOne', 'create', 'update', 'delete'],
});
