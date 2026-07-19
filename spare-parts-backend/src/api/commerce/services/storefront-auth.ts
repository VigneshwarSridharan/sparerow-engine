import crypto from 'crypto';
import type { Core } from '@strapi/strapi';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppError } from '../../../lib/errors';
import { assertEmailOptional, assertIndianMobile } from '../../../lib/validators';
import { sendEmail } from '../../../lib/mailer';
import { passwordResetHtml } from '../../../lib/email-templates/password-reset';

const SALT_ROUNDS = 12;

function getJwtSecret(strapi: Core.Strapi): string {
  const s = strapi.config.get<string>('customer.jwtSecret');
  if (!s) throw new Error('CUSTOMER_JWT_SECRET_MISSING');
  return s;
}

export type CustomerJwtPayload = { sub: number; typ: 'customer' };

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const signCustomerToken = (customerId: number): string => {
    const secret = getJwtSecret(strapi);
    return jwt.sign({ sub: customerId, typ: 'customer' } satisfies CustomerJwtPayload, secret, {
      expiresIn: '30d',
      algorithm: 'HS256',
    });
  };

  const verifyCustomerToken = (token: string): CustomerJwtPayload => {
    const secret = getJwtSecret(strapi);
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (typeof decoded !== 'object' || decoded === null || !('sub' in decoded)) {
      throw new AppError(401, 'INVALID_TOKEN', 'Invalid session');
    }
    const sub = Number((decoded as { sub: unknown }).sub);
    if (!Number.isFinite(sub)) throw new AppError(401, 'INVALID_TOKEN', 'Invalid session');
    return { sub, typ: 'customer' };
  };

  const claimGuestOrders = async (customerId: number, email: string) => {
    const candidates = await strapi.db.query('api::order.order').findMany({
      where: { contactEmail: email },
    });
    for (const order of candidates) {
      // Only claim orders that have no customer account linked yet
      if (order.customerAccount != null) continue;
      await strapi.db.query('api::order.order').update({
        where: { id: order.id as number },
        data: { customerAccount: customerId },
      });
    }
  };

  return {
    signCustomerToken,
    verifyCustomerToken,

    async register(body: { email?: string; phone?: string; password: string }) {
      const password = typeof body.password === 'string' ? body.password : '';
      if (password.length < 8) throw new AppError(400, 'WEAK_PASSWORD', 'Password too short');
      const email = assertEmailOptional('email', body.email);
      let phone: string | undefined;
      if (body.phone) phone = assertIndianMobile('phone', body.phone);
      if (!email && !phone) throw new AppError(400, 'IDENTITY_REQUIRED', 'Email or phone required');

      if (email) {
        const exists = await strapi.db.query('api::customer-account.customer-account').findOne({
          where: { email },
        });
        if (exists) throw new AppError(409, 'EMAIL_IN_USE', 'Email already registered');
      }
      if (phone) {
        const exists = await strapi.db.query('api::customer-account.customer-account').findOne({
          where: { phone },
        });
        if (exists) throw new AppError(409, 'PHONE_IN_USE', 'Phone already registered');
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const created = await strapi.db.query('api::customer-account.customer-account').create({
        data: {
          email: email ?? null,
          phone: phone ?? null,
          passwordHash,
        },
      });
      if (email) await claimGuestOrders(created.id as number, email);
      const token = signCustomerToken(created.id as number);
      return { token, customer: { id: created.id, email: created.email, phone: created.phone } };
    },

    async login(body: { email?: string; phone?: string; password: string }) {
      const password = typeof body.password === 'string' ? body.password : '';
      const email = assertEmailOptional('email', body.email);
      const phone = body.phone ? assertIndianMobile('phone', body.phone) : undefined;
      if (!email && !phone) throw new AppError(400, 'IDENTITY_REQUIRED', 'Email or phone required');

      const account = await strapi.db.query('api::customer-account.customer-account').findOne({
        where: email ? { email } : { phone },
      });
      if (!account?.passwordHash) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
      const ok = await bcrypt.compare(password, account.passwordHash as string);
      if (!ok) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
      if (email) await claimGuestOrders(account.id as number, email);
      const token = signCustomerToken(account.id as number);
      return { token, customer: { id: account.id, email: account.email, phone: account.phone } };
    },

    async requestPasswordReset(email: string) {
      const normalised = assertEmailOptional('email', email);
      if (!normalised) throw new AppError(400, 'EMAIL_REQUIRED', 'Email is required');
      const account = await strapi.db.query('api::customer-account.customer-account').findOne({
        where: { email: normalised },
      });
      // Return silently if account not found to avoid enumeration
      if (!account) return { ok: true };
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await strapi.db.query('api::customer-account.customer-account').update({
        where: { id: account.id as number },
        data: { passwordResetToken: token, passwordResetExpiresAt: expiresAt },
      });
      const storefrontUrl = strapi.config.get<string>('customer.storefrontUrl');
      const resetLink = `${storefrontUrl}/reset-password?token=${token}`;
      await sendEmail(
        strapi,
        normalised,
        'Reset your Sparerow password',
        passwordResetHtml({ resetLink, contactEmail: normalised })
      );
      return { ok: true };
    },

    async resetPassword(token: string, newPassword: string) {
      if (!newPassword || newPassword.length < 8) {
        throw new AppError(400, 'WEAK_PASSWORD', 'Password must be at least 8 characters');
      }
      const now = new Date();
      const account = await strapi.db.query('api::customer-account.customer-account').findOne({
        where: { passwordResetToken: token },
      });
      if (
        !account ||
        !account.passwordResetExpiresAt ||
        new Date(account.passwordResetExpiresAt as string) < now
      ) {
        throw new AppError(400, 'INVALID_RESET_TOKEN', 'Reset link is invalid or has expired');
      }
      const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await strapi.db.query('api::customer-account.customer-account').update({
        where: { id: account.id as number },
        data: { passwordHash, passwordResetToken: null, passwordResetExpiresAt: null },
      });
      return { ok: true };
    },

    async session(authorization?: string) {
      const raw = authorization?.replace(/^Bearer\s+/i, '')?.trim();
      if (!raw) return { authenticated: false as const };
      try {
        const { sub } = verifyCustomerToken(raw);
        const account = await strapi.db.query('api::customer-account.customer-account').findOne({
          where: { id: sub },
        });
        if (!account) return { authenticated: false as const };
        return {
          authenticated: true as const,
          customer: { id: account.id, email: account.email, phone: account.phone },
        };
      } catch {
        return { authenticated: false as const };
      }
    },
  };
};
