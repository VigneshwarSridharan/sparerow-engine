import type { Context } from 'koa';
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::commerce.singleton-placeholder', ({ strapi }) => ({
  async check(ctx: Context) {
    try {
      await strapi.db.connection.raw('SELECT 1');
      ctx.body = { status: 'ok' };
    } catch {
      ctx.status = 503;
      ctx.body = { status: 'error' };
    }
  },
}));
