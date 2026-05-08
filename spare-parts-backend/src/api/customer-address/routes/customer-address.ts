import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::customer-address.customer-address', {
  except: ['find', 'findOne', 'create', 'update', 'delete'],
});
