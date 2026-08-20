/* ══════════════════════════════════════════════════════════════════════════
   POST /api/enquiry — deliver an enquiry to the office
   ──────────────────────────────────────────────────────────────────────────
   Runs as a Vercel serverless function, which is what makes it the right
   place for this: the delivery credentials live in the project's environment
   variables and never reach the browser. The page posts the enquiry here and
   this function forwards it.

   Two delivery routes, tried in order:

     1. ENQUIRY_WEBHOOK_URL   — anything that accepts a JSON POST. This is the
        simplest to wire up: point it at whatever automation, CRM or WhatsApp
        provider is already in use and the enquiry arrives as JSON, with a
        ready-made `text` field for services that just want a string.

     2. WhatsApp Cloud API    — set WHATSAPP_TOKEN and WHATSAPP_PHONE_ID and
        the enquiry is sent as a WhatsApp message directly to ENQUIRY_TO.

   With neither configured the function answers 501 and the page falls back to
   its existing route: the visitor's own WhatsApp opens with the enquiry
   already typed out, addressed to the same office number. So the form works
   today, and turning on server-side delivery is purely a matter of adding
   environment variables — no code change, no redeploy of the frontend.

   Environment variables
   ─────────────────────
     ENQUIRY_TO           destination in wa.me form, digits only.
                          Defaults to 919994900470 (the office number).
     ENQUIRY_WEBHOOK_URL  optional. Receives the enquiry as JSON.
     ENQUIRY_WEBHOOK_AUTH optional. Sent as the Authorization header.
     WHATSAPP_TOKEN       optional. WhatsApp Cloud API access token.
     WHATSAPP_PHONE_ID    optional. WhatsApp Cloud API phone number ID.
   ══════════════════════════════════════════════════════════════════════════ */

const TO = (process.env.ENQUIRY_TO || '919994900470').replace(/[^\d]/g, '');

/* Same rule the form applies in the browser. Re-checked here because a
   serverless endpoint is public: client-side validation is for the visitor's
   benefit, not a guarantee about what arrives. */
function phoneValid(v) {
  const d = String(v || '').replace(/[^\d]/g, '');
  if (!d) return false;
  const local = d.replace(/^91(?=\d{10}$)/, '').replace(/^0(?=\d{10}$)/, '');
  if (local.length === 10) return /^[6-9]\d{9}$/.test(local);
  return d.length >= 8 && d.length <= 15;
}

function clean(v, max) {
  return String(v == null ? '' : v).trim().slice(0, max || 2000);
}

function compose(e) {
  return [
    'New enquiry — ' + e.topic,
    '',
    'Name: ' + e.name,
    'Contact: ' + e.phone,
    'Email: ' + e.email,
    'Business: ' + e.business,
    '',
    'Requirement:',
    e.message,
    '',
    'Submitted: ' + e.submittedAt
  ].join('\n');
}

async function viaWebhook(enquiry, text) {
  const url = process.env.ENQUIRY_WEBHOOK_URL;
  if (!url) return false;
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.ENQUIRY_WEBHOOK_AUTH) headers.Authorization = process.env.ENQUIRY_WEBHOOK_AUTH;
  const r = await fetch(url, {
    method: 'POST',
    headers: headers,
    /* both shapes in one payload: structured fields for anything that wants
       to map them, and `text` for anything that just posts a string on */
    body: JSON.stringify(Object.assign({ to: TO, text: text }, enquiry))
  });
  if (!r.ok) throw new Error('webhook responded ' + r.status);
  return true;
}

async function viaWhatsApp(text) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return false;
  const r = await fetch('https://graph.facebook.com/v21.0/' + phoneId + '/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: TO,
      type: 'text',
      text: { preview_url: false, body: text }
    })
  });
  if (!r.ok) throw new Error('whatsapp responded ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return true;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = null; }
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ ok: false, error: 'bad_request' });
  }

  const enquiry = {
    name: clean(body.name, 120),
    phone: clean(body.phone, 40),
    email: clean(body.email, 160),
    topic: clean(body.topic, 80) || 'General enquiry',
    business: clean(body.business, 600),
    message: clean(body.message, 2000),
    submittedAt: clean(body.submittedAt, 60) ||
      new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }) + ' IST'
  };

  if (enquiry.name.length < 2) return res.status(422).json({ ok: false, error: 'name_required' });
  if (!phoneValid(enquiry.phone)) return res.status(422).json({ ok: false, error: 'phone_invalid' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(enquiry.email)) return res.status(422).json({ ok: false, error: 'email_invalid' });
  if (enquiry.message.length < 10) return res.status(422).json({ ok: false, error: 'message_required' });

  const text = compose(enquiry);

  try {
    if (await viaWebhook(enquiry, text)) return res.status(200).json({ ok: true, via: 'webhook' });
    if (await viaWhatsApp(text)) return res.status(200).json({ ok: true, via: 'whatsapp' });
  } catch (err) {
    /* A configured route that fails is worth knowing about in the function
       log, but the visitor should not be stranded — answer 502 and the page
       falls back to the WhatsApp handoff exactly as if nothing were set up. */
    console.error('enquiry delivery failed:', err && err.message);
    return res.status(502).json({ ok: false, error: 'delivery_failed' });
  }

  /* Nothing configured. Not an error — the page has a working fallback. */
  return res.status(501).json({ ok: false, error: 'not_configured' });
};
