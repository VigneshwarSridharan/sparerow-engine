export interface OrderConfirmationData {
  orderId: number;
  contactEmail: string;
  shippingRecipientName: string;
  shippingLine1: string;
  shippingLine2?: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  subtotalInMinor: string | number | bigint;
  taxInMinor: string | number | bigint;
  shippingInMinor: string | number | bigint;
  promoDiscountInMinor?: string | number | bigint;
  totalInMinor: string | number | bigint;
  lineItems: Array<{
    nameSnapshot: string;
    skuSnapshot: string;
    quantity: number;
    unitPriceInMinor: string | number | bigint;
    lineTotalInMinor: string | number | bigint;
  }>;
}

function paise(val: string | number | bigint): string {
  return `₹${(Number(val) / 100).toFixed(2)}`;
}

export function orderConfirmationHtml(data: OrderConfirmationData): string {
  const discount = Number(data.promoDiscountInMinor ?? 0);
  const discountRow =
    discount > 0
      ? `<tr><td style="padding:6px 8px;color:#555;">Promo Discount</td><td style="padding:6px 8px;text-align:right;color:#16a34a;">-${paise(discount)}</td></tr>`
      : '';

  const lineRows = data.lineItems
    .map(
      (li) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #f0f0f0;">${li.nameSnapshot}<br><span style="font-size:12px;color:#888;">SKU: ${li.skuSnapshot}</span></td>
          <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:center;">${li.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right;">${paise(li.unitPriceInMinor)}</td>
          <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right;">${paise(li.lineTotalInMinor)}</td>
        </tr>`
    )
    .join('');

  const addr = [data.shippingLine1, data.shippingLine2, data.shippingCity, data.shippingState, data.shippingPostalCode]
    .filter(Boolean)
    .join(', ');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Order Confirmed</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;">
        <!-- Header -->
        <tr><td style="background:#2563eb;padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;">Sparerow</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 8px;color:#1a1a1a;">Order Confirmed!</h2>
          <p style="margin:0 0 24px;color:#555;">Hi ${data.shippingRecipientName}, your order has been placed and payment received. We'll get it shipped as soon as possible.</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9ff;border-radius:6px;padding:16px;margin-bottom:24px;">
            <tr>
              <td><strong style="color:#2563eb;">Order ID</strong><br><span style="font-size:18px;font-weight:bold;">ORD-${data.orderId}</span></td>
            </tr>
          </table>

          <!-- Line items -->
          <h3 style="margin:0 0 12px;color:#1a1a1a;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;">Items Ordered</h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-bottom:24px;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:10px 8px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">ITEM</th>
                <th style="padding:10px 8px;text-align:center;font-size:12px;color:#6b7280;font-weight:600;">QTY</th>
                <th style="padding:10px 8px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;">UNIT</th>
                <th style="padding:10px 8px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;">TOTAL</th>
              </tr>
            </thead>
            <tbody>${lineRows}</tbody>
          </table>

          <!-- Totals -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td style="padding:6px 8px;color:#555;">Subtotal</td><td style="padding:6px 8px;text-align:right;">${paise(data.subtotalInMinor)}</td></tr>
            <tr><td style="padding:6px 8px;color:#555;">Tax (GST)</td><td style="padding:6px 8px;text-align:right;">${paise(data.taxInMinor)}</td></tr>
            <tr><td style="padding:6px 8px;color:#555;">Shipping</td><td style="padding:6px 8px;text-align:right;">${Number(data.shippingInMinor) === 0 ? 'FREE' : paise(data.shippingInMinor)}</td></tr>
            ${discountRow}
            <tr style="border-top:2px solid #e5e7eb;">
              <td style="padding:10px 8px;font-weight:bold;font-size:16px;">Total Paid</td>
              <td style="padding:10px 8px;text-align:right;font-weight:bold;font-size:16px;color:#2563eb;">${paise(data.totalInMinor)}</td>
            </tr>
          </table>

          <!-- Shipping address -->
          <h3 style="margin:0 0 8px;color:#1a1a1a;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;">Shipping To</h3>
          <p style="margin:0 0 24px;color:#555;line-height:1.6;">${data.shippingRecipientName}<br>${addr}</p>

          <p style="margin:0;color:#888;font-size:13px;">You'll receive another email when your order ships with tracking details.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:20px 32px;text-align:center;">
          <p style="margin:0;color:#aaa;font-size:12px;">© Sparerow · This email was sent to ${data.contactEmail}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
