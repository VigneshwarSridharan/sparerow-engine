export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
export const INDIAN_POSTAL_REGEX = /^[1-9]\d{5}$/;

const SAFE_INT_MAX = Number.MAX_SAFE_INTEGER;
const SAFE_INT_MIN = Number.MIN_SAFE_INTEGER;

export function assertSlug(label: string, value: unknown): string {
  if (typeof value !== 'string' || !SLUG_REGEX.test(value)) {
    throw new Error(`${label}_INVALID_SLUG`);
  }
  return value;
}

export function assertEmailOptional(label: string, value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || !EMAIL_REGEX.test(value)) {
    throw new Error(`${label}_INVALID_EMAIL`);
  }
  return value;
}

/** Normalize Indian mobile: strip +91 / 91 prefix, digits only */
export function normalizeIndianMobile(input: string): string {
  let d = input.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d;
}

export function assertIndianMobile(label: string, value: unknown): string {
  if (typeof value !== 'string') throw new Error(`${label}_INVALID_PHONE`);
  const d = normalizeIndianMobile(value);
  if (!INDIAN_MOBILE_REGEX.test(d)) throw new Error(`${label}_INVALID_PHONE`);
  return d;
}

export function assertIndianPostal(label: string, value: unknown): string {
  if (typeof value !== 'string' || !INDIAN_POSTAL_REGEX.test(value)) {
    throw new Error(`${label}_INVALID_POSTAL`);
  }
  return value;
}

export function assertNonNegativeInt(label: string, value: unknown): number {
  const n = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    throw new Error(`${label}_INVALID_NON_NEGATIVE_INT`);
  }
  return n;
}

export function assertPositiveInt(label: string, value: unknown): number {
  const n = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) {
    throw new Error(`${label}_INVALID_POSITIVE_INT`);
  }
  return n;
}

export function assertSafeMinorAmount(label: string, value: unknown): bigint {
  if (typeof value === 'bigint') {
    if (value > BigInt(SAFE_INT_MAX) || value < BigInt(SAFE_INT_MIN)) {
      throw new Error(`${label}_AMOUNT_OUT_OF_RANGE`);
    }
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) throw new Error(`${label}_INVALID_AMOUNT`);
    if (value > SAFE_INT_MAX || value < SAFE_INT_MIN) throw new Error(`${label}_AMOUNT_OUT_OF_RANGE`);
    return BigInt(value);
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value)) {
    const b = BigInt(value);
    if (b > BigInt(SAFE_INT_MAX) || b < BigInt(SAFE_INT_MIN)) {
      throw new Error(`${label}_AMOUNT_OUT_OF_RANGE`);
    }
    return b;
  }
  throw new Error(`${label}_INVALID_AMOUNT`);
}

export function minorToBigIntFromDb(value: unknown): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(Math.trunc(value));
  if (typeof value === 'string') return BigInt(value);
  return BigInt(0);
}

export function lineTotal(unitPrice: bigint, quantity: number): bigint {
  return unitPrice * BigInt(quantity);
}

export function availableToSell(quantityOnHand: number, quantityReserved: number): number {
  return Math.max(0, quantityOnHand - quantityReserved);
}
