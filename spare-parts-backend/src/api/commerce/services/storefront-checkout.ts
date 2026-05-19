import crypto from 'crypto';
import type { Core } from '@strapi/strapi';
import { AppError } from '../../../lib/errors';
import {
  assertEmailOptional,
  assertIndianMobile,
  assertIndianPostal,
  assertPositiveInt,
  assertSafeMinorAmount,
  availableToSell,
  lineTotal,
} from '../../../lib/validators';
import { lookupTaxRate, computeLineTax } from '../../../lib/tax';

type CartLine = { sku: string; quantity: number; variantSku?: string };
type NormalizedLine = { sku: string; quantity: number; variantSku?: string; product: Record<string, unknown>; variant?: Record<string, unknown>; categorySlug: string | null };

const FREE_SHIPPING_SUBTOTAL_ABOVE_PAISE = 200000n;
const FLAT_SHIPPING_INR_99_PAISE = 9900n;

function mergeLines(lines: CartLine[]): { sku: string; quantity: number; variantSku?: string }[] {
  const map = new Map<string, { quantity: number; variantSku?: string }>();
  for (const raw of lines) {
    const sku = String(raw.sku || '').trim().toUpperCase();
    const variantSku = raw.variantSku ? String(raw.variantSku).trim().toUpperCase() : undefined;
    const quantity = assertPositiveInt('quantity', raw.quantity);
    const key = variantSku ? `${sku}::${variantSku}` : sku;
    const existing = map.get(key);
    map.set(key, { quantity: (existing?.quantity || 0) + quantity, variantSku });
  }
  return [...map.entries()].map(([key, val]) => ({
    sku: key.includes('::') ? key.split('::')[0] : key,
    quantity: val.quantity,
    variantSku: val.variantSku,
  }));
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async placeOrder(input: {
    lines: CartLine[];
    contactPhone: string;
    contactEmail?: string;
    promoCode?: string;
    customerId?: number;
    shippingAddressId?: number;
    guestShipping?: Record<string, unknown>;
  }) {
    const lines = mergeLines(Array.isArray(input.lines) ? input.lines : []);
    if (lines.length === 0) throw new AppError(400, 'CART_EMPTY', 'Cart is empty');
    const contactPhone = assertIndianMobile('contactPhone', input.contactPhone);

    let contactEmail: string;
    let customerAccountId: number | null = input.customerId ?? null;
    let shipSnap: Record<string, string>;

    if (input.customerId && input.shippingAddressId) {
      const addr = await strapi.db.query('api::customer-address.customer-address').findOne({
        where: { id: input.shippingAddressId, customerAccount: input.customerId },
      });
      if (!addr) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Shipping address not found');
      const acct = await strapi.db.query('api::customer-account.customer-account').findOne({
        where: { id: input.customerId },
      });
      const emailFromAcct = assertEmailOptional('email', acct?.email);
      const resolved = assertEmailOptional('contactEmail', input.contactEmail) || emailFromAcct;
      if (!resolved) throw new AppError(400, 'CONTACT_EMAIL_REQUIRED', 'Contact email required');
      contactEmail = resolved;
      shipSnap = {
        shippingRecipientName: addr.customerName as string,
        shippingLine1: addr.line1 as string,
        shippingLine2: (addr.line2 as string) || '',
        shippingCity: addr.city as string,
        shippingState: addr.state as string,
        shippingPostalCode: addr.postalCode as string,
        shippingCountryCode: (addr.countryCode as string) || 'IN',
        shippingPhone: addr.phone as string,
      };
    } else if (input.guestShipping) {
      const s = input.guestShipping;
      shipSnap = {
        shippingRecipientName: String(s.customerName ?? ''),
        shippingLine1: String(s.line1 ?? ''),
        shippingLine2: String(s.line2 ?? ''),
        shippingCity: String(s.city ?? ''),
        shippingState: String(s.state ?? ''),
        shippingPostalCode: assertIndianPostal('postalCode', s.postalCode),
        shippingCountryCode: String(s.countryCode ?? 'IN'),
        shippingPhone: assertIndianMobile('shippingPhone', s.phone),
      };
      if (!shipSnap.shippingRecipientName || !shipSnap.shippingLine1 || !shipSnap.shippingCity) {
        throw new AppError(400, 'SHIPPING_INVALID', 'Invalid shipping payload');
      }
      if (input.customerId) {
        const acct = await strapi.db.query('api::customer-account.customer-account').findOne({
          where: { id: input.customerId },
        });
        const emailFromAcct = assertEmailOptional('email', acct?.email);
        const resolved = assertEmailOptional('contactEmail', input.contactEmail) || emailFromAcct;
        if (!resolved) throw new AppError(400, 'CONTACT_EMAIL_REQUIRED', 'Contact email required');
        contactEmail = resolved;
      } else {
        const resolved = assertEmailOptional('contactEmail', input.contactEmail);
        if (!resolved) throw new AppError(400, 'CONTACT_EMAIL_REQUIRED', 'Contact email required');
        contactEmail = resolved;
      }
    } else {
      throw new AppError(
        400,
        'CHECKOUT_INCOMPLETE',
        'Provide shippingAddressId for a saved address, or guestShipping'
      );
    }

    return strapi.db.transaction(async () => {
      const normalizedLines: NormalizedLine[] = [];
      for (const raw of lines) {
        const { sku, quantity, variantSku } = raw;
        const product = await strapi.db.query('api::product.product').findOne({
          where: { sku, isActive: true },
          populate: ['partCategory'],
        });
        if (!product) throw new AppError(400, 'SKU_NOT_FOUND', `Unknown SKU ${sku}`);
        const categorySlug =
          (product.partCategory as Record<string, unknown> | null)?.slug as string | null ?? null;

        if (variantSku) {
          const variant = await strapi.db.query('api::product-variant.product-variant').findOne({
            where: { sku: variantSku, product: product.id, isActive: true },
          });
          if (!variant) throw new AppError(400, 'VARIANT_NOT_FOUND', `Unknown variant SKU ${variantSku}`);
          const onHand = Number(variant.quantityOnHand);
          const reserved = Number(variant.quantityReserved);
          const avail = availableToSell(onHand, reserved);
          if (avail < quantity) throw new AppError(409, 'INSUFFICIENT_STOCK', `Insufficient stock for ${variantSku}`);
          normalizedLines.push({ sku, quantity, variantSku, product: product as unknown as Record<string, unknown>, variant: variant as unknown as Record<string, unknown>, categorySlug });
        } else {
          const onHand = Number(product.quantityOnHand);
          const reserved = Number(product.quantityReserved);
          const avail = availableToSell(onHand, reserved);
          if (avail < quantity) throw new AppError(409, 'INSUFFICIENT_STOCK', `Insufficient stock for ${sku}`);
          normalizedLines.push({ sku, quantity, product: product as unknown as Record<string, unknown>, categorySlug });
        }
      }

      for (const row of normalizedLines) {
        if (row.variant) {
          const v = row.variant;
          const id = v.id as number;
          await strapi.db.query('api::product-variant.product-variant').update({
            where: { id },
            data: { quantityReserved: Number(v.quantityReserved) + row.quantity },
          });
        } else {
          const p = row.product;
          const id = p.id as number;
          await strapi.db.query('api::product.product').update({
            where: { id },
            data: { quantityReserved: Number(p.quantityReserved) + row.quantity },
          });
        }
      }

      let subtotal = 0n;
      let tax = 0n;
      const shippingStateCode = shipSnap.shippingState;
      const linePayloads: {
        skuSnapshot: string;
        variantSkuSnapshot?: string;
        nameSnapshot: string;
        unitPriceInMinor: bigint;
        quantity: number;
        lineTotalInMinor: bigint;
        product: number;
      }[] = [];

      for (const row of normalizedLines) {
        const p = row.variant ?? row.product;
        const unit = assertSafeMinorAmount('unitPrice', p.priceInMinor);
        const qty = row.quantity;
        const lt = lineTotal(unit, qty);
        subtotal += lt;
        const ratePercent = await lookupTaxRate(strapi, row.categorySlug, shippingStateCode);
        tax += computeLineTax(unit, qty, ratePercent);
        linePayloads.push({
          skuSnapshot: String(row.product.sku),
          variantSkuSnapshot: row.variantSku,
          nameSnapshot: String(row.product.name),
          unitPriceInMinor: unit,
          quantity: qty,
          lineTotalInMinor: lt,
          product: row.product.id as number,
        });
      }

      const taxRatePercent = subtotal > 0n ? Number((tax * 100n) / subtotal) : 0;

      let promoCode: string | undefined;
      let promoDiscount = 0n;
      if (input.promoCode) {
        const promoService = strapi.service('api::commerce.storefront-promo') as {
          validatePromoForSubtotal: (
            codeInput: string,
            subtotalInMinor: bigint
          ) => Promise<{ code: string; discountPercent: number; maxDiscountInMinor?: bigint }>;
        };
        const promo = await promoService.validatePromoForSubtotal(input.promoCode, subtotal);
        promoCode = promo.code;
        promoDiscount = (subtotal * BigInt(Math.max(0, Math.min(100, promo.discountPercent)))) / 100n;
        if (promo.maxDiscountInMinor != null && promoDiscount > promo.maxDiscountInMinor) {
          promoDiscount = promo.maxDiscountInMinor;
        }
      }

      const shipping = subtotal > FREE_SHIPPING_SUBTOTAL_ABOVE_PAISE ? 0n : FLAT_SHIPPING_INR_99_PAISE;
      const total = subtotal + tax + shipping - promoDiscount;

      const checkoutContinuationSecret = crypto.randomBytes(24).toString('hex');

      const primary = (strapi.config.get<string>('shipping.primary') || 'MOCK').toUpperCase();
      const carrier =
        primary === 'DELHIVERY' ? 'DELHIVERY' : primary === 'SHIPROCKET' ? 'SHIPROCKET' : 'MOCK';

      const order = await strapi.db.query('api::order.order').create({
        data: {
          status: 'PENDING_PAYMENT',
          currency: 'INR',
          checkoutContinuationSecret,
          subtotalInMinor: subtotal.toString(),
          taxInMinor: tax.toString(),
          taxRatePercent,
          shippingInMinor: shipping.toString(),
          totalInMinor: total.toString(),
          promoCode: promoCode || null,
          promoDiscountInMinor: promoDiscount.toString(),
          contactEmail,
          contactPhone,
          ...shipSnap,
          customerAccount: customerAccountId,
        },
      });

      const orderId = order.id as number;

      for (const lp of linePayloads) {
        await strapi.db.query('api::order-line-item.order-line-item').create({
          data: {
            skuSnapshot: lp.skuSnapshot,
            variantSkuSnapshot: lp.variantSkuSnapshot ?? null,
            nameSnapshot: lp.nameSnapshot,
            unitPriceInMinor: lp.unitPriceInMinor.toString(),
            quantity: lp.quantity,
            lineTotalInMinor: lp.lineTotalInMinor.toString(),
            order: orderId,
            product: lp.product,
          },
        });
      }

      await strapi.db.query('api::shipment.shipment').create({
        data: {
          carrier,
          status: 'DRAFT',
          order: orderId,
          carrierMetadata: { source: 'checkout' },
        },
      });

      const loaded = await strapi.db.query('api::order.order').findOne({
        where: { id: orderId },
        populate: ['lineItems', 'shipments'],
      });
      return {
        order: loaded,
        continuationSecret: checkoutContinuationSecret,
      };
    });
  },

  async releaseReservationForOrder(orderId: number) {
    const items = await strapi.db.query('api::order-line-item.order-line-item').findMany({
      where: { order: orderId },
      populate: ['product'],
    });
    for (const li of items) {
      const variantSnap = (li as Record<string, unknown>).variantSkuSnapshot as string | null;
      if (variantSnap) {
        const variant = await strapi.db.query('api::product-variant.product-variant').findOne({
          where: { sku: variantSnap },
        });
        if (variant) {
          const q = Number(variant.quantityReserved) - Number(li.quantity);
          await strapi.db.query('api::product-variant.product-variant').update({
            where: { id: variant.id },
            data: { quantityReserved: Math.max(0, q) },
          });
        }
        continue;
      }
      const prod = li.product as { id?: number } | null;
      if (!prod?.id) continue;
      const p = await strapi.db.query('api::product.product').findOne({ where: { id: prod.id } });
      if (!p) continue;
      const q = Number(p.quantityReserved) - Number(li.quantity);
      await strapi.db.query('api::product.product').update({
        where: { id: prod.id },
        data: { quantityReserved: Math.max(0, q) },
      });
    }
  },
});
