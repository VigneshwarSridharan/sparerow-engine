import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::return-request.return-request', {
  except: ['find', 'findOne', 'create', 'update', 'delete'],
});
