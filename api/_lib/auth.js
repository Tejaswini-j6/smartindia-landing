/* ══════════════════════════════════════════════════════════════════════════
   Admin authentication
   ──────────────────────────────────────────────────────────────────────────
   One operator, one password, a signed session cookie. There is no user table
   because there is no second user; adding one later means adding a store key,
   not rewriting this.

   Environment variables
   ─────────────────────
     ADMIN_PASSWORD   required. With it unset the admin panel is *disabled* —
                      every route answers 501. That is deliberate: the failure
                      mode of a missing password must be a locked door, never
                      an open one.
     SESSION_SECRET   optional. The HMAC key for session cookies. If unset it
                      is derived from ADMIN_PASSWORD, so setup is one variable
                      instead of two — and changing the password then
                      invalidates every existing session, which is the
                      behaviour you want anyway.

   The password is compared as a SHA-256 digest through timingSafeEqual, so a
   wrong guess takes the same time to reject whatever it got right. The cookie
   is HttpOnly (script cannot read it), Secure, and SameSite=Strict — that
   last one is also what stops a cross-site form from driving these routes,
   which is why there is no separate CSRF token.
   ══════════════════════════════════════════════════════════════════════════ */

const crypto = require('crypto');

const COOKIE = 'si_admin';
const TTL_SECONDS = 60 * 60 * 8;          /* a working day, then log in again */

function password() {
  return process.env.ADMIN_PASSWORD || '';
}

function enabled() {
  return password().length > 0;
}

function secret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  return crypto.createHash('sha256').update('si-admin-session|' + password()).digest('hex');
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(s) {
  s = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64');
}

function sign(payloadB64) {
  return b64url(crypto.createHmac('sha256', secret()).update(payloadB64).digest());
}

/* Constant-time compare that does not leak length either: both sides are
   hashed to a fixed width first, so timingSafeEqual never throws on a length
   mismatch and never has a shorter loop to measure. */
function sameSecret(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function checkPassword(given) {
  if (!enabled()) return false;
  return sameSecret(given == null ? '' : given, password());
}

function issue() {
  const payload = b64url(JSON.stringify({ exp: Date.now() + TTL_SECONDS * 1000 }));
  return payload + '.' + sign(payload);
}

function verify(token) {
  if (!enabled() || !token) return false;
  const bits = String(token).split('.');
  if (bits.length !== 2) return false;
  if (!sameSecret(sign(bits[0]), bits[1])) return false;   /* signature first */
  let payload;
  try { payload = JSON.parse(unb64url(bits[0]).toString('utf8')); } catch (e) { return false; }
  return Boolean(payload && payload.exp && Date.now() < payload.exp);
}

function readCookie(req, name) {
  const raw = req.headers && req.headers.cookie;
  if (!raw) return '';
  const parts = String(raw).split(';');
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i].trim();
    const eq = p.indexOf('=');
    if (eq > 0 && p.slice(0, eq) === name) return decodeURIComponent(p.slice(eq + 1));
  }
  return '';
}

function setSession(res, token) {
  res.setHeader('Set-Cookie',
    COOKIE + '=' + encodeURIComponent(token) +
    '; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=' + TTL_SECONDS);
}

function clearSession(res) {
  res.setHeader('Set-Cookie', COOKIE + '=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');
}

function isAuthed(req) {
  return verify(readCookie(req, COOKIE));
}

/* Every admin route starts the same way: never cached, disabled without a
   password, refused without a session. Returns false when it has already
   answered, so the route can just `return`. */
function guard(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (!enabled()) {
    res.status(501).json({ ok: false, error: 'admin_not_configured' });
    return false;
  }
  if (!isAuthed(req)) {
    res.status(401).json({ ok: false, error: 'unauthorised' });
    return false;
  }
  return true;
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function readBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { return null; }
  }
  return body && typeof body === 'object' ? body : null;
}

module.exports = {
  COOKIE: COOKIE,
  TTL_SECONDS: TTL_SECONDS,
  enabled: enabled,
  checkPassword: checkPassword,
  issue: issue,
  isAuthed: isAuthed,
  setSession: setSession,
  clearSession: clearSession,
  guard: guard,
  clientIp: clientIp,
  readBody: readBody
};
