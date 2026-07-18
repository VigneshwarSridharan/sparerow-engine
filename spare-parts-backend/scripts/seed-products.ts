/**
 * Imports the legacy billing-software export (../exported_items_11_025_2026.xls) into
 * Product/Brand/PartModel/PartCategory. Safe to re-run — upserts by sku/slug.
 *
 * Usage:
 *   yarn seed:products -- --dry-run   # parse only, write a review CSV, no DB/Strapi boot
 *   yarn seed:products                # real import (requires `yarn build` to have run)
 */
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import type { Core } from '@strapi/strapi';
import { createStrapi } from '@strapi/strapi';
import { parseItemName } from './lib/parse-item-name';
import { slugify } from './lib/product-import-taxonomy';

interface SourceRow {
  'Item Code'?: string;
  'Item Name': string;
  'Sale Price'?: number;
  'Online Store Price'?: number;
  'Current Stock Quantity'?: number;
}

interface ProcessedRow {
  rowIndex: number;
  itemName: string;
  sku: string;
  priceInMinor: number;
  quantityOnHand: number;
  isActive: boolean;
  categorySlug: string;
  categoryName: string;
  isHouseBrand: boolean;
  models: { brandSlug: string; brandName: string; modelSlug: string; modelName: string }[];
  warnings: string[];
}

function loadRows(xlsPath: string): SourceRow[] {
  const workbook = XLSX.readFile(xlsPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<SourceRow>(sheet, { defval: null });
}

function processRows(rows: SourceRow[]): ProcessedRow[] {
  const usedSkus = new Set<string>();
  const processed: ProcessedRow[] = [];

  rows.forEach((row, i) => {
    const rawItemName = String(row['Item Name'] || '').trim();
    if (!rawItemName) return;
    // `name` is a varchar(255) column; a handful of rows (compatibility lists with 30+
    // models) exceed that. Truncate for storage, keep the full text only for parsing.
    const itemName = rawItemName.length > 255 ? `${rawItemName.slice(0, 252)}...` : rawItemName;

    // product/lifecycles.ts uppercases sku on every create/update — generate it
    // pre-uppercased so findOne-by-sku matches on re-runs instead of creating duplicates.
    const itemCode = row['Item Code'] != null ? String(row['Item Code']).trim() : '';
    let sku: string;
    if (itemCode) {
      sku = itemCode.toUpperCase();
    } else {
      const base = slugify(rawItemName, `row-${i}`).slice(0, 60).toUpperCase();
      sku = base;
      let suffix = 2;
      while (usedSkus.has(sku)) {
        sku = `${base}-${suffix}`;
        suffix += 1;
      }
    }
    usedSkus.add(sku);

    const rawPrice = Number(row['Online Store Price']) || Number(row['Sale Price']) || 0;
    const priceInMinor = Math.round(rawPrice * 100);
    // Source POS data has 1 row with -1 (oversold/backordered) — clamp to 0.
    const quantityOnHand = Math.max(0, Number(row['Current Stock Quantity']) || 0);

    const parsed = parseItemName(rawItemName);
    // StorefrontProduct.modelId/brandId are non-nullable in the GraphQL SDL — a product
    // with no detected model would break the whole storefrontProducts query. Fall back
    // to a generic brand/model for accessories that genuinely don't fit one phone model.
    const models =
      parsed.models.length > 0
        ? parsed.models
        : [{ brandSlug: 'generic', brandName: 'Generic', modelSlug: 'universal', modelName: 'Universal' }];

    processed.push({
      rowIndex: i,
      itemName,
      sku,
      priceInMinor,
      quantityOnHand,
      isActive: priceInMinor > 0,
      categorySlug: parsed.categorySlug,
      categoryName: parsed.categoryName,
      isHouseBrand: parsed.isHouseBrand,
      models,
      warnings: parsed.warnings,
    });
  });

  return processed;
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function writeReviewCsv(outPath: string, rows: ProcessedRow[]) {
  const header = ['rowIndex', 'itemName', 'sku', 'priceInMinor', 'quantityOnHand', 'category', 'models', 'warnings'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [
        String(r.rowIndex),
        csvEscape(r.itemName),
        csvEscape(r.sku),
        String(r.priceInMinor),
        String(r.quantityOnHand),
        csvEscape(r.categoryName),
        csvEscape(r.models.map((m) => `${m.brandName} ${m.modelName}`).join(' | ')),
        csvEscape(r.warnings.join(' | ')),
      ].join(',')
    );
  }
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
}

function printSummary(rows: ProcessedRow[]) {
  const total = rows.length;
  const noCategory = rows.filter((r) => r.categorySlug === 'uncategorized').length;
  const noModel = rows.filter((r) => r.models.length === 0 && !r.isHouseBrand).length;
  const houseBrand = rows.filter((r) => r.isHouseBrand).length;
  const zeroPrice = rows.filter((r) => r.priceInMinor === 0).length;
  const multiModel = rows.filter((r) => r.models.length > 1).length;

  console.log('--- Import dry-run summary ---');
  console.log(`Total rows parsed: ${total}`);
  console.log(`No category matched (Uncategorized): ${noCategory} (${((noCategory / total) * 100).toFixed(1)}%)`);
  console.log(`No model/brand detected: ${noModel} (${((noModel / total) * 100).toFixed(1)}%)`);
  console.log(`House-brand generic accessories: ${houseBrand}`);
  console.log(`Multi-model compatibility rows: ${multiModel}`);
  console.log(`Zero-price rows (will be set inactive): ${zeroPrice}`);

  const categoryCounts = new Map<string, number>();
  for (const r of rows) categoryCounts.set(r.categoryName, (categoryCounts.get(r.categoryName) || 0) + 1);
  const topCategories = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  console.log('\nTop categories:');
  for (const [name, count] of topCategories) console.log(`  ${name}: ${count}`);

  const brandCounts = new Map<string, number>();
  for (const r of rows) {
    const brand = r.models[0]?.brandName || (r.isHouseBrand ? '(house brand)' : '(none)');
    brandCounts.set(brand, (brandCounts.get(brand) || 0) + 1);
  }
  const topBrands = [...brandCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  console.log('\nTop brands (primary model):');
  for (const [name, count] of topBrands) console.log(`  ${name}: ${count}`);
}

async function upsertProducts(app: Core.Strapi, rows: ProcessedRow[]) {
  const brandIdBySlug = new Map<string, number>();
  const categoryIdBySlug = new Map<string, number>();
  const modelIdByKey = new Map<string, number>(); // key: `${brandSlug}::${modelSlug}`

  async function getBrandId(slug: string, name: string): Promise<number> {
    if (brandIdBySlug.has(slug)) return brandIdBySlug.get(slug)!;
    const existing = await app.db.query('api::brand.brand').findOne({ where: { slug } });
    const id = existing ? existing.id : (await app.db.query('api::brand.brand').create({ data: { slug, name, isActive: true } })).id;
    brandIdBySlug.set(slug, id as number);
    return id as number;
  }

  async function getCategoryId(slug: string, name: string): Promise<number> {
    if (categoryIdBySlug.has(slug)) return categoryIdBySlug.get(slug)!;
    const existing = await app.db.query('api::part-category.part-category').findOne({ where: { slug } });
    const id = existing
      ? existing.id
      : (await app.db.query('api::part-category.part-category').create({ data: { slug, name, isActive: true } })).id;
    categoryIdBySlug.set(slug, id as number);
    return id as number;
  }

  async function getModelId(brandSlug: string, brandName: string, modelSlug: string, modelName: string): Promise<number> {
    const compositeSlug = `${brandSlug}-${modelSlug}`;
    const key = `${brandSlug}::${modelSlug}`;
    if (modelIdByKey.has(key)) return modelIdByKey.get(key)!;
    const brandId = await getBrandId(brandSlug, brandName);
    const existing = await app.db.query('api::part-model.part-model').findOne({ where: { slug: compositeSlug } });
    const id = existing
      ? existing.id
      : (
          await app.db.query('api::part-model.part-model').create({
            data: { slug: compositeSlug, name: modelName, isActive: true, brand: brandId },
          })
        ).id;
    modelIdByKey.set(key, id as number);
    return id as number;
  }

  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const categoryId = await getCategoryId(row.categorySlug, row.categoryName);
    const modelIds: number[] = [];
    for (const m of row.models) {
      modelIds.push(await getModelId(m.brandSlug, m.brandName, m.modelSlug, m.modelName));
    }

    const data = {
      name: row.itemName,
      priceInMinor: String(row.priceInMinor),
      quantityOnHand: row.quantityOnHand,
      quantityReserved: 0,
      isActive: row.isActive,
      partCategory: categoryId,
      ...(modelIds.length > 0 ? { partModel: modelIds[0], compatibleModels: modelIds } : {}),
    };

    const existing = await app.db.query('api::product.product').findOne({ where: { sku: row.sku } });
    if (existing) {
      await app.db.query('api::product.product').update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await app.db.query('api::product.product').create({ data: { sku: row.sku, ...data } });
      created += 1;
    }

    if ((created + updated) % 250 === 0) {
      app.log.info(`Progress: ${created + updated}/${rows.length} (created ${created}, updated ${updated})`);
    }
  }

  app.log.info(`Product import done: ${created} created, ${updated} updated.`);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const appDir = process.cwd();
  const xlsPath = path.join(appDir, '..', 'exported_items_11_025_2026.xls');

  const rows = loadRows(xlsPath);
  const processed = processRows(rows);

  const tmpDir = path.join(appDir, '.tmp');
  fs.mkdirSync(tmpDir, { recursive: true });
  const csvOutPath = path.join(tmpDir, 'product-import-review.csv');
  writeReviewCsv(csvOutPath, processed);
  printSummary(processed);
  console.log(`\nReview CSV written to: ${csvOutPath}`);

  if (dryRun) {
    console.log('\nDry-run only — no Strapi boot, no DB writes.');
    return;
  }

  const distDir = path.join(appDir, 'dist');
  const app = createStrapi({ appDir, distDir, autoReload: false, serveAdminPanel: false });
  await app.load();

  await upsertProducts(app, processed);

  await app.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
