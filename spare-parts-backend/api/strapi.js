'use strict';

const path = require('path');

// Force Vercel's Node File Tracer to include plugin package.json files.
// Strapi's plugin loader uses require.resolve() with dynamic paths which NFT
// cannot trace statically — pre-requiring them here makes NFT pick them up.
require('@strapi/strapi/package.json');
require('@strapi/content-manager/package.json');
require('@strapi/content-type-builder/package.json');
require('@strapi/email/package.json');
require('@strapi/upload/package.json');
require('@strapi/i18n/package.json');
require('@strapi/content-releases/package.json');
require('@strapi/review-workflows/package.json');
require('@strapi/plugin-graphql/package.json');
require('@strapi/plugin-users-permissions/package.json');
require('@strapi/plugin-cloud/package.json');

// Serverless entry point for Vercel — wraps Strapi's Koa server as a request handler.
// Strapi is initialized once and reused across warm invocations.

process.chdir(path.resolve(__dirname, '..'));

let handler = null;

async function initStrapi() {
  if (handler) return handler;

  const { createStrapi } = require('@strapi/strapi');
  const app = createStrapi({ distDir: path.resolve(__dirname, '..', 'dist') });

  await app.load();
  app.server.mount();

  handler = app.server.app.callback();
  return handler;
}

module.exports = async (req, res) => {
  try {
    const h = await initStrapi();
    return h(req, res);
  } catch (err) {
    console.error('[Strapi] Initialization error:', err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Server initialization failed' }));
  }
};
