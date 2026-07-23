import { SLUG_REGEX } from '../../../../lib/validators';
import { invalidateStorefrontCatalogMetaCache } from '../../../commerce/services/storefront-catalog-meta-cache';

export default {
  async beforeCreate(event: { params: { data: Record<string, unknown> } }) {
    const { data } = event.params;
    if (data.slug) {
      data.slug = String(data.slug).trim().toLowerCase();
      if (!SLUG_REGEX.test(data.slug as string)) throw new Error('INVALID_SLUG');
    }
  },
  async beforeUpdate(event: { params: { data: Record<string, unknown> } }) {
    const { data } = event.params;
    if (data.slug) {
      data.slug = String(data.slug).trim().toLowerCase();
      if (!SLUG_REGEX.test(data.slug as string)) throw new Error('INVALID_SLUG');
    }
  },
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
