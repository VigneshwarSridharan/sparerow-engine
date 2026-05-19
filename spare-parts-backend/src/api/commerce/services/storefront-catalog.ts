import type { Core } from '@strapi/strapi';
import { AppError } from '../../../lib/errors';
import { availableToSell, assertSlug } from '../../../lib/validators';

function resolveMediaUrl(strapi: Core.Strapi, raw: unknown): string | null {
  if (!raw || typeof raw !== 'object' || !('url' in raw)) return null;
  const url = (raw as { url: unknown }).url;
  if (typeof url !== 'string') return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = String(strapi.config.get('server.url') ?? '').replace(/\/+$/, '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
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

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async listBrands() {
    return strapi.db.query('api::brand.brand').findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: ['id', 'documentId', 'slug', 'name', 'isActive'],
    });
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
    });
    const serialized = products.map((row) => serializeProduct(strapi, row as unknown as Record<string, unknown>));
    if (filters?.inStockOnly) {
      return serialized.filter((product) => Number(product.availableToSell) > 0);
    }
    return serialized;
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
