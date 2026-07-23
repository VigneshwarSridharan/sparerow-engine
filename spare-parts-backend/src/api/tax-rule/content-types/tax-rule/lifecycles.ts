import { invalidateStorefrontCatalogMetaCache } from '../../../commerce/services/storefront-catalog-meta-cache';

export default {
  async afterCreate() {
    invalidateStorefrontCatalogMetaCache();
  },
  async afterUpdate() {
    invalidateStorefrontCatalogMetaCache();
  },
  async afterDelete() {
    invalidateStorefrontCatalogMetaCache();
  },
};
