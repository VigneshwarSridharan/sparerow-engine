export interface PasswordResetData {
  resetLink: string;
  contactEmail: string;
}

export function passwordResetHtml(data: PasswordResetData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reset Your Password</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;">
        <tr><td style="background:#2563eb;padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;">Sparerow</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 8px;color:#1a1a1a;">Reset Your Password</h2>
          <p style="margin:0 0 24px;color:#555;">We received a request to reset the password for your Sparerow account. Click the button below to choose a new password. This link expires in 1 hour.</p>

          <div style="text-align:center;margin-bottom:24px;">
            <a href="${data.resetLink}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px;">Reset Password</a>
          </div>

          <p style="margin:0 0 8px;color:#888;font-size:13px;">Or copy this link into your browser:</p>
          <p style="margin:0 0 24px;word-break:break-all;font-size:12px;color:#555;">${data.resetLink}</p>

          <p style="margin:0;color:#888;font-size:13px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
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
