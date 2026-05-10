import type { Core } from '@strapi/strapi';
import { AppError } from '../../../lib/errors';

type PromoResult = {
  id: number;
  code: string;
  description: string;
  discountPercent: number;
  minOrderSubtotalInMinor: bigint;
  maxDiscountInMinor?: bigint;
  isActive: boolean;
  startsAt?: string;
  endsAt?: string;
};

function toBigInt(value: unknown, fallback: bigint = 0n): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.trunc(value));
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return BigInt(value);
  return fallback;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async resolvePromo(codeInput: string): Promise<PromoResult | null> {
    const code = String(codeInput || '').trim().toUpperCase();
    if (!code) return null;

    const promo = await strapi.db.query('api::promo-code.promo-code').findOne({
      where: { code, isActive: true },
    });
    if (!promo) return null;

    const now = new Date();
    if (promo.startsAt && new Date(String(promo.startsAt)) > now) return null;
    if (promo.endsAt && new Date(String(promo.endsAt)) < now) return null;

    return {
      id: promo.id as number,
      code: String(promo.code),
      description: String(promo.description || ''),
      discountPercent: Number(promo.discountPercent || 0),
      minOrderSubtotalInMinor: toBigInt(promo.minOrderSubtotalInMinor, 0n),
      maxDiscountInMinor: promo.maxDiscountInMinor != null ? toBigInt(promo.maxDiscountInMinor) : undefined,
      isActive: Boolean(promo.isActive),
      startsAt: promo.startsAt ? String(promo.startsAt) : undefined,
      endsAt: promo.endsAt ? String(promo.endsAt) : undefined,
    };
  },

  async validatePromoForSubtotal(codeInput: string, subtotalInMinor: bigint) {
    const promo = await this.resolvePromo(codeInput);
    if (!promo) {
      throw new AppError(400, 'PROMO_INVALID', 'Promo code is invalid or inactive');
    }
    if (subtotalInMinor < promo.minOrderSubtotalInMinor) {
      throw new AppError(400, 'PROMO_MINIMUM_NOT_MET', 'Promo minimum subtotal not met');
    }
    return promo;
  },
});
