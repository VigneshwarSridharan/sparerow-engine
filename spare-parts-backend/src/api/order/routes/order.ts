import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::order.order', {
  except: ['find', 'findOne', 'create', 'update', 'delete'],
});
