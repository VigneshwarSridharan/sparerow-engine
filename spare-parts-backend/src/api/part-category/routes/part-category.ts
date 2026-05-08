import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::part-category.part-category', {
  except: ['find', 'findOne', 'create', 'update', 'delete'],
});
