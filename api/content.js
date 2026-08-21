/* ══════════════════════════════════════════════════════════════════════════
   GET /api/content — the published content, for the public site
   ──────────────────────────────────────────────────────────────────────────
   Open on purpose: this is the same content the page already ships in
   js/data.js. Nothing private is in the document, and the admin routes that
   can *write* it are behind a session.

   204 when nothing has been published and 501 when there is no store, so
   js/boot.js can tell "nothing to apply" from "not set up" and stop waiting
   in either case rather than holding the page for a timeout.
   ══════════════════════════════════════════════════════════════════════════ */

const store = require('./_lib/store.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  if (!store.configured()) {
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(501).json({ ok: false, error: 'not_configured' });
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
