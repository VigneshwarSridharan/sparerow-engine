import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::part-model.part-model', {
  except: ['find', 'findOne', 'create', 'update', 'delete'],
});
