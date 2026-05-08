import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::order-line-item.order-line-item', {
  except: ['find', 'findOne', 'create', 'update', 'delete'],
});
