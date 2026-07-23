import { describe, expect, it } from 'vitest';
import {
  assertOrderTransition,
  assertShipmentTransition,
  mapCarrierStatusToShipmentStatus,
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

describe('mapCarrierStatusToShipmentStatus', () => {
  it('maps Shiprocket "Delivered" to DELIVERED', () => {
    expect(mapCarrierStatusToShipmentStatus('Delivered')).toBe('DELIVERED');
  });
  it('maps "Out For Delivery" and "Shipped" to IN_TRANSIT', () => {
    expect(mapCarrierStatusToShipmentStatus('Out For Delivery')).toBe('IN_TRANSIT');
    expect(mapCarrierStatusToShipmentStatus('Shipped')).toBe('IN_TRANSIT');
    expect(mapCarrierStatusToShipmentStatus('In Transit')).toBe('IN_TRANSIT');
  });
  it('maps pickup-related labels to READY_TO_PICKUP', () => {
    expect(mapCarrierStatusToShipmentStatus('Pickup Generated')).toBe('READY_TO_PICKUP');
    expect(mapCarrierStatusToShipmentStatus('Ready To Ship')).toBe('READY_TO_PICKUP');
  });
  it('maps RTO / cancellation / loss labels to FAILED, even when they mention "Delivered"', () => {
    expect(mapCarrierStatusToShipmentStatus('RTO Delivered')).toBe('FAILED');
    expect(mapCarrierStatusToShipmentStatus('Canceled')).toBe('FAILED');
    expect(mapCarrierStatusToShipmentStatus('Lost')).toBe('FAILED');
    expect(mapCarrierStatusToShipmentStatus('Undelivered')).toBe('FAILED');
  });
  it('returns null for unrecognized or missing labels', () => {
    expect(mapCarrierStatusToShipmentStatus('UPDATED')).toBeNull();
    expect(mapCarrierStatusToShipmentStatus(undefined)).toBeNull();
    expect(mapCarrierStatusToShipmentStatus(null)).toBeNull();
  });
});
