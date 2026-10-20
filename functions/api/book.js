import { calculatePrice } from "../../services.js";

const json = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const plain = value => String(value ?? "").replace(/[\r\n]+/g, " ").trim();
const money = amount => `₦${Number(amount).toLocaleString("en-NG")}`;

async function verifyTurnstile(env, request, token) {
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: request.headers.get("CF-Connecting-IP") || "" }),
    });
    return (await response.json().catch(() => ({}))).success === true;
  } catch { return false; }
}

async function sendResend(env, payload, idempotencyKey) {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    console.error("Resend request failed", error instanceof Error ? error.message : "unknown error");
    return { ok: false, status: 0, data: {} };
  }
}

function detailRows(fields) {
  return Object.entries(fields).map(([label, value]) => `<tr><th align="left" style="padding:8px 12px;color:#52647d;font-weight:600;border-bottom:1px solid #e8eef6">${escapeHtml(label)}</th><td style="padding:8px 12px;color:#021A40;border-bottom:1px solid #e8eef6;white-space:pre-wrap">${escapeHtml(value || "Not provided")}</td></tr>`).join("");
}

export async function onRequestPost({ request, env }) {
  if (!env.TURNSTILE_SECRET_KEY || !env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL || !env.BOOKING_NOTIFICATION_EMAIL || !env.BOOKING_BACKUP_EMAIL || !env.BOOKING_OWNER_WHATSAPP) return json({ error: "Booking is temporarily unavailable. Please try again later." }, 503);
  const digits = String(env.BOOKING_OWNER_WHATSAPP).replace(/\D/g, "");
  if (!/^234\d{10}$/.test(digits)) return json({ error: "Booking is temporarily unavailable. Please try again later." }, 503);
  let input;
  try { input = await request.json(); } catch { return json({ error: "Please send a valid booking request." }, 400); }
  if (!input || typeof input !== "object" || Array.isArray(input)) return json({ error: "Please send a valid booking request." }, 400);
  if (String(input.website || "").trim()) return json({ error: "We could not verify this request." }, 400);
  const required = ["serviceId", "offerId", "mode", "eventName", "eventType", "eventDate", "name", "email", "whatsapp", "brief", "turnstileToken"];
  if (required.some(key => typeof input[key] !== "string" || !input[key].trim()) || input.consent !== true || !Number.isInteger(Number(input.audienceSize)) || Number(input.audienceSize) < 1 || Number(input.audienceSize) > 1000000) return json({ error: "Please complete all required fields." }, 400);

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const whatsapp = input.whatsapp.trim();
  const venue = typeof input.venue === "string" ? input.venue.trim() : "";
  const platform = typeof input.platform === "string" ? input.platform.trim() : "";
  if (!emailPattern.test(email) || !/^\+[1-9]\d{7,14}$/.test(whatsapp)) return json({ error: "Please check your email and WhatsApp number." }, 400);
  if (name.length > 120 || email.length > 254 || input.eventName.trim().length > 120 || input.eventType.trim().length > 100 || input.brief.trim().length > 1200 || venue.length > 200 || platform.length > 120) return json({ error: "Please shorten one of the event details and try again." }, 400);
  if (!validDate(input.eventDate) || input.eventDate < new Date().toISOString().slice(0, 10)) return json({ error: "Please select a valid current or future event date." }, 400);
  if (input.alternateDate && (!validDate(input.alternateDate) || input.alternateDate === input.eventDate)) return json({ error: "Please select a different valid second-choice date." }, 400);
  if ((input.mode === "virtual" && !platform) || (input.mode === "physical" && !venue)) return json({ error: "Please provide the venue or virtual platform." }, 400);

  const quantity = Number(input.quantity), extraHours = Number(input.extraHours || 0);
  const quote = calculatePrice(input.serviceId, input.mode, input.offerId, quantity, extraHours);
  if (!quote) return json({ error: "Please choose a valid service, mode, duration, and quantity." }, 400);
  if (!await verifyTurnstile(env, request, input.turnstileToken)) return json({ error: "The security check expired or could not be verified. Please complete it again." }, 400);

  const { service, offer } = quote;
  const reference = `APEX-${crypto.randomUUID()}`;
  const requiresReview = input.mode === "physical" || service.id === "launch-hosting";
  let paymentLink = "";
  if (!requiresReview) {
    if (!env.PAYSTACK_SECRET_KEY) return json({ error: "Online checkout is temporarily unavailable. Please try again later." }, 503);
    try {
      const paystack = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST", headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email, amount: String(quote.amount * 100), currency: "NGN", reference, metadata: { booking_reference: reference, service_id: service.id } }),
      });
      const transaction = await paystack.json().catch(() => ({}));
      if (!paystack.ok || !transaction.status || !transaction.data?.authorization_url) return json({ error: "We could not create your checkout link. Your details are still here; please try again." }, 502);
      paymentLink = transaction.data.authorization_url;
    } catch { return json({ error: "We could not reach Paystack. Your details are still here; please try again." }, 502); }
  }

  const fields = {
    "Booking reference": reference,
    "Service chamber": quote.service.categoryLabel,
    "Service": service.name,
    "Mode": input.mode,
    "Duration or package": offer.label,
    "Quantity": `${quantity} ${offer.unit}${quantity === 1 ? "" : "s"}`,
    "Extra Launch Hosting hours": service.extraHoursAllowed ? `${extraHours} (extra rate confirmed after review)` : "Not applicable",
    "Event name": input.eventName.trim(),
    "Event type": input.eventType.trim(),
    "Preferred date": input.eventDate,
    "Second-choice date": input.alternateDate || "Not provided",
    "Venue": venue || "Not provided",
    "Platform": platform || "Not provided",
    "Transport fare": input.mode === "physical" ? "Not included; final amount confirmed after review" : "Not applicable",
    "Audience size": Number(input.audienceSize).toLocaleString("en-NG"),
    "Name": name,
    "Email": email,
    "WhatsApp": whatsapp,
    "Brief": input.brief.trim(),
    "Consent": "Agreed",
    "Estimated amount": requiresReview ? `${money(quote.amount)} estimate; final amount to be confirmed` : money(quote.amount),
    "Payment link": paymentLink || "Final amount to be confirmed; no payment link created",
  };
  const referenceForMessage = escapeHtml(reference);
  const paymentSummary = requiresReview ? `${money(quote.amount)} estimate; final amount to be confirmed` : money(quote.amount);
  const rows = detailRows(fields);
  const subject = `New booking: ${plain(service.name)} - ${name} - ${reference}`;
  const ownerPayment = paymentLink ? `<p><a href="${escapeHtml(paymentLink)}" style="color:#0164FF;font-weight:700">Open Paystack checkout</a></p>` : `<p><strong>Payment:</strong> Final amount to be confirmed. No payment link created.</p>`;
  const ownerHtml = `<div style="font-family:Arial,sans-serif;color:#021A40"><div style="padding:24px;background:#021A40;color:#fff;border-radius:12px 12px 0 0"><p style="margin:0 0 8px;color:#9fc4ff;letter-spacing:.12em;text-transform:uppercase;font-size:11px">The Apex House</p><h1 style="margin:0;font-size:22px">New booking request</h1></div><p style="padding:0 8px">The client confirmation email will be sent immediately after this owner alert. Reference <strong>${referenceForMessage}</strong>.</p><table role="presentation" style="width:100%;border-collapse:collapse">${rows}</table>${ownerPayment}<p style="margin-top:20px;color:#60718a">Reply directly to this email to contact ${escapeHtml(name)}.</p></div>`;
  const ownerText = `New booking: ${service.name} - ${name} - ${reference}\n\n${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join("\n")}\n\nThe client confirmation email will be sent after this owner alert.`;
  const ownerPayload = { from: env.RESEND_FROM_EMAIL, to: [env.BOOKING_NOTIFICATION_EMAIL], bcc: [env.BOOKING_BACKUP_EMAIL], reply_to: email, subject, html: ownerHtml, text: ownerText };
  const ownerResult = await sendResend(env, ownerPayload, `booking-owner-${reference}`);
  const waMessage = `Hi Apex House, I need help with my booking request ${reference} for ${service.name}.`;
  const whatsappUrl = `https://wa.me/${digits}?text=${encodeURIComponent(waMessage)}`;
  if (!ownerResult.ok) return json({ error: "We could not send your booking to the owner. Your details are still in the form. Please use WhatsApp to reach us.", reference, whatsappUrl }, 502);

  const clientHtml = `<div style="margin:0;background:#f2f6fc;padding:28px 12px;font-family:Arial,sans-serif;color:#021A40"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 12px 36px rgba(2,26,64,.12)"><div style="padding:28px;background:#021A40;color:#fff"><p style="margin:0 0 8px;color:#9fc4ff;font-size:11px;letter-spacing:.16em;text-transform:uppercase">THE APEX HOUSE</p><h1 style="margin:0;font-size:26px;line-height:1.2">Your request is with us.</h1></div><div style="padding:26px"><p style="margin-top:0">Hello ${escapeHtml(name)},</p><p>Thank you for booking with us. We have received your request and sent it to our team for review.</p><div style="padding:16px;border-radius:10px;background:#edf4ff"><p style="margin:0 0 6px;color:#60718a;font-size:12px">BOOKING REFERENCE</p><p style="margin:0;font-size:18px;font-weight:700">${referenceForMessage}</p></div><h2 style="margin:24px 0 10px;font-size:16px">Your request</h2><table role="presentation" style="width:100%;border-collapse:collapse">${detailRows({ "Service": `${quote.service.categoryLabel} / ${service.name}`, "Mode": input.mode, "Package": offer.label, "Quantity": fields.Quantity, "Event": `${fields["Event name"]} (${fields["Event type"]})`, "Preferred date": input.eventDate, "Second-choice date": fields["Second-choice date"], "Venue or platform": input.mode === "physical" ? venue : platform, "Audience size": fields["Audience size"], "Brief": fields.Brief, "Transport fare": fields["Transport fare"], "Estimated amount": paymentSummary })}</table>${paymentLink ? `<div style="padding:24px 0 8px;text-align:center"><a href="${escapeHtml(paymentLink)}" style="display:inline-block;padding:15px 26px;border-radius:999px;background:#0164FF;color:#fff;text-decoration:none;font-weight:700">Pay now</a><p style="margin:12px 0 0;color:#60718a;font-size:12px">Secure checkout powered by Paystack</p></div>` : `<div style="margin-top:20px;padding:16px;border-radius:10px;background:#fff7e8;color:#60430c"><strong>Final amount will be confirmed shortly.</strong><br>We will contact you after reviewing your event details.</div>`}<p style="margin:24px 0 8px">Questions? Message us on WhatsApp:</p><p style="margin:0"><a href="https://wa.me/${digits}" style="color:#0164FF;font-weight:700">+${digits}</a></p><p style="margin-top:24px;color:#60718a;font-size:12px">We look forward to making your moment matter.<br><strong style="color:#021A40">The Apex House team</strong></p></div></div></div>`;
  const clientText = `Hello ${name},\n\nWe received your booking request.\nReference: ${reference}\nService: ${quote.service.categoryLabel} / ${service.name}\nMode: ${input.mode}\nPackage: ${offer.label}\nQuantity: ${fields.Quantity}\nEvent: ${fields["Event name"]} (${fields["Event type"]})\nPreferred date: ${input.eventDate}\nSecond-choice date: ${fields["Second-choice date"]}\nVenue/platform: ${input.mode === "physical" ? venue : platform}\nAmount: ${paymentSummary}${paymentLink ? `\nPay now: ${paymentLink}` : "\nFinal amount will be confirmed shortly."}\n\nWhatsApp: +${digits}\n\nThe Apex House team`;
  const clientResult = await sendResend(env, { from: env.RESEND_FROM_EMAIL, to: [email], subject: `We received your booking request - ${reference}`, html: clientHtml, text: clientText }, `booking-client-${reference}`);
  if (!clientResult.ok) {
    await sendResend(env, { from: env.RESEND_FROM_EMAIL, to: [env.BOOKING_NOTIFICATION_EMAIL], bcc: [env.BOOKING_BACKUP_EMAIL], reply_to: email, subject: `Client email failed: ${reference}`, text: `The owner alert succeeded, but the client confirmation email could not be delivered.\nReference: ${reference}\nClient: ${name} <${email}>\nResend status: ${clientResult.status}. Please contact the client directly.` }, `booking-client-failure-${reference}`);
  }
  return json({ ok: true, reference, amount: quote.amount, finalAmountToBeConfirmed: requiresReview, paymentLink, clientEmailSent: clientResult.ok, whatsappUrl }, 201);
}
