import type { Core } from '@strapi/strapi';
import type { Context, Next } from 'koa';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitRule {
  match: (method: string, path: string) => boolean;
  limit: number;
  windowMs: number;
  bucket: string;
}

const WINDOW_MS = 60_000;

const RULES: RateLimitRule[] = [
  {
    bucket: 'auth-strict',
    limit: 5,
    windowMs: WINDOW_MS,
    match: (method, path) =>
      method === 'POST' &&
      (path === '/api/storefront/auth/login' || path === '/api/storefront/auth/register'),
  },
  {
    bucket: 'graphql',
    limit: 60,
    windowMs: WINDOW_MS,
    match: (_method, path) => path === '/graphql',
  },
  {
    bucket: 'storefront',
    limit: 100,
    windowMs: WINDOW_MS,
    match: (_method, path) => path.startsWith('/api/storefront/'),
  },
];

function resolveRule(method: string, path: string): RateLimitRule | null {
  for (const rule of RULES) {
    if (rule.match(method, path)) return rule;
  }
  return null;
}

function getClientIp(ctx: Context): string {
  const forwarded = ctx.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return ctx.ip;
}

// Exported for testing
export function createRateLimiter() {
  const store = new Map<string, RateLimitEntry>();

  function pruneExpired(now: number) {
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }

  function check(
    bucket: string,
    ip: string,
    limit: number,
    windowMs: number,
    now: number
  ): { allowed: boolean; remaining: number; resetAt: number } {
    const key = `${bucket}:${ip}`;
    let entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    if (entry.count >= limit) {
      return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count += 1;
    return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
  }

  return { check, pruneExpired };
}

export default (_config: unknown, { strapi: _strapi }: { strapi: Core.Strapi }) => {
  const limiter = createRateLimiter();

  return async (ctx: Context, next: Next) => {
    const now = Date.now();
    const rule = resolveRule(ctx.method, ctx.path);

    if (rule) {
      const ip = getClientIp(ctx);
      const result = limiter.check(rule.bucket, ip, rule.limit, rule.windowMs, now);

      if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetAt - now) / 1000);
        ctx.status = 429;
        ctx.set('Retry-After', String(retryAfter));
        ctx.body = { error: 'Too Many Requests', retryAfter };
        return;
      }
    }

    await next();
    limiter.pruneExpired(Date.now());
  };
};
