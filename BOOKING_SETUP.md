# Booking and payment flow

The booking page submits reviewed booking details to the `apex-house-site` Cloudflare Worker. The Worker verifies the reCAPTCHA token, calculates the price, saves the booking in the `APEX_HOUSE_BOOKINGS` KV namespace, and then attempts the owner and client emails through Resend. A Resend failure is logged and shown as a notice on the payment page; it does not discard a saved booking or block the payment instructions.

The site key is configured in `assets/js/booking.js` as a reCAPTCHA v2 checkbox key. In the Google reCAPTCHA Admin Console, confirm that the site key and the Worker `RECAPTCHA_SECRET_KEY` belong to the same v2 checkbox key pair and that both `theapexxhouse.com` and `www.theapexxhouse.com` are allowed hostnames.

The root `wrangler.toml` binds the `APEX_HOUSE_BOOKINGS` KV namespace. The Cloudflare Worker must have these settings configured:

- `RECAPTCHA_SECRET_KEY` — secret for the v2 checkbox site key in the frontend.
- `RESEND_API_KEY` — Resend API key.
- `RESEND_FROM_EMAIL` (or `RESEND_FROM`) — verified sender address in Resend.
- `NOTIFY_EMAIL` — owner notification recipient.

Never commit secret values to the repository. If email settings are missing or Resend rejects a message, the Worker still returns the saved booking and payment details with an email delivery warning.

For fixed-price virtual services, the payment screen shows the exact total and a generated payment narration. Physical moderation and Launch Hosting require a final quote; visitors are directed to WhatsApp to confirm the amount. After paying, visitors can use the WhatsApp confirmation link to share their service, event, payment reference, and receipt.
