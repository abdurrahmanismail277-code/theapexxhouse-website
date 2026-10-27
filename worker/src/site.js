import { onRequestPost } from "../../functions/api/book.js";

const allowedOrigins = new Set([
  "https://theapexxhouse.com",
  "https://www.theapexxhouse.com",
]);

const json = (body, status = 200) => Response.json(body, {
  status,
  headers: { "Cache-Control": "no-store", "Allow": "POST, OPTIONS" },
});

function addCorsHeaders(response, origin) {
  const headers = new Headers(response.headers);
  headers.append("Vary", "Origin");
  if (allowedOrigins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/book") {
      const origin = request.headers.get("Origin") || "";
      if (origin && !allowedOrigins.has(origin)) return json({ error: "This site is not allowed to submit bookings." }, 403);
      if (request.method === "OPTIONS") {
        if (!allowedOrigins.has(origin)) return json({ error: "This site is not allowed to submit bookings." }, 403);
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "86400",
            "Vary": "Origin",
          },
        });
      }
      if (request.method !== "POST") {
        return addCorsHeaders(json({ error: "Use POST to send a booking request." }, 405), origin);
      }
      return addCorsHeaders(await onRequestPost({ request, env }), origin);
    }

    if (pathname.startsWith("/api/")) {
      return json({ error: "API route not found." }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};
