/* ══════════════════════════════════════════════════════════════════════════
   Storage adapter
   ──────────────────────────────────────────────────────────────────────────
   The public site is static and has no database. The admin panel needs one,
   so this is the single place that knows where data lives — every route talks
   to this interface and none of them knows which backend answered.

   Backend: Redis over its REST API (Vercel KV, or Upstash directly). REST
   rather than a driver because this project has no package.json and no
   node_modules; a fetch() call needs neither.

   Recognised environment variables, in order:
     KV_REST_API_URL       + KV_REST_API_TOKEN        (Vercel KV)
     UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (Upstash direct)

   With neither set `configured()` is false and every route answers 501 rather
   than pretending to have saved something. That is the same contract
   api/enquiry.js already uses: not-configured is a state, not a failure.

   Adding another backend means adding one object with the same five methods,
   not touching the routes.
   ══════════════════════════════════════════════════════════════════════════ */

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

function configured() {
  return Boolean(URL_ && TOKEN);
}

/* One Redis command. Upstash takes the command as a JSON array in the body,
   which keeps arguments out of the URL — keys and values here can contain
   anything, and a path-encoded command is one escaping bug away from a
   corrupted write. */
async function cmd(args) {
  if (!configured()) throw new Error('store_not_configured');
  const r = await fetch(URL_.replace(/\/+$/, ''), {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(args.map(String))
  });
  const body = await r.json().catch(function () { return null; });
  if (!r.ok) {
    throw new Error('store ' + r.status + ' ' + (body && body.error ? body.error : ''));
  }
  if (body && body.error) throw new Error('store: ' + body.error);
  return body ? body.result : null;
}

async function getJSON(key) {
  const raw = await cmd(['GET', key]);
  if (raw == null) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

async function setJSON(key, value) {
  await cmd(['SET', key, JSON.stringify(value)]);
  return true;
}

/* Newest first, and capped: an enquiry list that grows without limit turns
   into a slow read on the one page that has to stay quick. */
async function pushCapped(key, value, cap) {
  await cmd(['LPUSH', key, JSON.stringify(value)]);
  await cmd(['LTRIM', key, 0, (cap || 500) - 1]);
  return true;
}

async function listAll(key) {
  const rows = await cmd(['LRANGE', key, 0, -1]);
  if (!Array.isArray(rows)) return [];
  return rows.map(function (r) {
    try { return JSON.parse(r); } catch (e) { return null; }
  }).filter(Boolean);
}

/* Rewrite the whole list. Used when a row is deleted or marked read — the
   lists here are small enough that a rewrite is cheaper to reason about than
   an index-based edit that can race. */
async function listReplace(key, rows) {
  const args = ['DEL', key];
  await cmd(args);
  if (!rows.length) return true;
  const push = ['RPUSH', key];
  for (let i = 0; i < rows.length; i++) push.push(JSON.stringify(rows[i]));
  await cmd(push);
  return true;
}

/* Fixed-window counter, used to rate-limit the login route. Returns the count
   after this hit, so the caller can decide. */
async function bump(key, ttlSeconds) {
  const n = await cmd(['INCR', key]);
  if (Number(n) === 1) await cmd(['EXPIRE', key, ttlSeconds]);
  return Number(n);
}

async function drop(key) {
  await cmd(['DEL', key]);
  return true;
}

module.exports = {
  configured: configured,
  getJSON: getJSON,
  setJSON: setJSON,
  pushCapped: pushCapped,
  listAll: listAll,
  listReplace: listReplace,
  bump: bump,
  drop: drop,
  KEYS: {
    content: 'si:content',
    enquiries: 'si:enquiries',
    loginFails: 'si:loginfail:'
  }
};
