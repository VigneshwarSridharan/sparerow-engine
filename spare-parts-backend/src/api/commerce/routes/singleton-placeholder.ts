import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::commerce.singleton-placeholder', {
  except: ['find', 'findOne', 'create', 'update', 'delete'],
});
