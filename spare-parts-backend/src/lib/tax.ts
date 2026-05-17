import type { Core } from '@strapi/strapi';

type TaxRule = {
  categorySlug: string | null;
  stateCode: string | null;
  ratePercent: number;
  isActive: boolean;
};

/**
 * Finds the most specific active tax rate for the given category + shipping state.
 *
 * Lookup priority (highest to lowest):
 *   1. categorySlug + stateCode  (exact match)
 *   2. categorySlug only         (category default, applies to all states)
 *   3. stateCode only            (state default, applies to all categories)
 *   4. neither set               (global default)
 */
export async function lookupTaxRate(
  strapi: Core.Strapi,
  categorySlug: string | null,
  stateCode: string
): Promise<number> {
  const rules = (await strapi.db.query('api::tax-rule.tax-rule').findMany({
    where: { isActive: true },
  })) as TaxRule[];

  if (rules.length === 0) return 0;

  const state = stateCode.trim().toUpperCase();
  const category = categorySlug ? categorySlug.trim().toLowerCase() : null;

  const match = (r: TaxRule, cat: string | null, st: string | null) =>
    (cat === null ? !r.categorySlug : r.categorySlug?.toLowerCase() === cat) &&
    (st === null ? !r.stateCode : r.stateCode?.toUpperCase() === st);

  const exact = rules.find((r) => match(r, category, state));
  if (exact) return Number(exact.ratePercent);

  const byCat = rules.find((r) => match(r, category, null));
  if (byCat) return Number(byCat.ratePercent);

  const byState = rules.find((r) => match(r, null, state));
  if (byState) return Number(byState.ratePercent);

  const global = rules.find((r) => match(r, null, null));
  return global ? Number(global.ratePercent) : 0;
}

/** Returns the global default GST rate (no category, no state restriction). */
export async function lookupDefaultTaxRate(strapi: Core.Strapi): Promise<number> {
  const rules = (await strapi.db.query('api::tax-rule.tax-rule').findMany({
    where: { isActive: true },
  })) as TaxRule[];
  const global = rules.find((r) => !r.categorySlug && !r.stateCode);
  return global ? Number(global.ratePercent) : 0;
}

/** Computes GST on a single line: floor(unitPrice × qty × rate% / 100). */
export function computeLineTax(
  unitPriceInMinor: bigint,
  quantity: number,
  ratePercent: number
): bigint {
  if (ratePercent <= 0) return 0n;
  return (unitPriceInMinor * BigInt(quantity) * BigInt(ratePercent)) / 100n;
}
