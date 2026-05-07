import type { Core } from '@strapi/strapi';

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const knex = strapi.db.connection;
    if (knex?.client?.config?.client !== 'postgres') {
      return;
    }
    try {
      await knex.raw(`
        CREATE UNIQUE INDEX IF NOT EXISTS part_models_brand_slug_uid
        ON part_models (brand_id, slug);
      `);
      await knex.raw(`
        CREATE UNIQUE INDEX IF NOT EXISTS webhook_deliveries_provider_event_uid
        ON webhook_deliveries (provider, event_id);
      `);
    } catch (e) {
      strapi.log.warn('Bootstrap index creation skipped or failed');
      strapi.log.debug(e);
    }
  },
};
