/**
 * Seeds Terms & Conditions, Privacy Policy (as CMS blocks) and FAQ entries.
 * Safe to re-run — skips entries that already exist by slug / question.
 */
import type { Core } from '@strapi/strapi';
import { createStrapi } from '@strapi/strapi';
import path from 'path';

const TERMS_SLUG = 'terms-and-conditions';
const PRIVACY_SLUG = 'privacy-policy';

const TERMS_BODY = `
<h2>1. Introduction</h2>
<p>These Terms &amp; Conditions ("Terms") govern your use of Sparerow ("we", "our", "us") and any purchase made through our website. By placing an order you agree to these Terms in full.</p>

<h2>2. Eligibility</h2>
<p>You must be at least 18 years old and a resident of India to purchase from Sparerow. By using our services you represent that you meet these requirements.</p>

<h2>3. Products &amp; Pricing</h2>
<p>All prices are listed in Indian Rupees (INR) and are inclusive of applicable taxes unless stated otherwise. We reserve the right to update prices at any time without prior notice. The price displayed at the time of checkout is the final price for that transaction.</p>

<h2>4. Order Placement &amp; Acceptance</h2>
<p>An order placed on our website constitutes an offer to purchase. We reserve the right to accept or reject any order. An order is confirmed only after you receive an order-confirmation email and successful payment authorisation via Razorpay.</p>

<h2>5. Payment</h2>
<p>Payments are processed securely through <strong>Razorpay</strong>, a PCI-DSS compliant payment gateway. We accept UPI, credit/debit cards, net banking, and popular wallets. Sparerow does not store your card or bank account details on our servers.</p>
<p>In the event of a payment failure, any amount debited will be automatically refunded to the original payment source within 5–7 business days by Razorpay. If you do not receive the refund, please contact us with your Razorpay payment ID.</p>

<h2>6. Shipping &amp; Delivery</h2>
<p>We ship pan-India. Estimated delivery times are 3–7 business days depending on your location. Shipping charges (if any) are displayed at checkout. We are not liable for delays caused by courier partners, natural events, or customs.</p>

<h2>7. Returns &amp; Refunds</h2>
<p>You may return an unused, unopened product within <strong>7 days</strong> of delivery. To initiate a return, contact our support team with your order ID and reason for return. Refunds are processed within 7–10 business days after we receive and inspect the returned item. Shipping charges are non-refundable.</p>

<h2>8. Warranty</h2>
<p>All products carry a <strong>90-day warranty</strong> against manufacturing defects. This warranty does not cover physical damage, water damage, or issues arising from improper installation. Warranty claims must be submitted with proof of purchase and order ID.</p>

<h2>9. Intellectual Property</h2>
<p>All content on Sparerow, including logos, product descriptions, and images, is the property of Sparerow or its content suppliers and is protected by Indian intellectual property laws. You may not reproduce or distribute any content without prior written consent.</p>

<h2>10. Limitation of Liability</h2>
<p>Sparerow's total liability for any claim arising from a purchase shall not exceed the amount paid for the specific product. We are not liable for indirect, incidental, or consequential damages.</p>

<h2>11. Governing Law</h2>
<p>These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of Bengaluru, Karnataka.</p>

<h2>12. Changes to Terms</h2>
<p>We may update these Terms at any time. Continued use of our platform after changes constitutes acceptance of the updated Terms.</p>

<h2>13. Contact</h2>
<p>For any questions regarding these Terms, write to us at <a href="mailto:support@sparerow.in">support@sparerow.in</a> or call +91 98765 43210 (Mon–Sat, 9 AM – 7 PM).</p>
<p><em>Last updated: May 2026</em></p>
`.trim();

const PRIVACY_BODY = `
<h2>1. Overview</h2>
<p>Sparerow ("we", "our") is committed to protecting your personal information. This Privacy Policy explains what data we collect, how we use it, and your rights regarding your data, in compliance with the Information Technology Act, 2000 and applicable Indian data protection regulations.</p>

<h2>2. Information We Collect</h2>
<ul>
  <li><strong>Account information:</strong> name, email address, phone number, and password (hashed).</li>
  <li><strong>Order information:</strong> shipping address, items purchased, and order history.</li>
  <li><strong>Payment information:</strong> we do <em>not</em> store card or bank details. All payment data is handled by <strong>Razorpay</strong> under their privacy policy.</li>
  <li><strong>Usage data:</strong> pages visited, browser type, IP address, and referral source via analytics.</li>
  <li><strong>Communication data:</strong> support messages you send us.</li>
</ul>

<h2>3. How We Use Your Information</h2>
<ul>
  <li>Process and fulfil your orders and send order confirmations.</li>
  <li>Communicate shipping updates and delivery notifications.</li>
  <li>Respond to support enquiries.</li>
  <li>Detect fraud and prevent unauthorised access.</li>
  <li>Improve our website and product catalogue.</li>
  <li>Send promotional communications (only with your consent; you may unsubscribe at any time).</li>
</ul>

<h2>4. Payment Data &amp; Razorpay</h2>
<p>All payment transactions on Sparerow are processed by <strong>Razorpay Software Private Limited</strong>, a PCI-DSS Level 1 certified payment gateway. When you make a payment, you are submitting your financial information directly to Razorpay. We receive only a payment confirmation and a Razorpay transaction ID. We do not have access to your card number, CVV, or bank account credentials. Please refer to <a href="https://razorpay.com/privacy/" target="_blank" rel="noopener noreferrer">Razorpay's Privacy Policy</a> for details on how they handle your payment data.</p>

<h2>5. Cookies</h2>
<p>We use essential cookies to maintain your session and shopping cart. We may also use analytics cookies (e.g., Google Analytics) to understand usage patterns. You can disable cookies in your browser settings, but this may affect site functionality.</p>

<h2>6. Data Sharing</h2>
<p>We do not sell your personal data. We share data only with:</p>
<ul>
  <li><strong>Razorpay</strong> – to process payments.</li>
  <li><strong>Shipping partners</strong> (Shiprocket, Delhivery) – to fulfil and track deliveries.</li>
  <li><strong>Legal authorities</strong> – when required by law or court order.</li>
</ul>

<h2>7. Data Retention</h2>
<p>We retain your account and order data for a minimum of 5 years as required by Indian tax and commerce regulations. You may request deletion of your account; however, order records may be retained for legal compliance purposes.</p>

<h2>8. Data Security</h2>
<p>We use industry-standard security measures including HTTPS encryption, hashed passwords, and access controls to protect your personal data. Despite these measures, no system is completely secure and we cannot guarantee absolute security.</p>

<h2>9. Your Rights</h2>
<p>You have the right to:</p>
<ul>
  <li>Access the personal data we hold about you.</li>
  <li>Request correction of inaccurate data.</li>
  <li>Request deletion of your account and associated data (subject to legal retention requirements).</li>
  <li>Opt out of marketing communications at any time.</li>
</ul>
<p>To exercise these rights, email us at <a href="mailto:privacy@sparerow.in">privacy@sparerow.in</a>.</p>

<h2>10. Children's Privacy</h2>
<p>Our services are not directed to individuals under 18. We do not knowingly collect data from minors.</p>

<h2>11. Changes to This Policy</h2>
<p>We may update this Privacy Policy periodically. We will notify you of material changes by email or a prominent notice on our website.</p>

<h2>12. Contact</h2>
<p>For privacy-related queries, contact our Data Protection Officer at <a href="mailto:privacy@sparerow.in">privacy@sparerow.in</a> or write to: Sparerow, Industrial Area Phase 1, Bengaluru – 560001, Karnataka, India.</p>
<p><em>Last updated: May 2026</em></p>
`.trim();

const FAQS: { question: string; answer: string; sortOrder: number }[] = [
  {
    sortOrder: 1,
    question: 'What payment methods are accepted?',
    answer: `<p>We accept all major payment methods through <strong>Razorpay</strong>, including:</p>
<ul>
  <li>UPI (GPay, PhonePe, Paytm, BHIM)</li>
  <li>Credit and debit cards (Visa, Mastercard, RuPay, Amex)</li>
  <li>Net banking (all major Indian banks)</li>
  <li>Popular wallets (Paytm, Amazon Pay, etc.)</li>
</ul>
<p>All transactions are secured by Razorpay's PCI-DSS Level 1 compliant infrastructure.</p>`,
  },
  {
    sortOrder: 2,
    question: 'Is my payment information secure?',
    answer: `<p>Yes. Sparerow does not store your card number, CVV, or bank account details on our servers. All payment data is handled exclusively by <strong>Razorpay</strong>, which is certified to the highest industry security standard (PCI-DSS Level 1). Your financial information is encrypted end-to-end and never accessible to us.</p>`,
  },
  {
    sortOrder: 3,
    question: 'My payment failed but money was deducted. What should I do?',
    answer: `<p>This can happen when a transaction is interrupted mid-flow. Here's what to do:</p>
<ol>
  <li>Wait 10–15 minutes — most such deductions are automatically reversed by your bank or Razorpay.</li>
  <li>Check your bank statement. If a deduction appears, note the <strong>Razorpay Payment ID</strong> (starts with "pay_") from your SMS or email.</li>
  <li>Email us at <a href="mailto:support@sparerow.in">support@sparerow.in</a> with your Payment ID and order details.</li>
  <li>Refunds for failed payments are typically credited within <strong>5–7 business days</strong>.</li>
</ol>`,
  },
  {
    sortOrder: 4,
    question: 'Can I pay using EMI?',
    answer: `<p>Yes, EMI options are available for eligible credit cards through Razorpay at checkout. Available tenures (3, 6, 9, 12 months) and applicable banks are displayed on the payment page. EMI availability depends on your card issuer and the order amount.</p>`,
  },
  {
    sortOrder: 5,
    question: 'How long does delivery take?',
    answer: `<p>Standard delivery takes <strong>3–7 business days</strong> depending on your location:</p>
<ul>
  <li>Metro cities (Bengaluru, Mumbai, Delhi, Chennai, Hyderabad): 2–4 days</li>
  <li>Tier-2 cities: 3–5 days</li>
  <li>Remote / rural areas: 5–7 days</li>
</ul>
<p>You will receive a tracking link via SMS and email once your order is shipped.</p>`,
  },
  {
    sortOrder: 6,
    question: 'How do I track my order?',
    answer: `<p>Once your order is dispatched, you will receive a tracking number via SMS and email. You can also:</p>
<ul>
  <li>Log in to your Sparerow account → <strong>My Orders</strong> to view real-time shipment status.</li>
  <li>Use the tracking number directly on the carrier's website (Shiprocket, Delhivery, or the assigned courier).</li>
</ul>`,
  },
  {
    sortOrder: 7,
    question: 'What is the return policy?',
    answer: `<p>We offer a <strong>7-day return window</strong> from the date of delivery for unused, unopened products in original packaging. To initiate a return:</p>
<ol>
  <li>Email <a href="mailto:support@sparerow.in">support@sparerow.in</a> with your order ID and reason for return.</li>
  <li>Our team will arrange a reverse pickup within 2 business days.</li>
  <li>Once the item is received and inspected, a refund is issued within 7–10 business days to the original payment source.</li>
</ol>
<p><strong>Note:</strong> Products that have been installed or show signs of use are not eligible for return.</p>`,
  },
  {
    sortOrder: 8,
    question: 'What warranty do products carry?',
    answer: `<p>All spare parts sold on Sparerow come with a <strong>90-day warranty</strong> against manufacturing defects. The warranty covers:</p>
<ul>
  <li>Component failure under normal use conditions.</li>
  <li>Parts that stop functioning without physical damage.</li>
</ul>
<p>The warranty does <strong>not</strong> cover:</p>
<ul>
  <li>Physical damage (cracked, bent, or broken parts).</li>
  <li>Water or liquid damage.</li>
  <li>Damage caused by incorrect installation.</li>
</ul>
<p>To raise a warranty claim, email us with your order ID, product name, and a description of the issue.</p>`,
  },
  {
    sortOrder: 9,
    question: 'Can I cancel my order?',
    answer: `<p>Orders can be cancelled <strong>before they are dispatched</strong>. To cancel:</p>
<ol>
  <li>Email <a href="mailto:support@sparerow.in">support@sparerow.in</a> with your order ID as soon as possible.</li>
  <li>If the order has not yet shipped, we will cancel it and process a full refund within 5–7 business days.</li>
</ol>
<p>Once an order has been dispatched, cancellation is not possible — you will need to initiate a return after delivery.</p>`,
  },
  {
    sortOrder: 10,
    question: 'How do I know if a spare part is compatible with my device?',
    answer: `<p>Every product listing displays the compatible brands and models. If you are unsure, please:</p>
<ul>
  <li>Check the product description for compatibility details.</li>
  <li>Contact our support team at <a href="mailto:support@sparerow.in">support@sparerow.in</a> or call +91 98765 43210 with your device model number — we'll confirm compatibility before you order.</li>
</ul>`,
  },
  {
    sortOrder: 11,
    question: 'Are the spare parts genuine / original?',
    answer: `<p>Yes. Sparerow sources parts from verified distributors and authorised suppliers. Each product listing specifies whether the part is OEM (Original Equipment Manufacturer), OEM-compatible, or aftermarket. We do not sell counterfeit parts.</p>`,
  },
  {
    sortOrder: 12,
    question: 'I did not receive an order confirmation email. What should I do?',
    answer: `<p>Please check your spam / junk folder first. If you still cannot find it:</p>
<ol>
  <li>Log in to your Sparerow account → <strong>My Orders</strong> to confirm the order status.</li>
  <li>Verify that your payment was successful via your Razorpay confirmation SMS or bank statement.</li>
  <li>If the order appears in your account but no email was received, contact us at <a href="mailto:support@sparerow.in">support@sparerow.in</a> and we'll resend the confirmation.</li>
</ol>`,
  },
];

async function upsertCmsBlock(
  app: Core.Strapi,
  slug: string,
  title: string,
  body: string
) {
  const existing = await app.db.query('api::cms-block.cms-block').findOne({ where: { slug } });
  if (existing) {
    await app.db.query('api::cms-block.cms-block').update({ where: { id: existing.id }, data: { title, body, isActive: true } });
    app.log.info(`Updated CMS block: ${slug}`);
  } else {
    await app.db.query('api::cms-block.cms-block').create({ data: { slug, title, body, isActive: true } });
    app.log.info(`Created CMS block: ${slug}`);
  }
}

async function upsertFaq(
  app: Core.Strapi,
  faq: { question: string; answer: string; sortOrder: number }
) {
  const existing = await app.db.query('api::faq.faq').findOne({ where: { question: faq.question } });
  if (existing) {
    await app.db.query('api::faq.faq').update({ where: { id: existing.id }, data: { answer: faq.answer, sortOrder: faq.sortOrder, isActive: true } });
    app.log.info(`Updated FAQ: ${faq.question.substring(0, 50)}`);
  } else {
    await app.db.query('api::faq.faq').create({ data: { ...faq, isActive: true } });
    app.log.info(`Created FAQ: ${faq.question.substring(0, 50)}`);
  }
}

async function main() {
  const appDir = process.cwd();
  const distDir = path.join(appDir, 'dist');
  const app = createStrapi({ appDir, distDir, autoReload: false, serveAdminPanel: false });
  await app.load();

  await upsertCmsBlock(app, TERMS_SLUG, 'Terms & Conditions', TERMS_BODY);
  await upsertCmsBlock(app, PRIVACY_SLUG, 'Privacy Policy', PRIVACY_BODY);

  for (const faq of FAQS) {
    await upsertFaq(app, faq);
  }

  app.log.info('Legal seed completed');
  await app.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
