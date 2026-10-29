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
- `functions/api/` — dormant server-side handlers; the current payment flow does not submit booking requests.
- `BOOKING_SETUP.md` — setup instructions for booking integrations and required environment variables.
- `worker/` — optional Cloudflare Worker project and its own README.

## Run locally

The pages can be opened directly, but a local HTTP server is recommended so browser requests behave like a deployed site. From the project root, run:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

The payment flow can be previewed using a local HTTP server; it does not need a booking API.

## Deploy

The current production domain is served by GitHub Pages (the live response identifies `GitHub.com` and Fastly). GitHub Pages returns `Cache-Control: max-age=600` for HTML and CSS and compresses responses with gzip; it does not provide per-path cache header configuration in this repository.

The root `wrangler.toml` is an optional Cloudflare Worker deployment named `apex-house-site`; it is not the active production host. When deployed, the Worker applies revalidation to HTML and one-year immutable caching to versioned static assets. The current page prepares payment instructions locally after the visitor reviews their service details, then offers a WhatsApp payment confirmation link. It does not send booking requests or emails.

## Editing content and images

- Update page copy and sections in `index.html`.
- Keep image paths and file names in `assets/` exactly as written in the HTML. Hosting environments such as GitHub Pages are case-sensitive.
- Update rates and service details in `services.js` so displayed prices and server-side booking calculations stay consistent.
- Do not put API secrets in browser files such as `index.html` or `services.js`; keep them in the hosting provider’s secret settings.

## License

No license is currently specified. Contact the project owner before reusing the site or its brand assets.
