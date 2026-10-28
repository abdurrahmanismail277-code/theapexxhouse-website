const json = (body, status = 200, headers = {}) => Response.json(body, {
  status,
  headers: { "Cache-Control": "no-store", ...headers },
});

const allowedOrigins = new Set(["https://theapexxhouse.com", "https://www.theapexxhouse.com"]);
const verificationCorsHeaders = origin => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  "Cache-Control": "no-store",
  Vary: "Origin",
});

async function verifyRecaptcha(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin || !allowedOrigins.has(origin)) return json({ success: false, error: "Request origin is not allowed." }, 403);
  const corsHeaders = verificationCorsHeaders(origin);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return json({ success: false, error: "Method not allowed." }, 405, corsHeaders);
  if (!env.RECAPTCHA_SECRET_KEY) return json({ success: false, error: "Verification is temporarily unavailable. Please contact us on WhatsApp." }, 503, corsHeaders);

  let body;
  try { body = await request.json(); } catch { return json({ success: false, error: "Invalid verification request." }, 400, corsHeaders); }
  const token = typeof body?.token === "string" ? body.token : "";
  if (!token || token.length > 4096) return json({ success: false, error: "Please complete the reCAPTCHA check." }, 400, corsHeaders);

  const parameters = new URLSearchParams({ secret: env.RECAPTCHA_SECRET_KEY, response: token });
  let verification;
  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: parameters,
    });
    verification = await response.json();
  } catch {
    return json({ success: false, error: "Verification is temporarily unavailable. Please try again." }, 503, corsHeaders);
  }

  const validHostnames = new Set(["theapexxhouse.com", "www.theapexxhouse.com"]);
  if (verification.success !== true || !validHostnames.has(verification.hostname)) {
    return json({ success: false, error: "We could not verify your request. Please try the reCAPTCHA check again." }, 400, corsHeaders);
  }
  return json({ success: true }, 200, corsHeaders);
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/recaptcha/verify") return verifyRecaptcha(request, env);

    if (pathname.startsWith("/api/")) {
      return json({ error: "API route not found." }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};
