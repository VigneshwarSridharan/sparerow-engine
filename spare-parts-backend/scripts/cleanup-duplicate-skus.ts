/**
 * One-off cleanup for duplicate Product rows created by earlier (buggy) runs of
 * seed-products.ts, before it uppercased sku to match product/lifecycles.ts's
 * beforeCreate/beforeUpdate normalization. Keeps the highest-id (most recent) row
 * per sku, deletes the rest via db.query so relation link rows are cleaned up too.
 */
import path from 'path';
import { createStrapi } from '@strapi/strapi';

async function main() {
  const appDir = process.cwd();
  const distDir = path.join(appDir, 'dist');
  const app = createStrapi({ appDir, distDir, autoReload: false, serveAdminPanel: false });
  await app.load();

  const all = await app.db.query('api::product.product').findMany({
    select: ['id', 'sku'],
    orderBy: { id: 'asc' },
  });

  const bySku = new Map<string, number[]>();
  for (const p of all as { id: number; sku: string }[]) {
    const list = bySku.get(p.sku) || [];
    list.push(p.id);
    bySku.set(p.sku, list);
  }

  let deleted = 0;
  let dupSkus = 0;
  for (const [sku, ids] of bySku) {
    if (ids.length <= 1) continue;
    dupSkus += 1;
    const keepId = Math.max(...ids);
    const toDelete = ids.filter((id) => id !== keepId);
    for (const id of toDelete) {
      await app.db.query('api::product.product').delete({ where: { id } });
      deleted += 1;
    }
    if (dupSkus % 100 === 0) app.log.info(`Cleaned ${dupSkus} duplicate SKU groups so far...`);
  }

  app.log.info(`Cleanup done: ${dupSkus} duplicate SKU groups, ${deleted} rows deleted.`);
  await app.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
