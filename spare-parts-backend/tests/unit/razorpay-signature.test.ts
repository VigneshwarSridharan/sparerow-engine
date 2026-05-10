import crypto from 'crypto';
import { describe, expect, it } from 'vitest';
import { verifyRazorpayPaymentSignature } from '../../src/lib/razorpay-signature';

function sign(orderId: string, paymentId: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

describe('verifyRazorpayPaymentSignature', () => {
  it('accepts valid signature', () => {
    const secret = 'test_secret';
    const orderId = 'order_razorpay_1';
    const paymentId = 'pay_abc';
    const sig = sign(orderId, paymentId, secret);
    expect(verifyRazorpayPaymentSignature(orderId, paymentId, sig, secret)).toBe(true);
  });

  it('rejects tampered payload', () => {
    const secret = 'test_secret';
    expect(
      verifyRazorpayPaymentSignature('order_razorpay_1', 'pay_abc', sign('other', 'pay_abc', secret), secret)
    ).toBe(false);
  });
});
