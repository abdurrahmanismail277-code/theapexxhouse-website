# Apex House booking setup (no database)

Bookings are sent directly from the Cloudflare Pages Function to the owner through Resend. There is no Supabase or other database in this flow. `services.js` is imported by the browser and the server, so pricing cards, the live estimate, and the server calculation all use the same rates.

## Cloudflare Pages environment variables

Set these in **Settings → Variables and Secrets** for both Preview and Production:

- `TURNSTILE_SITE_KEY` — public widget key; `/api/booking-config` returns it to the page.
- `TURNSTILE_SECRET_KEY` — secret used by `/api/book` to verify the form token.
- `RESEND_API_KEY` — secret Resend API key.
- `RESEND_FROM_EMAIL` — verified sender, for example `The Apex House <bookings@yourdomain.com>`.
- `BOOKING_NOTIFICATION_EMAIL` — owner's inbox.
- `BOOKING_BACKUP_EMAIL` — address BCC'd on every owner notification.
- `BOOKING_OWNER_WHATSAPP` — owner WhatsApp number in international digits, e.g. `2348012345678`.
- `PAYSTACK_SECRET_KEY` — secret key for the Paystack account (use test key for Preview and live key for Production).

Keep secret variables in Cloudflare Pages only. Do not add secret keys to `index.html` or `services.js`.

## Setup steps

1. Add and verify the sending domain in Resend, then set `RESEND_FROM_EMAIL`.
2. Create a Cloudflare Turnstile widget for the website hostnames. Set its site key and secret key in Pages.
3. Add the Resend owner, backup, and WhatsApp values above.
4. Add Paystack test and live secret keys to the corresponding Pages environments.
5. Deploy this folder as the Cloudflare Pages project root. Confirm `/functions/api/book.js` is deployed as `/api/book`.
6. Submit a test booking from Preview. Check that the owner email arrives first, the client email contains the correct summary and checkout button for eligible services, and physical/Launch Hosting bookings say the final amount will be confirmed.

The function recalculates the amount from `services.js`, validates Turnstile server-side, creates a Paystack link only for fixed-price virtual services other than Launch Hosting, then sends the owner alert before the client confirmation. A failed owner email returns an error and WhatsApp fallback without clearing the form. A failed client email still shows the request as received and triggers a second owner alert to follow up with that client.

The form disables its submit button while the request is running and each request gets a unique reference. With no database, booking records and email are the durable record; the site does not provide a booking-status lookup after the confirmation page is closed.
