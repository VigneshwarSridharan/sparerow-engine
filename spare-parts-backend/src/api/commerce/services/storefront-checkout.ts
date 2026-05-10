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

type CartLine = { sku: string; quantity: number };

const FREE_SHIPPING_SUBTOTAL_ABOVE_PAISE = 200000n;
const FLAT_SHIPPING_INR_99_PAISE = 9900n;

function mergeLines(lines: CartLine[]): { sku: string; quantity: number }[] {
  const map = new Map<string, number>();
  for (const raw of lines) {
    const sku = String(raw.sku || '')
      .trim()
      .toUpperCase();
    const quantity = assertPositiveInt('quantity', raw.quantity);
    map.set(sku, (map.get(sku) || 0) + quantity);
  }
  return [...map.entries()].map(([sku, quantity]) => ({ sku, quantity }));
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
    } else if (!input.customerId && input.guestShipping) {
      const resolved = assertEmailOptional('contactEmail', input.contactEmail);
      if (!resolved) throw new AppError(400, 'CONTACT_EMAIL_REQUIRED', 'Contact email required');
      contactEmail = resolved;
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
    } else {
      throw new AppError(400, 'CHECKOUT_INCOMPLETE', 'Provide customerId+shippingAddressId or guestShipping');
    }

    return strapi.db.transaction(async () => {
      const normalizedLines: { sku: string; quantity: number; product: Record<string, unknown> }[] = [];
      for (const raw of lines) {
        const { sku, quantity } = raw;
        const product = await strapi.db.query('api::product.product').findOne({
          where: { sku, isActive: true },
        });
        if (!product) throw new AppError(400, 'SKU_NOT_FOUND', `Unknown SKU ${sku}`);
        const onHand = Number(product.quantityOnHand);
        const reserved = Number(product.quantityReserved);
        const avail = availableToSell(onHand, reserved);
        if (avail < quantity) throw new AppError(409, 'INSUFFICIENT_STOCK', `Insufficient stock for ${sku}`);
        normalizedLines.push({ sku, quantity, product: product as unknown as Record<string, unknown> });
      }

      for (const row of normalizedLines) {
        const p = row.product;
        const id = p.id as number;
        const reserved = Number(p.quantityReserved);
        const quantity = row.quantity;
        await strapi.db.query('api::product.product').update({
          where: { id },
          data: { quantityReserved: reserved + quantity },
        });
      }

      let subtotal = 0n;
      const linePayloads: {
        skuSnapshot: string;
        nameSnapshot: string;
        unitPriceInMinor: bigint;
        quantity: number;
        lineTotalInMinor: bigint;
        product: number;
      }[] = [];

      for (const row of normalizedLines) {
        const p = row.product;
        const unit = assertSafeMinorAmount('unitPrice', p.priceInMinor);
        const qty = row.quantity;
        const lt = lineTotal(unit, qty);
        subtotal += lt;
        linePayloads.push({
          skuSnapshot: String(p.sku),
          nameSnapshot: String(p.name),
          unitPriceInMinor: unit,
          quantity: qty,
          lineTotalInMinor: lt,
          product: p.id as number,
        });
      }

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

      const tax = 0n;
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
