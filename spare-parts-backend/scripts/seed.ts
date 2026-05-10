/**
 * Loads catalog rows from the storefront app (`../storefront/src/data/seedData.ts`) so
 * the Strapi database stays aligned with the UI seed file. Part images are copied from
 * `storefront/src/assets/parts` into `public/parts` and `primaryImageUrl` matches
 * `storefront/src/lib/partImages.ts` via `src/lib/part-image-paths.ts`.
 */
import path from 'path';
import fs from 'fs';
import { createStrapi } from '@strapi/strapi';
import { brands, models, products, partTypes } from '../../storefront/src/data/seedData';
import { primaryImagePathForPartType } from '../src/lib/part-image-paths';

function toSlug(value: string, fallback: string): string {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

async function main() {
  const appDir = process.cwd();
  const distDir = path.join(appDir, 'dist');
  const app = createStrapi({
    appDir,
    distDir,
    autoReload: false,
    serveAdminPanel: false,
  });
  await app.load();

  const storefrontParts = path.join(appDir, '..', 'storefront', 'src', 'assets', 'parts');
  const publicParts = path.join(appDir, 'public', 'parts');
  if (fs.existsSync(storefrontParts)) {
    fs.mkdirSync(publicParts, { recursive: true });
    fs.cpSync(storefrontParts, publicParts, { recursive: true });
    app.log.info(`Synced part images from storefront into ${publicParts}`);
  } else {
    app.log.warn(`Storefront parts assets not found at ${storefrontParts}; primary images may 404 until assets exist`);
  }

  const existing = await app.db.query('api::product.product').findOne({ where: { sku: products[0]?.sku } });
  if (existing) {
    app.log.info('Seed skipped: dataset already loaded');
    await app.destroy();
    return;
  }

  const brandBySeedId = new Map<string, number>();
  for (const brand of brands) {
    const brandSlug = toSlug(brand.slug, `brand-${brand.id}`);
    const created = await app.db.query('api::brand.brand').create({
      data: { slug: brandSlug, name: brand.name, isActive: true },
    });
    brandBySeedId.set(brand.id, created.id as number);
  }

  const modelBySeedId = new Map<string, number>();
  for (const model of models) {
    const brandId = brandBySeedId.get(model.brandId);
    if (!brandId) continue;
    const modelSlug = toSlug(model.slug, `${toSlug(model.name, 'model')}-${model.id}`);
    const created = await app.db.query('api::part-model.part-model').create({
      data: { slug: modelSlug, name: model.name, isActive: true, brand: brandId },
    });
    modelBySeedId.set(model.id, created.id as number);
  }

  const categoryByName = new Map<string, number>();
  for (const partType of partTypes) {
    const slug = toSlug(partType, 'other');
    const created = await app.db.query('api::part-category.part-category').create({
      data: { slug: slug || 'other', name: partType || 'Other', isActive: true },
    });
    categoryByName.set(partType, created.id as number);
  }

  for (const product of products) {
    const partModel = modelBySeedId.get(product.modelId);
    const partCategory = categoryByName.get(product.partType);
    if (!partModel || !partCategory) continue;
    await app.db.query('api::product.product').create({
      data: {
        sku: product.sku,
        name: product.name,
        description: product.description,
        primaryImageUrl: primaryImagePathForPartType(product.partType),
        priceInMinor: String(Math.round((product.discountPrice || product.price || 0) * 100)),
        quantityOnHand: product.inStock ? product.stockQty ?? 0 : 0,
        quantityReserved: 0,
        isActive: product.inStock !== false,
        partModel,
        partCategory,
      },
    });
  }

  await app.db.query('api::cms-block.cms-block').create({
    data: {
      slug: 'home-hero',
      title: 'Catalog loaded',
      body: `Seeded ${brands.length} brands, ${models.length} models, ${products.length} products`,
      imageUrl: 'https://example.com/hero.jpg',
      isActive: true,
    },
  });

  app.log.info('Seed completed');
  await app.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
