export async function onRequestGet({ env }) {
  return Response.json({ turnstileSiteKey: env.TURNSTILE_SITE_KEY || "", ownerWhatsApp: String(env.BOOKING_OWNER_WHATSAPP || "").replace(/\D/g, "") }, {
    headers: { "Cache-Control": "no-store" },
  });
}
