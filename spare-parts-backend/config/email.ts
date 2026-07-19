import type { Core } from '@strapi/strapi';

export default ({ env }: Core.Config.Shared.ConfigParams) => ({
  resendApiKey: env('RESEND_API_KEY', ''),
  from: env('EMAIL_FROM', 'orders@sparerow.in'),
});
