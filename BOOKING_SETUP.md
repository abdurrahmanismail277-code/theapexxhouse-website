# Apex House booking setup (no database)

Bookings are sent directly from the Cloudflare Pages Function to the owner through Resend. There is no database in this flow. `services.js` is shared by the browser and server so pricing and server-side amount calculation use the same rates.

## Cloudflare Pages environment variables

Set these in **Settings → Variables and Secrets** for Preview and Production:

- `RESEND_API_KEY` — secret Resend API key.
- `RESEND_FROM_EMAIL` — verified sender, for example `The Apex House <bookings@yourdomain.com>`.
- `BOOKING_NOTIFICATION_EMAIL` — owner's inbox.
- `BOOKING_BACKUP_EMAIL` — address BCC'd on owner notifications.
- `BOOKING_OWNER_WHATSAPP` — owner WhatsApp number in international digits, e.g. `2348012345678`.

Keep secret variables in Cloudflare Pages only. Do not add secret keys to `index.html` or `services.js`.

## Setup steps

1. Add and verify the sending domain in Resend, then set `RESEND_FROM_EMAIL`.
2. Add the Resend owner, backup, and WhatsApp values above.
3. Deploy this folder as the Cloudflare Pages project root. Confirm `/functions/api/book.js` is deployed as `/api/book`.
4. Submit a booking from Preview. Bookings and payments are Nigeria only, in NGN by direct transfer from a Nigerian bank account. International transfers and foreign currencies are not accepted. Physical and Launch Hosting bookings require final amount review first.

The function recalculates the amount from `services.js`, checks the form honeypot, accepts Nigerian bookings only, and provides NGN direct bank transfer instructions. It sends the owner alert before the client confirmation. A failed owner email returns a WhatsApp fallback without clearing the form. A failed client email still shows the request as received and triggers a follow-up owner alert.

The form disables its submit button while the request is running and each request gets a unique reference. Without a database, booking records and email are the durable record; the site does not provide booking-status lookup after the confirmation page is closed.
