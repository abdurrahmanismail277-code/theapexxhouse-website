import { onRequestPost } from "../../functions/api/book.js";

const json = (body, status = 200) => Response.json(body, {
  status,
  headers: { "Cache-Control": "no-store", "Allow": "POST, OPTIONS" },
});

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/book") {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: { "Access-Control-Allow-Methods": "POST, OPTIONS", "Allow": "POST, OPTIONS" },
        });
      }
      if (request.method !== "POST") {
        return json({ error: "Use POST to send a booking request." }, 405);
      }
      return onRequestPost({ request, env });
    }

    if (pathname.startsWith("/api/")) {
      return json({ error: "API route not found." }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};
