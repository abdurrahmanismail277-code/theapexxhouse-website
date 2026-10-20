const MAX_BODY_BYTES = 20_000;
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const RESEND_URL = "https://api.resend.com/emails";

let cachedGoogleToken = "";
let googleTokenExpiresAt = 0;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigins = String(env.ALLOWED_ORIGINS || "")
      .split(",").map((value) => value.trim()).filter(Boolean);
    const isAllowedOrigin = allowedOrigins.includes(origin);
    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Vary": "Origin",
      ...(isAllowedOrigin ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      } : {}),
    };
    const respond = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });

    if (request.method === "OPTIONS") {
      return isAllowedOrigin ? new Response(null, { status: 204, headers }) : respond({ ok: false, error: "Origin not allowed." }, 403);
    }
    if (request.method !== "POST") return respond({ ok: false, error: "Use POST to submit a booking." }, 405);
    if (!isAllowedOrigin) return respond({ ok: false, error: "Origin not allowed." }, 403);

    const declaredLength = Number(request.headers.get("Content-Length") || 0);
    if (declaredLength > MAX_BODY_BYTES) return respond({ ok: false, error: "Booking request is too large." }, 413);

    let booking;
    try {
      const raw = await request.text();
      if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return respond({ ok: false, error: "Booking request is too large." }, 413);
      booking = JSON.parse(raw);
    } catch {
      return respond({ ok: false, error: "Send a valid JSON booking." }, 400);
    }

    const validationError = validateBooking(booking);
    if (validationError) return respond({ ok: false, error: validationError }, 400);

    try {
      const row = bookingToSheetRow(booking);
      await appendToSheet(env, row);
    } catch (error) {
      console.error("Google Sheets booking save failed:", error.message);
      return respond({ ok: false, error: "We could not save your request. Please try again or contact us on WhatsApp." }, 502);
    }

    const emailResults = await Promise.allSettled([
      sendEmail(env, {
        to: [env.NOTIFICATION_EMAIL],
        subject: `New booking request ${booking.reference}`,
        text: bookingEmailText(booking, "A new booking request was received."),
        html: bookingEmailHtml(booking, "A new booking request was received."),
      }),
      sendEmail(env, {
        to: [booking.email],
        subject: `We received your booking request ${booking.reference}`,
        text: bookingEmailText(booking, "Thank you. The Apex House has received your booking request and will review it shortly."),
        html: bookingEmailHtml(booking, "Thank you. The Apex House has received your booking request and will review it shortly."),
      }),
    ]);
    const emailStatus = emailResults.every((result) => result.status === "fulfilled") ? "sent" : "partial";
    if (emailStatus !== "sent") {
      for (const result of emailResults) {
        if (result.status === "rejected") console.error("Booking email failed:", result.reason?.message || "Unknown Resend error");
      }
    }
    return respond({ ok: true, emailStatus });
  },
};

function validateBooking(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "Booking details are missing.";
  const textFields = ["reference", "name", "email", "whatsapp", "serviceId", "service", "offerId", "package", "unit", "eventName", "eventType", "eventDate", "mode", "brief"];
  for (const field of textFields) {
    if (typeof value[field] !== "string" || !value[field].trim()) return `Please provide ${field}.`;
    if (value[field].length > 1500) return `${field} is too long.`;
  }
  if (!/^APEX-\d{6}-[A-Z0-9]{4}$/.test(value.reference)) return "Booking reference is invalid.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) || value.email.length > 254) return "Email address is invalid.";
  if (!/^\+[1-9]\d{7,14}$/.test(value.whatsapp)) return "Phone number is invalid.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.eventDate)) return "Event date is invalid.";
  if (!["virtual", "physical"].includes(value.mode)) return "Booking mode is invalid.";
  if (!Number.isSafeInteger(Number(value.quantity)) || Number(value.quantity) < 1 || Number(value.quantity) > 1000) return "Quantity is invalid.";
  if (!Number.isSafeInteger(Number(value.audienceSize)) || Number(value.audienceSize) < 1) return "Audience size is invalid.";
  if (!Number.isSafeInteger(Number(value.amount)) || Number(value.amount) < 0) return "Booking amount is invalid.";
  if (typeof value.amountKnown !== "boolean") return "Quote status is invalid.";
  if (value.consent !== "true") return "Consent is required.";
  if (typeof value.eventName !== "string" || value.eventName.length > 120) return "Event name is too long.";
  if (value.alternateDate && !/^\d{4}-\d{2}-\d{2}$/.test(value.alternateDate)) return "Second-choice date is invalid.";
  return "";
}

function bookingToSheetRow(booking) {
  return [
    new Date().toISOString(), booking.reference, booking.name.trim(), booking.email.trim(), booking.whatsapp.trim(),
    booking.serviceId, booking.service.trim(), booking.mode, booking.offerId, booking.package.trim(),
    Number(booking.quantity), booking.unit.trim(), Number(booking.amount), booking.amountKnown ? "Quoted" : "Quote to confirm",
    booking.eventName.trim(), booking.eventType.trim(), booking.eventDate, booking.alternateDate || "",
    booking.venue || "", booking.platform || "", Number(booking.audienceSize), booking.extraHours || "0", booking.brief.trim(),
  ];
}

async function appendToSheet(env, row) {
  requireEnv(env, ["GOOGLE_CLIENT_EMAIL", "GOOGLE_PRIVATE_KEY", "GOOGLE_SHEET_ID"]);
  const token = await getGoogleAccessToken(env);
  const sheetName = env.GOOGLE_SHEET_NAME || "Bookings";
  const range = `${quoteSheetName(sheetName)}!A:W`;
  // RAW prevents user-supplied text (for example a brief beginning with =) from becoming a Sheet formula.
  const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.GOOGLE_SHEET_ID)}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ majorDimension: "ROWS", values: [row] }),
  });
  if (!response.ok) throw new Error(`Sheets API returned ${response.status}: ${await response.text()}`);
}

async function getGoogleAccessToken(env) {
  if (cachedGoogleToken && Date.now() < googleTokenExpiresAt - 60_000) return cachedGoogleToken;
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(JSON.stringify({
    iss: env.GOOGLE_CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claims}`;
  const privateKey = String(env.GOOGLE_PRIVATE_KEY).replace(/\\n/g, "\n");
  const pemBody = privateKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const keyBytes = Uint8Array.from(atob(pemBody), (char) => char.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", keyBytes, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const assertion = `${unsigned}.${base64UrlBytes(new Uint8Array(signature))}`;
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error(`Google OAuth returned ${response.status}: ${data.error_description || data.error || "token unavailable"}`);
  cachedGoogleToken = data.access_token;
  googleTokenExpiresAt = Date.now() + Number(data.expires_in || 3600) * 1000;
  return cachedGoogleToken;
}

async function sendEmail(env, message) {
  requireEnv(env, ["RESEND_API_KEY", "RESEND_FROM", "NOTIFICATION_EMAIL"]);
  const response = await fetch(RESEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.RESEND_FROM, ...message }),
  });
  if (!response.ok) throw new Error(`Resend returned ${response.status}: ${await response.text()}`);
}

function bookingEmailText(booking, introduction) {
  return `${introduction}\n\nReference: ${booking.reference}\nName: ${booking.name}\nEmail: ${booking.email}\nPhone / WhatsApp: ${booking.whatsapp}\nService: ${booking.service}\nMode: ${booking.mode}\nPackage: ${booking.package}\nQuantity: ${booking.quantity} ${booking.unit}\nAmount: ${booking.amountKnown ? `NGN ${Number(booking.amount).toLocaleString("en-NG")}` : "To be confirmed"}\nEvent: ${booking.eventName} (${booking.eventType})\nPreferred date: ${booking.eventDate}\nSecond-choice date: ${booking.alternateDate || "Not provided"}\nVenue: ${booking.venue || "Not provided"}\nPlatform: ${booking.platform || "Not provided"}\nAudience size: ${booking.audienceSize}\nBrief: ${booking.brief}`;
}

function bookingEmailHtml(booking, introduction) {
  const rows = [
    ["Reference", booking.reference], ["Name", booking.name], ["Email", booking.email], ["Phone / WhatsApp", booking.whatsapp],
    ["Service", booking.service], ["Mode", booking.mode], ["Package", booking.package], ["Quantity", `${booking.quantity} ${booking.unit}`],
    ["Amount", booking.amountKnown ? `NGN ${Number(booking.amount).toLocaleString("en-NG")}` : "To be confirmed"],
    ["Event", `${booking.eventName} (${booking.eventType})`], ["Preferred date", booking.eventDate],
    ["Second-choice date", booking.alternateDate || "Not provided"], ["Venue", booking.venue || "Not provided"],
    ["Platform", booking.platform || "Not provided"], ["Audience size", booking.audienceSize], ["Brief", booking.brief],
  ];
  return `<div style="font-family:Arial,sans-serif;color:#102443;line-height:1.6"><p>${escapeHtml(introduction)}</p><table style="border-collapse:collapse">${rows.map(([label, value]) => `<tr><th align="left" style="padding:7px 14px 7px 0;vertical-align:top">${escapeHtml(label)}</th><td style="padding:7px 0;white-space:pre-wrap">${escapeHtml(String(value))}</td></tr>`).join("")}</table></div>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function quoteSheetName(value) { return `'${String(value).replace(/'/g, "''")}'`; }
function requireEnv(env, names) {
  const missing = names.filter((name) => !env[name]);
  if (missing.length) throw new Error(`Missing Worker configuration: ${missing.join(", ")}`);
}
function base64Url(value) { return base64UrlBytes(new TextEncoder().encode(value)); }
function base64UrlBytes(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
