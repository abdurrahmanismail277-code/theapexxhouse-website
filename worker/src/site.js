const json = (body, status = 200) => Response.json(body, {
  status,
  headers: { "Cache-Control": "no-store" },
});

async function verifyRecaptcha(request, env) {
  if (request.method !== "POST") return json({ success: false, error: "Method not allowed." }, 405);
  if (!env.RECAPTCHA_SECRET_KEY) return json({ success: false, error: "Verification is temporarily unavailable. Please contact us on WhatsApp." }, 503);

  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return json({ success: false, error: "Request origin is not allowed." }, 403);

  let body;
  try { body = await request.json(); } catch { return json({ success: false, error: "Invalid verification request." }, 400); }
  const token = typeof body?.token === "string" ? body.token : "";
  if (!token || token.length > 4096) return json({ success: false, error: "Please complete the reCAPTCHA check." }, 400);

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
    return json({ success: false, error: "Verification is temporarily unavailable. Please try again." }, 503);
  }

  const validHostnames = new Set(["theapexxhouse.com", "www.theapexxhouse.com"]);
  if (verification.success !== true || !validHostnames.has(verification.hostname)) {
    return json({ success: false, error: "We could not verify your request. Please try the reCAPTCHA check again." }, 400);
  }
  return json({ success: true });
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
