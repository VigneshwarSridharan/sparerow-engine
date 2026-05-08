import type { Context } from 'koa';

export default (async (
  policyContext: Context,
  _config: unknown,
  { strapi }: { strapi: { sessionManager?: (origin: string) => { validateAccessToken: (t: string) => { isValid: boolean; payload?: { sessionId: string; userId: string } }; isSessionActive: (id: string) => Promise<boolean> } } }
) => {
  const authHeader = policyContext.request.header.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, '')?.trim();
  if (!token) return false;
  const sm = strapi.sessionManager?.('admin');
  if (!sm) return false;
  const r = sm.validateAccessToken(token);
  if (!r.isValid || !r.payload) return false;
  const active = await sm.isSessionActive(r.payload.sessionId);
  if (!active) return false;
  policyContext.state.adminUserId = r.payload.userId;
  return true;
}) as unknown as (
  ctx: Context,
  cfg: unknown,
  opts: { strapi: { sessionManager?: (origin: string) => unknown } }
) => boolean;

