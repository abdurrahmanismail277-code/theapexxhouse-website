# The Apex House Website

Website for The Apex House, an event hosting and moderation business. The site presents services, past programs, client testimonials, founder information, articles, and a booking form.

## Project contents

- `index.html` — responsive homepage, service summaries, and pricing cards.
- `book.html` — standalone multi-step booking page for Nigerian naira bookings and payment instructions.
- `assets/js/booking.js` — browser-side booking flow loaded only by `book.html`.
- `assets/js/pricing.js` — homepage service pricing cards and category tabs.
- `privacy-policy.html` — privacy policy.
- `services.js` — shared service and pricing data used by the site and booking function.
- `assets/` — logo, photographs, client marks, program images, testimonials, and payment-provider branding.
- `functions/api/` — Cloudflare Pages Functions for booking configuration and submissions.
- `BOOKING_SETUP.md` — setup instructions for booking integrations and required environment variables.
- `worker/` — optional Cloudflare Worker project and its own README.

## Run locally

The pages can be opened directly, but a local HTTP server is recommended so browser requests behave like a deployed site. From the project root, run:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

For booking API behavior, use Cloudflare Pages local development (`wrangler pages dev`) with the project’s Pages Functions and environment variables configured. See [BOOKING_SETUP.md](BOOKING_SETUP.md).

## Deploy

Deploy the project root as a **Cloudflare Pages** project to use the booking endpoints in `functions/api/`. Configure the required secrets and public settings in the Cloudflare Pages environment. The booking flow uses Turnstile, Resend, and Paystack; follow [BOOKING_SETUP.md](BOOKING_SETUP.md) for the exact variables and setup steps.

GitHub Pages can host the static HTML, but it does not run Cloudflare Pages Functions. If you use GitHub Pages, the site’s booking API will need to be hosted separately and configured accordingly.

## Editing content and images

- Update page copy and sections in `index.html`.
- Keep image paths and file names in `assets/` exactly as written in the HTML. Hosting environments such as GitHub Pages are case-sensitive.
- Update rates and service details in `services.js` so displayed prices and server-side booking calculations stay consistent.
- Do not put API secrets in browser files such as `index.html` or `services.js`; keep them in the hosting provider’s secret settings.

## License

No license is currently specified. Contact the project owner before reusing the site or its brand assets.
