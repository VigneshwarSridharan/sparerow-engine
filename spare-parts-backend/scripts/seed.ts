/**
 * Loads catalog rows from the storefront (`../storefront/src/data/seedData.ts`) so
 * the Strapi DB matches the UI seed file. Part photos are uploaded via Strapi Media
 * Library (same filenames as `storefront/src/lib/partTypeMediaFiles.ts` / `partImages.ts`).
 */
import path from 'path';
import fs from 'fs';
import type { Core } from '@strapi/strapi';
import { createStrapi } from '@strapi/strapi';
import { brands, models, products, partTypes } from '../../storefront/src/data/seedData';
import { mediaFilenameForPartType, PART_TYPE_MEDIA_FILENAME } from '../../storefront/src/lib/partTypeMediaFiles';

function toSlug(value: string, fallback: string): string {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

async function ensurePartImageUploads(
  app: Core.Strapi,
  assetsDir: string
): Promise<(partType: string) => number | undefined> {
  const upload = app.plugin('upload').service('upload');
  const idByFilename = new Map<string, number>();

  const filenames = [...new Set(Object.values(PART_TYPE_MEDIA_FILENAME))];
  for (const basename of filenames) {
    const abs = path.join(assetsDir, basename);
    if (!fs.existsSync(abs)) {
      app.log.warn(`Skipping media upload: missing file ${abs}`);
      continue;
    }
    const stat = fs.statSync(abs);
    const [file] = await upload.upload({
      data: {},
      files: [
        {
          filepath: abs,
          path: abs,
          originalFilename: basename,
          name: basename,
          size: stat.size,
          mimetype: 'image/png',
          type: 'image/png',
        },
      ],
    });
    if (file?.id != null) idByFilename.set(basename, Number(file.id));
  }

  return (partType: string) => idByFilename.get(mediaFilenameForPartType(partType));
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
  const getImageId = await ensurePartImageUploads(app, storefrontParts);

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
    const imageId = getImageId(product.partType);
    await app.db.query('api::product.product').create({
      data: {
        sku: product.sku,
        name: product.name,
        description: product.description,
        ...(imageId != null ? { primaryImage: imageId } : {}),
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
