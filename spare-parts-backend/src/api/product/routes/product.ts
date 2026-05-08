import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::product.product', {
  except: ['find', 'findOne', 'create', 'update', 'delete'],
});
