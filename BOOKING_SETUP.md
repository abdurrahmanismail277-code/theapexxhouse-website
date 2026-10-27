# Apex House booking setup (no database)

Bookings are sent directly from the Cloudflare Worker to the owner through Resend. There is no database in this flow. `services.js` is shared by the browser and server so pricing and server-side amount calculation use the same rates.

## Cloudflare Worker variables

Create a Google reCAPTCHA v2 checkbox key pair for `theapexxhouse.com` (and add any hostname you use for testing). Set the public site key as `RECAPTCHA_SITE_KEY` in the root `wrangler.toml`; store the secret key only in Cloudflare as `RECAPTCHA_SECRET_KEY`. The booking form loads the public key from `/api/recaptcha-config`, and the Worker verifies each token with Google before accepting a request.

In Cloudflare, set the secret on the active `apex-house-site` Worker. Do not put the secret in `wrangler.toml`, HTML, or GitHub.

The public Google reCAPTCHA site key is set in the root `wrangler.toml`. From the project root, configure the secret with `npx wrangler secret put RECAPTCHA_SECRET_KEY`, then deploy the Worker.

## Cloudflare Worker environment variables

Set these in **Settings → Variables and Secrets** for the active Worker environment:

- `RESEND_API_KEY` — secret Resend API key.
- `RESEND_FROM_EMAIL` — verified sender, for example `The Apex House <bookings@yourdomain.com>`.
- `BOOKING_NOTIFICATION_EMAIL` — owner's inbox.
- `BOOKING_BACKUP_EMAIL` — address BCC'd on owner notifications.
- `BOOKING_OWNER_WHATSAPP` — owner WhatsApp number in international digits, e.g. `2348012345678`.
- `RECAPTCHA_SECRET_KEY` — Google reCAPTCHA v2 secret key (set as a secret, never a plain variable).

Keep secret variables in Cloudflare only. Do not add secret keys to `index.html` or `services.js`.

## Setup steps

1. Add and verify the sending domain in Resend, then set `RESEND_FROM_EMAIL`.
2. Add the Resend owner, backup, and WhatsApp values above.
3. Deploy the root `wrangler.toml` Worker. Confirm `/api/recaptcha-config` returns the public site key and `/api/book` is handled by the Worker.
4. Submit a booking from Preview. Bookings and payments are Nigeria only, in NGN by direct transfer from a Nigerian bank account. International transfers and foreign currencies are not accepted. Physical and Launch Hosting bookings require final amount review first.

The function recalculates the amount from `services.js`, verifies Google reCAPTCHA, checks the form honeypot, accepts Nigerian bookings only, and provides NGN direct bank transfer instructions. It sends the owner alert before the client confirmation. A failed owner email returns a WhatsApp fallback without clearing the form. A failed client email still shows the request as received and triggers a follow-up owner alert.

The form disables its submit button while the request is running and each request gets a unique reference. Without a database, booking records and email are the durable record; the site does not provide booking-status lookup after the confirmation page is closed.
