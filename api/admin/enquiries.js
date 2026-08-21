/* ══════════════════════════════════════════════════════════════════════════
   /api/admin/enquiries — the inbox
   ──────────────────────────────────────────────────────────────────────────
     GET     every stored enquiry, newest first
     PATCH   { id, read }        → mark one read or unread
     DELETE  { id } | { all:1 }  → remove one, or empty the inbox

   api/enquiry.js keeps forwarding to WhatsApp exactly as before; storing a
   copy here is additional, not instead. If the store is down the enquiry
   still gets delivered — losing the archive copy must never cost the lead.
   ══════════════════════════════════════════════════════════════════════════ */

const auth = require('../_lib/auth.js');
const store = require('../_lib/store.js');

module.exports = async function handler(req, res) {
  if (!auth.guard(req, res)) return;

  if (!store.configured()) {
    return res.status(501).json({ ok: false, error: 'store_not_configured' });
  }

  try {
    if (req.method === 'GET') {
      const rows = await store.listAll(store.KEYS.enquiries);
      return res.status(200).json({
        ok: true,
        enquiries: rows,
        unread: rows.filter(function (r) { return !r.read; }).length
      });
    }

    if (req.method === 'PATCH') {
      const body = auth.readBody(req);
      if (!body || !body.id) return res.status(400).json({ ok: false, error: 'bad_request' });
      const rows = await store.listAll(store.KEYS.enquiries);
      let hit = false;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].id === body.id) { rows[i].read = Boolean(body.read); hit = true; }
      }
      if (!hit) return res.status(404).json({ ok: false, error: 'not_found' });
      await store.listReplace(store.KEYS.enquiries, rows);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const body = auth.readBody(req) || {};
      if (body.all) {
        await store.listReplace(store.KEYS.enquiries, []);
        return res.status(200).json({ ok: true, removed: 'all' });
      }
      if (!body.id) return res.status(400).json({ ok: false, error: 'bad_request' });
      const rows = await store.listAll(store.KEYS.enquiries);
      const kept = rows.filter(function (r) { return r.id !== body.id; });
      if (kept.length === rows.length) return res.status(404).json({ ok: false, error: 'not_found' });
      await store.listReplace(store.KEYS.enquiries, kept);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, PATCH, DELETE');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  } catch (err) {
    console.error('enquiries failed:', err && err.message);
    return res.status(502).json({ ok: false, error: 'store_unavailable' });
  }
};
