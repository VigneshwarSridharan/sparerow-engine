import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::brand.brand', {
  except: ['find', 'findOne', 'create', 'update', 'delete'],
});
