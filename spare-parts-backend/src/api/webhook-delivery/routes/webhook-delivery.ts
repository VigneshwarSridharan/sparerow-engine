import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::webhook-delivery.webhook-delivery', {
  except: ['find', 'findOne', 'create', 'update', 'delete'],
});
