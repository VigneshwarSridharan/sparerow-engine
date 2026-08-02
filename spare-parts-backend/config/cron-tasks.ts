import type { Core } from '@strapi/strapi';

const cronTasks: Record<
  string,
  { task: (ctx: { strapi: Core.Strapi }) => Promise<void>; options: { rule: string } }
> = {
  'razorpay-reconcile-pending-payments': {
    task: async ({ strapi }) => {
      try {
        const svc = strapi.service('api::commerce.payment-razorpay') as {
          reconcilePendingPayments: () => Promise<{ checked: number; paid: number; failed: number; flagged: number }>;
        };
        const summary = await svc.reconcilePendingPayments();
        strapi.log.info(`[cron] razorpay-reconcile-pending-payments ${JSON.stringify(summary)}`);
      } catch (e) {
        strapi.log.error(
          `[cron] razorpay-reconcile-pending-payments failed: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    },
    options: { rule: '*/5 * * * *' },
  },
};

export default cronTasks;
