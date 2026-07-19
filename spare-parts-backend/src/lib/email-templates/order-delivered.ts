export interface OrderDeliveredData {
  orderId: number;
  contactEmail: string;
  shippingRecipientName: string;
}

export function orderDeliveredHtml(data: OrderDeliveredData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Order Delivered</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;">
        <tr><td style="background:#2563eb;padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;">Sparerow</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-block;background:#dcfce7;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;">✅</div>
          </div>
          <h2 style="margin:0 0 8px;color:#1a1a1a;text-align:center;">Order Delivered!</h2>
          <p style="margin:0 0 24px;color:#555;text-align:center;">Hi ${data.shippingRecipientName}, your order <strong>ORD-${data.orderId}</strong> has been delivered. We hope you love your parts!</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9ff;border-radius:6px;padding:16px;margin-bottom:24px;text-align:center;">
            <tr><td>
              <p style="margin:0 0 8px;color:#555;font-size:14px;">Happy with your purchase? Let us know!</p>
              <p style="margin:0;color:#888;font-size:13px;">Visit your account to track order history and reorder parts easily.</p>
            </td></tr>
          </table>

          <p style="margin:0;color:#888;font-size:13px;text-align:center;">Thank you for choosing Sparerow.</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 32px;text-align:center;">
          <p style="margin:0;color:#aaa;font-size:12px;">© Sparerow · This email was sent to ${data.contactEmail}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
