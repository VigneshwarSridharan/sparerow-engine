import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::product-review.product-review', {
  except: ['find', 'findOne', 'create', 'update', 'delete'],
});
