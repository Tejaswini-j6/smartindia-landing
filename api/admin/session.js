/* ══════════════════════════════════════════════════════════════════════════
   /api/admin/session — log in, check, log out
   ──────────────────────────────────────────────────────────────────────────
     GET     is there a valid session, and is the panel even configured
     POST    { password } → sets the session cookie
     DELETE  clears it

   Failed logins are counted per IP in the store and locked out after ten in
   fifteen minutes. If no store is configured the counter falls back to this
   instance's memory, which a serverless platform may discard or spread across
   instances — weaker, and said plainly here rather than quietly assumed.
   ══════════════════════════════════════════════════════════════════════════ */

const auth = require('../_lib/auth.js');
const store = require('../_lib/store.js');

const MAX_FAILS = 10;
const WINDOW_SECONDS = 15 * 60;
const memory = new Map();

async function fails(ip, add) {
  const key = store.KEYS.loginFails + ip;
  if (store.configured()) {
    if (!add) {
      const cur = await store.getJSON(key);
      return typeof cur === 'number' ? cur : 0;
    }
    return await store.bump(key, WINDOW_SECONDS);
  }
  const now = Date.now();
  const row = memory.get(ip);
  if (!row || row.until < now) {
    if (!add) return 0;
    memory.set(ip, { n: 1, until: now + WINDOW_SECONDS * 1000 });
    return 1;
  }
  if (add) row.n++;
  return row.n;
}

async function clearFails(ip) {
  if (store.configured()) { try { await store.drop(store.KEYS.loginFails + ip); } catch (e) {} }
  memory.delete(ip);
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      configured: auth.enabled(),
      store: store.configured(),
      authed: auth.enabled() && auth.isAuthed(req)
    });
  }

  if (req.method === 'DELETE') {
    auth.clearSession(res);
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  if (!auth.enabled()) {
    return res.status(501).json({ ok: false, error: 'admin_not_configured' });
  }

  const ip = auth.clientIp(req);
  let count = 0;
  try { count = await fails(ip, false); } catch (e) { count = 0; }
  if (count >= MAX_FAILS) {
    return res.status(429).json({ ok: false, error: 'too_many_attempts' });
  }

  const body = auth.readBody(req);
  if (!body) return res.status(400).json({ ok: false, error: 'bad_request' });

  if (!auth.checkPassword(body.password)) {
    try { await fails(ip, true); } catch (e) {}
    /* one message for a wrong password and for a password that is merely
       missing — a login route should not help narrow anything down */
    return res.status(401).json({ ok: false, error: 'bad_credentials' });
  }

  await clearFails(ip);
  auth.setSession(res, auth.issue());
  return res.status(200).json({ ok: true, store: store.configured() });
};
