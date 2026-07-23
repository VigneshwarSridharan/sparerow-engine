export type StorefrontCatalogMeta = {
  brands: Array<Record<string, unknown>>;
  categories: Array<Record<string, unknown>>;
  partTypes: string[];
  promoCodes: Array<Record<string, unknown>>;
  defaultTaxRatePercent: number;
  originStateCode: string;
  maxPriceInMinor: string;
};

const TTL_MS = 60_000;

let cached: { value: StorefrontCatalogMeta; expiresAt: number } | null = null;

export function getCachedStorefrontCatalogMeta(): StorefrontCatalogMeta | null {
  return cached && cached.expiresAt > Date.now() ? cached.value : null;
}

export function setCachedStorefrontCatalogMeta(value: StorefrontCatalogMeta): void {
  cached = { value, expiresAt: Date.now() + TTL_MS };
}

export function invalidateStorefrontCatalogMetaCache(): void {
  cached = null;
}
