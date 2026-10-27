# Cloudflare performance settings

Configure these in the Cloudflare dashboard for `theapexxhouse.com`:

1. **Caching → Cache Rules → Create rule**
   - Name: `Long cache for static assets`
   - When incoming requests match: **Custom filter expression**
   - Expression: `starts_with(http.request.uri.path, "/assets/")`
   - Cache eligibility: **Eligible for cache**
   - Edge TTL: **Ignore cache-control header and use this TTL** → **1 year**
   - Browser TTL: **Override origin and use this TTL** → **1 year**
2. **Speed → Optimization → Content Optimization**: enable **Brotli** and **Auto Minify** for CSS, JavaScript, and HTML.
3. **Speed → Optimization → Protocol Optimization**: enable **Early Hints**.

Use one year browser caching only after static files have content-hashed names (for example, `site.abc123.css`) and all references point to those names. The repository currently uses stable asset names, so applying a one year browser TTL now can leave visitors with stale files after a deploy. Cloudflare settings are dashboard changes and cannot be applied from this repository.
