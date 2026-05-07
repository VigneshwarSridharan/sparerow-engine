import { describe, expect, it } from 'vitest';
import { availableToSell, lineTotal, assertSafeMinorAmount } from '../../src/lib/validators';

describe('validators', () => {
  it('computes availableToSell', () => {
    expect(availableToSell(10, 3)).toBe(7);
    expect(availableToSell(2, 5)).toBe(0);
  });
  it('computes line total', () => {
    expect(lineTotal(199n, 3)).toBe(597n);
  });
  it('parses minor amounts', () => {
    expect(assertSafeMinorAmount('x', '100')).toBe(100n);
  });
});
