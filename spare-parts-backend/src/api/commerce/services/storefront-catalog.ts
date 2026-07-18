import type { Core } from '@strapi/strapi';
import { AppError } from '../../../lib/errors';
import { availableToSell, assertSlug } from '../../../lib/validators';
import { computeProductUiFlags } from '../../../lib/product-ui-flags';

function resolveMediaUrl(strapi: Core.Strapi, raw: unknown): string | null {
  if (!raw || typeof raw !== 'object' || !('url' in raw)) return null;
  const url = (raw as { url: unknown }).url;
  if (typeof url !== 'string') return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = String(strapi.config.get('server.url') ?? '').replace(/\/+$/, '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}


function serializeBrand(strapi: Core.Strapi, b: Record<string, unknown>) {
  return {
    id: b.id,
    documentId: b.documentId,
    slug: b.slug,
    name: b.name,
    isActive: b.isActive,
    logoUrl: resolveMediaUrl(strapi, b.logo),
  };
}


function serializeVariant(strapi: Core.Strapi, v: Record<string, unknown>) {
  const onHand = Number(v.quantityOnHand ?? 0);
  const reserved = Number(v.quantityReserved ?? 0);
  return {
    id: v.id,
    sku: v.sku,
    attributes: v.attributes ? JSON.stringify(v.attributes) : '{}',
    priceInMinor: String(v.priceInMinor ?? '0'),
    quantityOnHand: onHand,
    quantityReserved: reserved,
    availableToSell: availableToSell(onHand, reserved),
    imageUrl: resolveMediaUrl(strapi, v.image),
    isActive: v.isActive,
  };
}


function serializeProduct(strapi: Core.Strapi, p: Record<string, unknown>) {
  const onHand = Number(p.quantityOnHand ?? 0);
  const reserved = Number(p.quantityReserved ?? 0);
  const primaryImageUrl = resolveMediaUrl(strapi, p.primaryImage);
  const imageUrls: string[] = Array.isArray(p.images)
    ? (p.images as unknown[]).map((img) => resolveMediaUrl(strapi, img)).filter((u): u is string => u !== null)
    : [];
  const variants = Array.isArray(p.variants)
    ? (p.variants as unknown[])
        .filter((v): v is Record<string, unknown> => !!v && typeof v === 'object')
        .filter((v) => v.isActive !== false)
        .map((v) => serializeVariant(strapi, v))
    : [];
  return {
    id: p.id,
    documentId: p.documentId,
    sku: p.sku,
    name: p.name,
    description: p.description,
    primaryImageUrl,
    imageUrls,
    priceInMinor: String(p.priceInMinor ?? '0'),
    quantityOnHand: onHand,
    quantityReserved: reserved,
    availableToSell: availableToSell(onHand, reserved),
    isActive: p.isActive,
    partModel: p.partModel,
    partCategory: p.partCategory,
    variants,
  };
}

const PRODUCT_CARD_POPULATE = {
  partCategory: true,
  primaryImage: true,
  images: true,
  partModel: { populate: { brand: true } },
  variants: { populate: ['image'] },
};

/** Ranks products by the featured/bestSeller UI heuristic without joining category/brand/image/variant data for the whole catalog: scans only scalar columns, then hydrates just the winners. */
async function rankProductsByFlag(strapi: Core.Strapi, flag: 'featured' | 'bestSeller', limit: number) {
  const candidates = await strapi.db.query('api::product.product').findMany({
    where: { isActive: true },
    select: ['id', 'sku', 'quantityOnHand', 'quantityReserved'],
  });
  const reviewService = strapi.service('api::commerce.storefront-reviews') as {
    getBulkAggregates: (ids: number[]) => Promise<Map<number, { averageRating: number; reviewCount: number }>>;
  };
  const reviewAggregates = await reviewService.getBulkAggregates(candidates.map((c) => Number(c.id)));

  const ranked = candidates
    .map((c) => {
      const onHand = Number(c.quantityOnHand ?? 0);
      const reserved = Number(c.quantityReserved ?? 0);
      const qty = availableToSell(onHand, reserved);
      const flags = computeProductUiFlags(String(c.sku || ''), qty, reviewAggregates.get(Number(c.id)));
      return { id: c.id, reviewCount: flags.reviewCount, matches: flags[flag] };
    })
    .filter((c) => c.matches)
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, limit);

  if (ranked.length === 0) return [];

  const rows = await strapi.db.query('api::product.product').findMany({
    where: { id: { $in: ranked.map((r) => r.id) }, isActive: true },
    populate: PRODUCT_CARD_POPULATE,
  });
  const order = new Map(ranked.map((r, i) => [String(r.id), i]));
  return rows
    .map((row) => serializeProduct(strapi, row as unknown as Record<string, unknown>))
    .sort((a, b) => (order.get(String(a.id)) ?? 0) - (order.get(String(b.id)) ?? 0));
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async listBrands() {
    const brands = await strapi.db.query('api::brand.brand').findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: ['id', 'documentId', 'slug', 'name', 'isActive'],
      populate: { logo: true },
    });
    return brands.map((brand) => serializeBrand(strapi, brand as unknown as Record<string, unknown>));
  },

  /** Brands with productCount computed via one indexed count query per brand, instead of scanning every product. */
  async listBrandsWithCounts() {
    const brands = await strapi.db.query('api::brand.brand').findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: ['id', 'documentId', 'slug', 'name', 'isActive'],
      populate: { logo: true },
    });
    const counts = await Promise.all(
      brands.map((brand) =>
        strapi.db.query('api::product.product').count({
          where: { partModel: { brand: brand.id }, isActive: true },
        })
      )
    );
    return brands.map((brand, i) => ({
      ...serializeBrand(strapi, brand as unknown as Record<string, unknown>),
      productCount: counts[i],
    }));
  },

  /** Categories with productCount computed via one indexed count query per category, instead of scanning every product. */
  async listCategoriesWithCounts() {
    const categories = await strapi.db.query('api::part-category.part-category').findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: ['id', 'documentId', 'slug', 'name', 'isActive'],
    });
    const counts = await Promise.all(
      categories.map((category) =>
        strapi.db.query('api::product.product').count({
          where: { partCategory: category.id, isActive: true },
        })
      )
    );
    return categories.map((category, i) => ({ ...category, productCount: counts[i] }));
  },

  /** Models for one brand with productCount, scoped to that brand's (small) model list — never scans the full catalog. */
  async listModelsWithCounts(brandSlug: string) {
    assertSlug('brandSlug', brandSlug);
    const brand = await strapi.db.query('api::brand.brand').findOne({
      where: { slug: brandSlug, isActive: true },
    });
    if (!brand) throw new AppError(404, 'BRAND_NOT_FOUND', 'Brand not found');
    const models = await strapi.db.query('api::part-model.part-model').findMany({
      where: { brand: brand.id, isActive: true },
      orderBy: { name: 'asc' },
      select: ['id', 'documentId', 'slug', 'name', 'isActive'],
    });
    const counts = await Promise.all(
      models.map((model) =>
        strapi.db.query('api::product.product').count({
          where: { partModel: model.id, isActive: true },
        })
      )
    );
    return models.map((model, i) => ({
      ...model,
      brandId: brand.id,
      brandSlug: brand.slug,
      productCount: counts[i],
    }));
  },

  async listModels(brandSlug: string) {
    assertSlug('brandSlug', brandSlug);
    const brand = await strapi.db.query('api::brand.brand').findOne({
      where: { slug: brandSlug, isActive: true },
    });
    if (!brand) throw new AppError(404, 'BRAND_NOT_FOUND', 'Brand not found');
    return strapi.db.query('api::part-model.part-model').findMany({
      where: { brand: brand.id, isActive: true },
      orderBy: { name: 'asc' },
      select: ['id', 'documentId', 'slug', 'name', 'isActive'],
    });
  },

  async listAllModels() {
    return strapi.db.query('api::part-model.part-model').findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      populate: ['brand'],
      select: ['id', 'documentId', 'slug', 'name', 'isActive'],
    });
  },

  async listProducts(brandSlug: string, modelSlug: string) {
    assertSlug('brandSlug', brandSlug);
    assertSlug('modelSlug', modelSlug);
    const brand = await strapi.db.query('api::brand.brand').findOne({
      where: { slug: brandSlug, isActive: true },
    });
    if (!brand) throw new AppError(404, 'BRAND_NOT_FOUND', 'Brand not found');
    const model = await strapi.db.query('api::part-model.part-model').findOne({
      where: { slug: modelSlug, brand: brand.id, isActive: true },
    });
    if (!model) throw new AppError(404, 'MODEL_NOT_FOUND', 'Model not found');
    const products = await strapi.db.query('api::product.product').findMany({
      where: { partModel: model.id, isActive: true },
      populate: { partCategory: true, primaryImage: true, images: true, variants: { populate: ['image'] } },
      orderBy: { name: 'asc' },
    });
    return products.map((row) => serializeProduct(strapi, row as unknown as Record<string, unknown>));
  },

  async listCategories() {
    return strapi.db.query('api::part-category.part-category').findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: ['id', 'documentId', 'slug', 'name', 'isActive'],
    });
  },

  async listAllProducts(filters?: {
    brandSlug?: string;
    modelSlug?: string;
    categorySlug?: string;
    search?: string;
    inStockOnly?: boolean;
    ids?: Array<string | number>;
    skus?: string[];
    limit?: number;
    offset?: number;
  }) {
    const where: Record<string, unknown> = { isActive: true };
    if (filters?.brandSlug) {
      assertSlug('brandSlug', filters.brandSlug);
      const brand = await strapi.db.query('api::brand.brand').findOne({
        where: { slug: filters.brandSlug, isActive: true },
      });
      if (!brand) throw new AppError(404, 'BRAND_NOT_FOUND', 'Brand not found');
      where.partModel = { brand: brand.id };
    }
    if (filters?.modelSlug) {
      assertSlug('modelSlug', filters.modelSlug);
      const model = await strapi.db.query('api::part-model.part-model').findOne({
        where: { slug: filters.modelSlug, isActive: true },
      });
      if (!model) throw new AppError(404, 'MODEL_NOT_FOUND', 'Model not found');
      where.partModel = model.id;
    }
    if (filters?.categorySlug) {
      assertSlug('categorySlug', filters.categorySlug);
      const category = await strapi.db.query('api::part-category.part-category').findOne({
        where: { slug: filters.categorySlug, isActive: true },
      });
      if (!category) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
      where.partCategory = category.id;
    }
    if (filters?.search) {
      const q = String(filters.search).trim();
      if (q.length > 0) {
        where.$or = [
          { name: { $containsi: q } },
          { sku: { $containsi: q } },
          { description: { $containsi: q } },
        ];
      }
    }
    if (filters?.inStockOnly) {
      where.quantityOnHand = { $gt: 0 };
    }
    if (filters?.ids?.length) {
      where.id = { $in: filters.ids.map(Number).filter((n) => Number.isFinite(n)) };
    }
    if (filters?.skus?.length) {
      where.sku = { $in: filters.skus };
    }

    const limit = filters?.limit ? Math.min(Math.max(Number(filters.limit) || 0, 1), 80) : undefined;
    const offset = limit && filters?.offset ? Math.max(Number(filters.offset) || 0, 0) : undefined;

    const products = await strapi.db.query('api::product.product').findMany({
      where,
      populate: {
        partCategory: true,
        primaryImage: true,
        images: true,
        partModel: { populate: { brand: true } },
        variants: { populate: ['image'] },
      },
      orderBy: { name: 'asc' },
      ...(limit ? { limit } : {}),
      ...(offset ? { offset } : {}),
    });
    const serialized = products.map((row) => serializeProduct(strapi, row as unknown as Record<string, unknown>));
    if (filters?.inStockOnly) {
      return serialized.filter((product) => Number(product.availableToSell) > 0);
    }
    return serialized;
  },

  /** Product/model/brand/category counts via one lightweight scan (id + relation ids only) — never hydrates images/variants/description for the whole catalog. */
  async listCatalogCounts() {
    const rows = await strapi.db.query('api::product.product').findMany({
      where: { isActive: true },
      select: ['id'],
      populate: {
        partModel: { select: ['id'], populate: { brand: { select: ['id'] } } },
        partCategory: { select: ['id'] },
      },
    });
    const brandCounts = new Map<string, number>();
    const modelCounts = new Map<string, number>();
    const categoryCounts = new Map<string, number>();
    for (const row of rows) {
      const model = row.partModel as Record<string, unknown> | null | undefined;
      const category = row.partCategory as Record<string, unknown> | null | undefined;
      const brand = model?.brand as Record<string, unknown> | null | undefined;
      if (model?.id) modelCounts.set(String(model.id), (modelCounts.get(String(model.id)) || 0) + 1);
      if (brand?.id) brandCounts.set(String(brand.id), (brandCounts.get(String(brand.id)) || 0) + 1);
      if (category?.id) categoryCounts.set(String(category.id), (categoryCounts.get(String(category.id)) || 0) + 1);
    }
    return { brandCounts, modelCounts, categoryCounts };
  },

  /** Single indexed max() lookup — for the price-range slider bound, never scans the full catalog. */
  async getMaxPriceInMinor() {
    const [top] = await strapi.db.query('api::product.product').findMany({
      where: { isActive: true },
      select: ['priceInMinor'],
      orderBy: { priceInMinor: 'desc' },
      limit: 1,
    });
    return Number(top?.priceInMinor ?? 0);
  },

  /** Ordered by createdAt, so no full-catalog heuristic scan is needed — directly indexable. */
  async listNewArrivalProducts(limit: number) {
    const products = await strapi.db.query('api::product.product').findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      limit,
      populate: PRODUCT_CARD_POPULATE,
    });
    return products.map((row) => serializeProduct(strapi, row as unknown as Record<string, unknown>));
  },

  async listFeaturedProducts(limit: number) {
    return rankProductsByFlag(strapi, 'featured', limit);
  },

  async listBestSellerProducts(limit: number) {
    return rankProductsByFlag(strapi, 'bestSeller', limit);
  },

  async getProductByBrandModelSku(brandSlug: string, modelSlug: string, sku: string) {
    assertSlug('brandSlug', brandSlug);
    assertSlug('modelSlug', modelSlug);
    const brand = await strapi.db.query('api::brand.brand').findOne({
      where: { slug: brandSlug, isActive: true },
    });
    if (!brand) throw new AppError(404, 'BRAND_NOT_FOUND', 'Brand not found');
    const model = await strapi.db.query('api::part-model.part-model').findOne({
      where: { slug: modelSlug, brand: brand.id, isActive: true },
    });
    if (!model) throw new AppError(404, 'MODEL_NOT_FOUND', 'Model not found');
    const normalized = String(sku).trim().toUpperCase();
    const p = await strapi.db.query('api::product.product').findOne({
      where: { sku: normalized, partModel: model.id, isActive: true },
      populate: { partCategory: true, primaryImage: true, images: true, variants: { populate: ['image'] } },
    });
    if (!p) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    return serializeProduct(strapi, p as unknown as Record<string, unknown>);
  },

  async getProductBySku(sku: string) {
    const normalized = String(sku).trim().toUpperCase();
    const p = await strapi.db.query('api::product.product').findOne({
      where: { sku: normalized, isActive: true },
      populate: { partModel: true, partCategory: true, primaryImage: true, images: true, variants: { populate: ['image'] } },
    });
    if (!p) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    return serializeProduct(strapi, p as unknown as Record<string, unknown>);
  },

  async getCmsBlock(slug: string) {
    assertSlug('slug', slug);
    const block = await strapi.db.query('api::cms-block.cms-block').findOne({
      where: { slug, isActive: true },
    });
    if (!block) throw new AppError(404, 'CMS_BLOCK_NOT_FOUND', 'CMS block not found');
    return block;
  },
});
