import type { Context } from 'koa';
import crypto from 'crypto';

function timingSafeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export default (policyContext: Context, _config: unknown, { strapi }: { strapi: { config: { get: (k: string) => string | undefined }; log: { warn: (m: string) => void } } }) => {
  const expected = strapi.config.get('payment.internalApiKey');
  if (!expected) {
    strapi.log.warn('STRAPI_INTERNAL_API_KEY is not set');
    return false;
  }
  const received = policyContext.request.header['x-internal-api-key'];
  if (typeof received !== 'string' || !timingSafeEqual(received, expected)) {
    return false;
  }
  return true;
};
