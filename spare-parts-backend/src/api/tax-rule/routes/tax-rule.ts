import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::tax-rule.tax-rule', {
  except: ['find', 'findOne', 'create', 'update', 'delete'],
});
