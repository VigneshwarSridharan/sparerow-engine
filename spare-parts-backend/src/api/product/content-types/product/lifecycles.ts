import { assertNonNegativeInt } from '../../../../lib/validators';
import { invalidateStorefrontCatalogMetaCache } from '../../../commerce/services/storefront-catalog-meta-cache';

export default {
  async beforeCreate(event: { params: { data: Record<string, unknown> } }) {
    const { data } = event.params;
    if (data.sku) data.sku = String(data.sku).trim().toUpperCase();
    if (data.quantityOnHand != null) assertNonNegativeInt('quantityOnHand', data.quantityOnHand);
    if (data.quantityReserved != null) assertNonNegativeInt('quantityReserved', data.quantityReserved);
  },
  async beforeUpdate(event: { params: { data: Record<string, unknown> } }) {
    const { data } = event.params;
    if (data.sku) data.sku = String(data.sku).trim().toUpperCase();
    if (data.quantityOnHand != null) assertNonNegativeInt('quantityOnHand', data.quantityOnHand);
    if (data.quantityReserved != null) assertNonNegativeInt('quantityReserved', data.quantityReserved);
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
