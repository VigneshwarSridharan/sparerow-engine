import { Resend } from 'resend';
import type { Core } from '@strapi/strapi';

let _client: Resend | null = null;

function getClient(strapi: Core.Strapi): Resend | null {
  const key = strapi.config.get<string>('email.resendApiKey');
  if (!key) return null;
  if (!_client) _client = new Resend(key);
  return _client;
}

export async function sendEmail(
  strapi: Core.Strapi,
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const client = getClient(strapi);
  if (!client) {
    strapi.log.warn('[mailer] RESEND_API_KEY not configured — email skipped to %s', to);
    return;
  }
  const from = strapi.config.get<string>('email.from') || 'orders@sparerow.in';
  const { error } = await client.emails.send({ from, to, subject, html });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
