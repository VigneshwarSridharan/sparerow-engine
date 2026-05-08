import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::cms-block.cms-block', {
  except: ['find', 'findOne', 'create', 'update', 'delete'],
});
