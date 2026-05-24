import { describe, expect, it } from 'vitest';
import {
  assertOrderTransition,
  assertShipmentTransition,
} from '../../src/lib/transitions';

describe('order transitions', () => {
  it('allows PENDING_PAYMENT -> PAID', () => {
    expect(() => assertOrderTransition('PENDING_PAYMENT', 'PAID')).not.toThrow();
  });
  it('allows PAID -> FULFILLMENT_PENDING', () => {
    expect(() => assertOrderTransition('PAID', 'FULFILLMENT_PENDING')).not.toThrow();
  });
  it('allows FULFILLMENT_PENDING -> FULFILLED', () => {
    expect(() => assertOrderTransition('FULFILLMENT_PENDING', 'FULFILLED')).not.toThrow();
  });
  it('rejects backward transition', () => {
    expect(() => assertOrderTransition('PAID', 'PENDING_PAYMENT')).toThrow();
  });
});

describe('shipment transitions', () => {
  it('allows DRAFT -> BOOKED', () => {
    expect(() => assertShipmentTransition('DRAFT', 'BOOKED')).not.toThrow();
  });
  it('rejects DELIVERED -> IN_TRANSIT', () => {
    expect(() => assertShipmentTransition('DELIVERED', 'IN_TRANSIT')).toThrow();
  });
});
