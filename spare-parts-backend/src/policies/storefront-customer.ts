import type { Context } from 'koa';
import { AppError } from '../lib/errors';

export default (
  policyContext: Context,
  _config: unknown,
  { strapi }: { strapi: { service: (uid: string) => { verifyCustomerToken: (t: string) => { sub: number } } } }
) => {
  const authHeader = policyContext.request.header.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, '')?.trim();
  if (!token) return false;
  try {
    const svc = strapi.service('api::commerce.storefront-auth');
    const { sub } = svc.verifyCustomerToken(token);
    policyContext.state.customerId = sub;
    return true;
  } catch (e) {
    if (e instanceof AppError && e.status === 401) return false;
    return false;
  }
};
