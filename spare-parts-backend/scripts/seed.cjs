const path = require('path');
const { createStrapi } = require('@strapi/strapi');
const { brands, models, products, partTypes } = require('./seed-data.cjs');

function toSlug(value, fallback) {
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

  const existing = await app.db.query('api::product.product').findOne({ where: { sku: products[0]?.sku } });
  if (existing) {
    app.log.info('Seed skipped: dataset already loaded');
    await app.destroy();
    return;
  }

  const brandBySeedId = new Map();
  for (const brand of brands) {
    const brandSlug = toSlug(brand.slug, `brand-${brand.id}`);
    const created = await app.db.query('api::brand.brand').create({
      data: { slug: brandSlug, name: brand.name, isActive: true },
    });
    brandBySeedId.set(brand.id, created.id);
  }

  const modelBySeedId = new Map();
  for (const model of models) {
    const brandId = brandBySeedId.get(model.brandId);
    if (!brandId) continue;
    const modelSlug = toSlug(model.slug, `${toSlug(model.name, 'model')}-${model.id}`);
    const created = await app.db.query('api::part-model.part-model').create({
      data: { slug: modelSlug, name: model.name, isActive: true, brand: brandId },
    });
    modelBySeedId.set(model.id, created.id);
  }

  const categoryByName = new Map();
  for (const partType of partTypes) {
    const slug = toSlug(partType, 'other');
    const created = await app.db.query('api::part-category.part-category').create({
      data: { slug: slug || 'other', name: partType || 'Other', isActive: true },
    });
    categoryByName.set(partType, created.id);
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
