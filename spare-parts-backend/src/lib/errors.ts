import type { Context } from 'koa';
import * as Sentry from '@sentry/node';

/** Application error with stable machine code for clients */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.name = 'AppError';
  }
}

export function sanitizeForLog(input: string): string {
  return input
    .replace(/rzp_(test|live)_[a-z0-9_]+/gi, '[redacted]')
    .replace(/Bearer\s+[\w-_.]+/gi, 'Bearer [redacted]')
    .replace(/"password"\s*:\s*"[^"]*"/gi, '"password":"[redacted]"')
    .replace(/passwordHash[^,}]*/gi, 'passwordHash:[redacted]');
}

/** Shared Koa controller wrapper: serialises AppError to an HTTP response,
 * reports anything else to Sentry, and lets it bubble to Strapi's error middleware. */
export function handle(ctx: Context, fn: () => Promise<void>) {
  return (async () => {
    try {
      await fn();
    } catch (e: unknown) {
      if (e instanceof AppError) {
        ctx.status = e.status;
        ctx.body = { error: { code: e.code, message: e.message, details: e.details } };
        return;
      }
      Sentry.captureException(e);
      throw e;
    }
  })();
}
