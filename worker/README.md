# The Apex House booking Worker

This plain JavaScript Cloudflare Worker accepts booking JSON from the static site, appends it to a Google Sheet, then sends a notification email and a client acknowledgement through Resend. The Sheet write is the acceptance step: if an email provider is temporarily unavailable, the Worker still returns success after saving the booking and records the email failure in its Cloudflare logs.

## One-time setup

1. Create a Google Sheet with a tab named `Bookings` (or change `GOOGLE_SHEET_NAME`). Add this header row in cells A1:W1: `Received at`, `Reference`, `Name`, `Email`, `Phone / WhatsApp`, `Service ID`, `Service`, `Mode`, `Offer ID`, `Package`, `Quantity`, `Unit`, `Amount NGN`, `Quote status`, `Event name`, `Event type`, `Preferred date`, `Second-choice date`, `Venue`, `Platform`, `Audience size`, `Extra hours`, `Brief`. Share the sheet with the Google service account email as an Editor. Enable the Google Sheets API for that service account's Google Cloud project.
2. Create a Resend account, verify the sending domain, and use a verified sender address in `RESEND_FROM`.
3. Install Wrangler locally (`npm install --global wrangler`) and authenticate (`wrangler login`). Wrangler is only a deployment tool; this Worker has no runtime dependencies.
4. From this folder, deploy with `wrangler deploy`.
5. Copy the deployed `https://...workers.dev/` URL into the `BOOKING_ENDPOINT` constant near the top of the module script in the root `index.html`, then publish the site.
6. In `wrangler.toml`, make `ALLOWED_ORIGINS` a comma-separated list of exact site origins. Include the GitHub Pages origin while testing and the apex/custom-domain origins used in production. Do not include paths or trailing slashes.

## Configure credentials

Set non-secret values as Worker variables in the Cloudflare dashboard (Worker → Settings → Variables and Secrets), or use Wrangler secrets for all values:

```sh
wrangler secret put GOOGLE_CLIENT_EMAIL
wrangler secret put GOOGLE_PRIVATE_KEY
wrangler secret put GOOGLE_SHEET_ID
wrangler secret put RESEND_API_KEY
wrangler secret put RESEND_FROM
wrangler secret put NOTIFICATION_EMAIL
```

Paste the service account private key as PEM when prompted. Google client email, spreadsheet ID, sender address, and notification recipient are configuration, not private keys; they can be plain variables. `GOOGLE_SHEET_NAME` defaults to `Bookings`. Never add real values to this repository, `wrangler.toml`, or the frontend. A local `.dev.vars` file is ignored by Git and can be used with `wrangler dev`.

## Sheet columns

The Worker appends one row per accepted booking, in this order: received timestamp, reference, name, email, phone/WhatsApp, service ID, service, mode, offer ID, package, quantity, unit, amount, quote status, event name, event type, preferred date, alternate date, venue, platform, audience size, extra hours, and brief. The Google service account must have edit access. The site-generated amount is recorded as requested; it is not a payment verification or payment processor.

## Local development and deployment

```sh
wrangler dev
wrangler deploy
```

For local requests, add local-only variables to `worker/.dev.vars` and use a test origin in `ALLOWED_ORIGINS`. Never commit `.dev.vars`. Test with a valid form submission on the configured site origin. The endpoint rejects other origins, non-POST requests, malformed JSON, oversized bodies, and invalid required fields.

## Email behavior

The Worker sends a new-booking notification to `NOTIFICATION_EMAIL` and a receipt-of-request message to the client's submitted email. Email delivery is attempted only after the Sheet append succeeds. Provider failures are logged in Cloudflare and reported in the response's `emailStatus`; a saved booking still returns `{ "ok": true }` so the form does not tell a client to resubmit and create duplicate rows. This Worker does not send or verify bank payments.
