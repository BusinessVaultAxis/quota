// Quota application endpoint: POST /api/apply
// Runs on Cloudflare Pages Functions. The site's form posts here (same domain, so
// browsers and ad blockers don't block it). This code then forwards the application
// to FormSubmit, which emails it to the recruiting inbox.
//
// ONE-TIME SETUP: the first application sent after deploying makes FormSubmit email
// quotasaleshq@gmail.com an "Activate Form" link. Click it once; after that every
// application arrives in that inbox.

const TO_EMAIL = "quotasaleshq@gmail.com";
const SITE = "https://quotasaleshq.com";
const FIELDS = {
  first_name: "First name",
  last_name: "Last name",
  phone: "Phone",
  email: "Email",
  location: "City & state",
  experience: "Sales experience",
};

export async function onRequestPost({ request, env }) {
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

  // Validate
  const clean = {};
  for (const key of Object.keys(FIELDS)) {
    const value = String(data[key] ?? "").trim().slice(0, 200);
    if (!value) return respond(false, `Missing ${FIELDS[key].toLowerCase()}.`, 400);
    clean[key] = value;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)) return respond(false, "Invalid email.", 400);

  // Forward to FormSubmit, labelled for a clean email table
  const payload = {
    _subject: `New Quota rep application: ${clean.first_name} ${clean.last_name}`,
    _template: "table",
    _captcha: "false",
    _replyto: clean.email,
  };
  for (const [key, label] of Object.entries(FIELDS)) payload[label] = clean[key];

  const endpoint = (env && env.FORM_ENDPOINT) || `https://formsubmit.co/ajax/${TO_EMAIL}`;
  let ok = false, message = "";
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Origin: SITE,
        Referer: SITE + "/",
      },
      body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    ok = res.ok && String(out.success) === "true";
    message = out.message || `Mail service returned ${res.status}.`;
  } catch {
    message = "Could not reach the mail service.";
  }
  return respond(ok, ok ? "Application received." : message, ok ? 200 : 502);

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

export function onRequestGet({ request }) {
  return Response.redirect(new URL("/#apply", request.url).toString(), 302);
}
