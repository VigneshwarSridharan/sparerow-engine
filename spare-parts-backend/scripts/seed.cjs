const path = require('path');
const { createStrapi } = require('@strapi/strapi');

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

  const existing = await app.db.query('api::brand.brand').findOne({ where: { slug: 'acme-parts' } });
  if (existing) {
    app.log.info('Seed skipped: sample brand already exists');
    await app.destroy();
    return;
  }

  const brand = await app.db.query('api::brand.brand').create({
    data: { slug: 'acme-parts', name: 'ACME Parts', isActive: true },
  });

  const model = await app.db.query('api::part-model.part-model').create({
    data: { slug: 'widget-x100', name: 'Widget X100', isActive: true, brand: brand.id },
  });

  const cat = await app.db.query('api::part-category.part-category').create({
    data: { slug: 'filters', name: 'Filters', isActive: true },
  });

  await app.db.query('api::product.product').create({
    data: {
      sku: 'ACME-FILTER-001',
      name: 'Primary Air Filter',
      description: 'OEM-grade intake filter',
      priceInMinor: '249900',
      quantityOnHand: 40,
      quantityReserved: 0,
      isActive: true,
      partModel: model.id,
      partCategory: cat.id,
    },
  });

  await app.db.query('api::cms-block.cms-block').create({
    data: {
      slug: 'home-hero',
      title: 'Genuine spare parts',
      body: 'Fast delivery across India. OEM quality.',
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
