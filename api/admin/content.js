/* ══════════════════════════════════════════════════════════════════════════
   /api/admin/content — read and write the site's content document
   ──────────────────────────────────────────────────────────────────────────
     GET  the stored document, or null if nothing has been published yet
     PUT  { doc, baseUpdatedAt } → saves it

   The whole site is one JSON document rather than a table per section. At
   this size that is the honest shape: a save is atomic, a rollback is one
   value, and nothing can half-publish.

   `baseUpdatedAt` is the copy the editor loaded. If the stored document has
   moved on since, the save is refused with 409 instead of silently discarding
   whatever the other tab wrote.
   ══════════════════════════════════════════════════════════════════════════ */

const auth = require('../_lib/auth.js');
const store = require('../_lib/store.js');

/* Only these keys are stored, and each is checked for shape. The document is
   written by an authenticated operator, but it is also read back by every
   visitor's browser — so it is validated on the way in rather than trusted
   because of who sent it. */
const ARRAYS = ['services', 'why', 'steps', 'portfolio', 'platforms', 'vendors', 'reviews'];
const OBJECTS = ['brand', 'contact', 'caps', 'cats'];

function clean(v, max) {
  return String(v == null ? '' : v).trim().slice(0, max || 4000);
}

/* Strings, arrays of strings and nested plain objects survive; functions,
   prototypes and anything deeper than the content shapes do not. */
function scrub(value, depth) {
  if (depth > 4) return null;
  if (Array.isArray(value)) {
    return value.slice(0, 1000).map(function (v) { return scrub(v, depth + 1); })
      .filter(function (v) { return v !== null && v !== undefined; });
  }
  if (value && typeof value === 'object') {
    const out = {};
    const keys = Object.keys(value).slice(0, 60);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (!/^[A-Za-z0-9_]{1,40}$/.test(k)) continue;
      const v = scrub(value[k], depth + 1);
      if (v !== null && v !== undefined) out[k] = v;
    }
    return out;
  }
  if (typeof value === 'number' && isFinite(value)) return value;
  if (typeof value === 'boolean') return value;
  if (value == null) return null;
  return clean(value, 4000);
}

function normalise(doc) {
  const out = { version: 1 };
  for (let i = 0; i < ARRAYS.length; i++) {
    const k = ARRAYS[i];
    if (Array.isArray(doc[k])) out[k] = scrub(doc[k], 0);
  }
  for (let i = 0; i < OBJECTS.length; i++) {
    const k = OBJECTS[i];
    if (doc[k] && typeof doc[k] === 'object' && !Array.isArray(doc[k])) out[k] = scrub(doc[k], 0);
  }
  return out;
}

module.exports = async function handler(req, res) {
  if (!auth.guard(req, res)) return;

  if (!store.configured()) {
    return res.status(501).json({ ok: false, error: 'store_not_configured' });
  }

  if (req.method === 'GET') {
    try {
      const doc = await store.getJSON(store.KEYS.content);
      return res.status(200).json({ ok: true, doc: doc });
    } catch (err) {
      console.error('content read failed:', err && err.message);
      return res.status(502).json({ ok: false, error: 'store_unavailable' });
    }
  }

  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const body = auth.readBody(req);
  if (!body || !body.doc || typeof body.doc !== 'object') {
    return res.status(400).json({ ok: false, error: 'bad_request' });
  }

  try {
    const current = await store.getJSON(store.KEYS.content);
    const currentStamp = current && current.updatedAt ? current.updatedAt : null;
    const base = body.baseUpdatedAt || null;
    if (currentStamp && base !== currentStamp) {
      return res.status(409).json({
        ok: false, error: 'stale_copy',
        updatedAt: currentStamp,
        message: 'This page was edited somewhere else after you loaded it. Reload to pick up that copy before saving.'
      });
    }

    const doc = normalise(body.doc);
    doc.updatedAt = new Date().toISOString();
    await store.setJSON(store.KEYS.content, doc);
    return res.status(200).json({ ok: true, updatedAt: doc.updatedAt });
  } catch (err) {
    console.error('content write failed:', err && err.message);
    return res.status(502).json({ ok: false, error: 'store_unavailable' });
  }
};
