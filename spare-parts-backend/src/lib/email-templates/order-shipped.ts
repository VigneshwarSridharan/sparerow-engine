export interface OrderShippedData {
  orderId: number;
  contactEmail: string;
  shippingRecipientName: string;
  trackingNumber?: string;
  carrier: string;
  carrierStatusLabel?: string;
}

export function orderShippedHtml(data: OrderShippedData): string {
  const trackingSection = data.trackingNumber
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:16px;margin-bottom:24px;">
        <tr>
          <td>
            <p style="margin:0 0 4px;font-size:12px;color:#16a34a;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Tracking Number</p>
            <p style="margin:0;font-size:20px;font-weight:bold;color:#1a1a1a;">${data.trackingNumber}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#555;">Carrier: ${data.carrier}</p>
          </td>
        </tr>
      </table>`
    : `<p style="margin:0 0 24px;color:#555;">Tracking information will be updated shortly.</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Order Shipped</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;">
        <tr><td style="background:#2563eb;padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;">SpareHub</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-block;background:#dbeafe;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;">🚚</div>
          </div>
          <h2 style="margin:0 0 8px;color:#1a1a1a;text-align:center;">Your Order Is On Its Way!</h2>
          <p style="margin:0 0 24px;color:#555;text-align:center;">Hi ${data.shippingRecipientName}, your order <strong>ORD-${data.orderId}</strong> has been picked up and is heading to you.</p>

          ${trackingSection}

          <p style="margin:0;color:#888;font-size:13px;text-align:center;">You'll receive another email once your order has been delivered.</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 32px;text-align:center;">
          <p style="margin:0;color:#aaa;font-size:12px;">© SpareHub · This email was sent to ${data.contactEmail}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
