// Cloudflare Pages Function: POST /api/audit
// Emails each audit request to LucidMark through Resend (env RESEND_API_KEY, AUDIT_TO, AUDIT_FROM).
// Without a key it answers 503 and the page falls back to the visitor's email app.
const MAX = 400;
const clean = (v) => String(v ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, MAX);

export async function onRequestPost({ request, env }) {
  let data;
  try { data = await request.json(); } catch { return json({ ok: false, error: "bad_request" }, 400); }
  if (clean(data.company_site)) return json({ ok: true }); // honeypot: quietly accept bots
  const email = clean(data.email);
  const website = clean(data.website);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !website) return json({ ok: false, error: "missing_fields" }, 422);
  if (!env.RESEND_API_KEY) return json({ ok: false, error: "email_not_configured" }, 503);
  const fields = ["name", "business", "website", "email", "phone", "spend", "form"];
  const text = fields.filter((k) => clean(data[k])).map((k) => `${k}: ${clean(data[k])}`).join("\n");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.AUDIT_FROM || "LucidMark <audit@lucidmark.co.uk>",
      to: [env.AUDIT_TO || "hello@axonis.co.uk"],
      reply_to: email,
      subject: `Free audit request: ${website}`,
      text,
    }),
  });
  if (!r.ok) return json({ ok: false, error: "send_failed" }, 502);
  return json({ ok: true });
}

export const onRequestGet = () => json({ ok: false, error: "method_not_allowed" }, 405);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
