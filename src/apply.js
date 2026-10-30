// Quota application endpoint: POST /api/apply
// Called from src/worker.js. The site's form posts here (same domain, so browsers and
// ad blockers don't block it). This code validates the application and emails it to the
// recruiting inbox using Cloudflare Email Routing (the SEND_EMAIL binding in wrangler.jsonc).
//
// ONE-TIME SETUP: in Cloudflare, go to quotasaleshq.com -> Email -> Email Routing ->
// Destination addresses, and make sure quotasaleshq@gmail.com is listed as Verified.
// Cloudflare only sends to verified addresses.

import { EmailMessage } from "cloudflare:email";

const TO_EMAIL = "quotasaleshq@gmail.com";
const FROM_EMAIL = "apply@quotasaleshq.com";
const FROM_NAME = "Quota Applications";
const FIELDS = {
  first_name: "First name",
  last_name: "Last name",
  phone: "Phone",
  email: "Email",
  location: "City & state",
  experience: "Sales experience",
};

export async function handleApply(request, env) {
  const wantsJSON = (request.headers.get("accept") || "").includes("application/json");

  // Read the form (works for both background sends and plain form posts)
  let data = {};
  try {
    const type = request.headers.get("content-type") || "";
    if (type.includes("application/json")) data = await request.json();
    else for (const [k, v] of await request.formData()) data[k] = String(v);
  } catch {
    return respond(false, "Could not read the form.", 400);
  }

  // Validate. Strip line breaks so nothing can be injected into email headers.
  const clean = {};
  for (const key of Object.keys(FIELDS)) {
    const value = String(data[key] ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, 200);
    if (!value) return respond(false, `Missing ${FIELDS[key].toLowerCase()}.`, 400);
    clean[key] = value;
  }
  if (!/^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]+$/.test(clean.email)) {
    return respond(false, "Invalid email.", 400);
  }

  if (!env || !env.SEND_EMAIL) {
    return respond(false, "Email sending is not set up on the server.", 500);
  }

  try {
    const raw = buildEmail(clean);
    await env.SEND_EMAIL.send(new EmailMessage(FROM_EMAIL, TO_EMAIL, raw));
  } catch (e) {
    console.error("Application email failed:", e && e.message);
    return respond(false, "Could not send the application email.", 502);
  }
  return respond(true, "Application received.", 200);

  function respond(success, msg, status) {
    if (wantsJSON) {
      return new Response(JSON.stringify({ success, message: msg }), {
        status,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }
    // Plain form post (no JavaScript, or fallback): send the person back to the page
    const target = success ? "/?applied=1#apply" : "/?apply_error=1#apply";
    return Response.redirect(new URL(target, request.url).toString(), 303);
  }
}

// ---------- email building ----------

function buildEmail(c) {
  const name = `${c.first_name} ${c.last_name}`;
  const when = new Date().toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" }) + " ET";
  const rows = Object.entries(FIELDS).map(([k, label]) => [label, c[k]]);

  const text =
    `New Quota rep application\n\n` +
    rows.map(([l, v]) => `${l}: ${v}`).join("\n") +
    `\n\nSubmitted ${when} from quotasaleshq.com\nReply to this email to contact the applicant.\n`;

  const esc = (s) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const digits = c.phone.replace(/[^\d+]/g, "");
  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111">` +
    `<h2 style="margin:0 0 14px">New Quota rep application</h2>` +
    `<table cellpadding="8" style="border-collapse:collapse">` +
    rows
      .map(([l, v]) => {
        let val = esc(v);
        if (l === "Phone") val = `<a href="tel:${esc(digits)}">${val}</a>`;
        if (l === "Email") val = `<a href="mailto:${val}">${val}</a>`;
        return `<tr><td style="border:1px solid #ddd;background:#f5f5f5;font-weight:bold">${esc(l)}</td><td style="border:1px solid #ddd">${val}</td></tr>`;
      })
      .join("") +
    `</table>` +
    `<p style="color:#666;font-size:13px;margin-top:14px">Submitted ${esc(when)} from quotasaleshq.com. Reply to this email to contact the applicant.</p>` +
    `</div>`;

  const boundary = "quota-" + crypto.randomUUID();
  const headers = [
    `From: ${FROM_NAME} <${FROM_EMAIL}>`,
    `To: ${TO_EMAIL}`,
    `Reply-To: ${encodeWord(name)} <${c.email}>`,
    `Subject: ${encodeWord("New Quota rep application: " + name)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@quotasaleshq.com>`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  const part = (type, body) =>
    `--${boundary}\r\nContent-Type: ${type}; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64(body)}\r\n`;

  return headers.join("\r\n") + "\r\n\r\n" + part("text/plain", text) + part("text/html", html) + `--${boundary}--\r\n`;
}

// Base64 for UTF-8 text, wrapped at 76 characters per line
function b64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/.{76}/g, "$&\r\n");
}

// Encode header text so names with accents or symbols are safe
function encodeWord(str) {
  return /^[\x20-\x7e]*$/.test(str) ? str.replace(/"/g, "'") : `=?UTF-8?B?${b64(str).replace(/\r\n/g, "")}?=`;
}
