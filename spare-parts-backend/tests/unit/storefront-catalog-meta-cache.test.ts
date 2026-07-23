import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  getCachedStorefrontCatalogMeta,
  setCachedStorefrontCatalogMeta,
  invalidateStorefrontCatalogMetaCache,
  type StorefrontCatalogMeta,
} from '../../src/api/commerce/services/storefront-catalog-meta-cache';

const SAMPLE: StorefrontCatalogMeta = {
  brands: [{ id: 1, name: 'Acme' }],
  categories: [{ id: 1, name: 'Screens' }],
  partTypes: ['Screens'],
  promoCodes: [],
  defaultTaxRatePercent: 18,
  originStateCode: 'KA',
  maxPriceInMinor: '100000',
};

describe('storefront-catalog-meta-cache', () => {
  beforeEach(() => {
    invalidateStorefrontCatalogMetaCache();
  });

  afterEach(() => {
    vi.useRealTimers();
    invalidateStorefrontCatalogMetaCache();
  });

  it('returns null when nothing has been cached', () => {
    expect(getCachedStorefrontCatalogMeta()).toBeNull();
  });

  it('returns the cached value before it expires', () => {
    setCachedStorefrontCatalogMeta(SAMPLE);
    expect(getCachedStorefrontCatalogMeta()).toEqual(SAMPLE);
  });

  it('returns null after invalidation', () => {
    setCachedStorefrontCatalogMeta(SAMPLE);
    invalidateStorefrontCatalogMetaCache();
    expect(getCachedStorefrontCatalogMeta()).toBeNull();
  });

  it('returns null once the TTL has elapsed', () => {
    vi.useFakeTimers();
    setCachedStorefrontCatalogMeta(SAMPLE);
    expect(getCachedStorefrontCatalogMeta()).toEqual(SAMPLE);
    vi.advanceTimersByTime(60_001);
    expect(getCachedStorefrontCatalogMeta()).toBeNull();
  });
});
