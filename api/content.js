/* ══════════════════════════════════════════════════════════════════════════
   GET /api/content — the published content, for the public site
   ──────────────────────────────────────────────────────────────────────────
   Open on purpose: this is the same content the page already ships in
   js/data.js. Nothing private is in the document, and the admin routes that
   can *write* it are behind a session.

   204 both when nothing has been published and when there is no store at all.
   The two are the same answer to the only question this route is ever asked —
   "is there anything to apply?" — and 204 says it without the browser logging
   a failed request on every single visit. Whether a store is configured is a
   thing an operator needs to know, not a visitor, so that is reported by
   /api/admin/session instead.
   ══════════════════════════════════════════════════════════════════════════ */

const store = require('./_lib/store.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  if (!store.configured()) {
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(204).end();
  }

  try {
    const doc = await store.getJSON(store.KEYS.content);
    if (!doc) {
      res.setHeader('Cache-Control', 'public, max-age=30');
      return res.status(204).end();
    }
    /* Short cache with revalidation: an edit should show up on the next load,
       not on the next deploy, but every visitor should not cost a store read. */
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=300');
    return res.status(200).json({ ok: true, doc: doc });
  } catch (err) {
    console.error('content read failed:', err && err.message);
    return res.status(502).json({ ok: false, error: 'unavailable' });
  }
};
