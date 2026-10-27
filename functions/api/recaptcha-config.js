export async function onRequestGet({ env }) {
  const siteKey = String(env.RECAPTCHA_SITE_KEY || "").trim();
  if (!siteKey || siteKey.startsWith("REPLACE_WITH_")) {
    return Response.json({ error: "Google reCAPTCHA site key has not been configured in Cloudflare." }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return Response.json({ siteKey }, { headers: { "Cache-Control": "no-store" } });
}
