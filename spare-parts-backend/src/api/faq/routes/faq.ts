import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::faq.faq', {
  except: ['find', 'findOne', 'create', 'update', 'delete'],
});
