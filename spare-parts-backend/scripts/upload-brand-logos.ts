/**
 * Uploads the sourced brand-logo SVGs from `storefront/src/assets/brands/`
 * (Simple Icons / Wikimedia, see storefront/src/lib/brandLogos.ts) into the
 * Strapi Media Library and attaches each to the matching Brand's `logo` field.
 * Matches by filename convention `<brand-slug>-logo.svg`. Safe to re-run —
 * skips brands that already have a logo unless `--force` is passed.
 */
import path from 'path';
import fs from 'fs';
import type { Core } from '@strapi/strapi';
import { createStrapi } from '@strapi/strapi';

async function main() {
  const force = process.argv.includes('--force');
  const appDir = process.cwd();
  const distDir = path.join(appDir, 'dist');
  const app: Core.Strapi = createStrapi({ appDir, distDir, autoReload: false, serveAdminPanel: false });
  await app.load();

  const logosDir = path.join(appDir, '..', 'storefront', 'src', 'assets', 'brands');
  const files = fs.readdirSync(logosDir).filter((f) => f.endsWith('-logo.svg'));

  const upload = app.plugin('upload').service('upload');

  let uploaded = 0;
  let skippedHasLogo = 0;
  let skippedNoBrand = 0;

  for (const filename of files) {
    const slug = filename.replace(/-logo\.svg$/, '');
    const brand = await app.db.query('api::brand.brand').findOne({
      where: { slug },
      populate: { logo: true },
    });

    if (!brand) {
      app.log.warn(`No brand found for slug "${slug}" (${filename}) — skipping`);
      skippedNoBrand += 1;
      continue;
    }

    if (brand.logo && !force) {
      app.log.info(`Brand "${slug}" already has a logo — skipping (use --force to overwrite)`);
      skippedHasLogo += 1;
      continue;
    }

    const abs = path.join(logosDir, filename);
    const stat = fs.statSync(abs);
    const [file] = await upload.upload({
      data: {},
      files: [
        {
          filepath: abs,
          path: abs,
          originalFilename: filename,
          name: filename,
          size: stat.size,
          mimetype: 'image/svg+xml',
          type: 'image/svg+xml',
        },
      ],
    });

    if (file?.id == null) {
      app.log.warn(`Upload failed for "${filename}" — skipping brand "${slug}"`);
      continue;
    }

    await app.db.query('api::brand.brand').update({
      where: { id: brand.id },
      data: { logo: file.id },
    });
    app.log.info(`Uploaded logo for brand "${slug}"`);
    uploaded += 1;
  }

  app.log.info(
    `Brand logo upload completed: ${uploaded} uploaded, ${skippedHasLogo} already had a logo, ${skippedNoBrand} had no matching brand`
  );
  await app.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
