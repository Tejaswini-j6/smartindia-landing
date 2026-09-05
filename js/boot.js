/* ══════════════════════════════════════════════════════════════════════════
   Content hydration
   ──────────────────────────────────────────────────────────────────────────
   js/data.js is still the content the site ships with, and it is still what
   renders if anything here fails. This asks the API whether an operator has
   published something newer and, if so, merges it over window.SI *before* the
   renderers run.

   Which is why the remaining scripts are loaded from here rather than sitting
   in the markup as their own tags. site.js renders the moment it is parsed,
   so hydration cannot be a fetch that resolves alongside it — it has to
   finish first or be given up on. Scripts are appended with async=false and
   chained on load, so execution order is exactly the order below.

   The wait is bounded. If the API is slow, missing, or answers 501 because no
   store is configured, the page carries on with its built-in content — a CMS
   that is not set up must cost the visitor nothing.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* float.js is last on purpose: it wraps the words inside the line boxes
     that flow.js builds, so it has to see them already there. */
  var SCRIPTS = ['js/draw.js', 'js/reveal.js', 'js/scene.js', 'js/site.js',
                 'js/flow.js', 'js/float.js'];
  var BUDGET = 1200;        /* ms before the built-in content wins by default */

  function run() {
    var i = 0;
    (function next() {
      if (i >= SCRIPTS.length) return;
      var s = document.createElement('script');
      s.src = SCRIPTS[i++];
      s.async = false;                 /* keeps order even when cached */
      s.onload = next;
      s.onerror = next;                /* one missing file must not stop the rest */
      document.head.appendChild(s);
    })();
  }

  /* Only these keys may come from the API, and each replaces its counterpart
     whole rather than merging item by item: a half-applied list is a worse
     outcome than the shipped one. Anything unrecognised is ignored. */
  var MAP = {
    services: 'SERVICES', why: 'WHY', steps: 'STEPS', caps: 'CAPS',
    portfolio: 'PORTFOLIO', platforms: 'PLATFORMS', vendors: 'VENDORS',
    reviews: 'REVIEWS', contact: 'CONTACT', brand: 'BRAND', cats: 'CATS'
  };

  function apply(doc) {
    if (!doc || typeof doc !== 'object' || !window.SI) return;
    var applied = 0;
    for (var key in MAP) {
      if (!Object.prototype.hasOwnProperty.call(MAP, key)) continue;
      var v = doc[key];
      if (v == null) continue;
      if (Array.isArray(v) ? v.length : typeof v === 'object') {
        window.SI[MAP[key]] = v;
        applied++;
      }
    }
    /* the counts are derived, so they have to be recomputed rather than
       carried over from whatever data.js worked out at load */
    if (applied && Array.isArray(window.SI.PLATFORMS) && window.SI.counts) {
      var byCat = function (c) {
        return window.SI.PLATFORMS.filter(function (p) { return p && p.c === c; }).length;
      };
      window.SI.counts = {
        total: window.SI.PLATFORMS.length,
        dynamic: byCat('dynamic'), ecom: byCat('ecom'),
        multi: byCat('multi'), web: byCat('web')
      };
    }
    window.SI_HYDRATED = applied > 0;
  }

  var done = false;
  function go(doc) {
    if (done) return;
    done = true;
    try { if (doc) apply(doc); } catch (e) { /* built-in content stands */ }
    run();
  }

  if (!window.fetch) return go(null);

  window.setTimeout(function () { go(null); }, BUDGET);

  fetch('/api/content', { headers: { Accept: 'application/json' } })
    .then(function (r) {
      if (r.status === 204 || !r.ok) return null;   /* nothing published, or no store */
      return r.json();
    })
    .then(function (payload) { go(payload && payload.doc); })
    .catch(function () { go(null); });
})();
