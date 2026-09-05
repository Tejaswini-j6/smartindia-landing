/* ══════════════════════════════════════════════════════════════════════════
   SmartIndia.ai — ambient float
   ──────────────────────────────────────────────────────────────────────────
   flow.js made the page move when the *scroll* moves. This makes it move when
   nothing moves at all: words drift in place, decorative bodies turn slowly
   behind the content, and every depth layer leans away from the cursor. The
   page stops being a still image that animates on demand and becomes a space
   that is already in motion when you arrive.

   Three channels, and only three:

     --fl-mx  -1→1   pointer, horizontal, smoothed   ← this file, one rAF
     --fl-my  -1→1   pointer, vertical, smoothed     ← this file, one rAF
     (ambient drift)                                 ← CSS keyframes, no JS

   Why it is cheap
   ───────────────
   The pointer loop writes two properties on <html> and nothing else. Every
   layer then derives its own offset in CSS from those two numbers and its own
   `--fl-d` depth, so a hundred parallax layers cost the same as one — the work
   is the compositor's, not the main thread's. The loop parks the moment the
   cursor settles, exactly as flow.js parks when the scroll settles.

   The ambient drift is pure CSS animation, so it never touches JS at all. It
   is gated on `.fl-live`, which comes and goes with an IntersectionObserver:
   a heading that scrolls off has its animation *removed*, not paused, so it
   stops holding a compositor layer. The site's own `.in` could not do this —
   it is a one-way latch, so by the foot of the page every heading on it would
   still have been animating.

   Property ownership, continued from flow.js
   ──────────────────────────────────────────
   `transform`  entry animations (style.css), and the ambient word drift —
                different elements, never the same one
   `translate`  everything scroll- and pointer-linked, summed in one
                declaration where a layer is on more than one channel
   `rotate`     the decorative bodies' own slow turn

   Gated behind .float-on, set only from here. No JS, or reduced motion, and
   the page keeps flow.js's scroll choreography with nothing floating.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const PROFILE = window.SI_PROFILE || { low: false, reduced: false, coarse: false };
  if (PROFILE.reduced) return;

  const root = document.documentElement;
  const $ = function (s, c) { return (c || document).querySelector(s); };
  const $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  const clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  root.classList.add('float-on');

  /* The drifting words are free — a compositor animation on a handful of
     on-screen spans. The pointer parallax and the decorative bodies are not:
     they move large blurred areas. A weak device keeps the words. */
  const RICH = !PROFILE.low;
  if (RICH) root.classList.add('float-rich');

  /* ══════════════════════════════════════════════════════════════════════
     1.  The words float
     ══════════════════════════════════════════════════════════════════════ */
  /* Each word becomes its own inline-block so it can carry its own drift, on
     its own clock. The index `--w` is what desynchronises them: CSS turns it
     into a per-word duration and a *negative* delay, so a heading arrives with
     its words already scattered through the cycle rather than starting as one
     block and pulling apart over the first ten seconds.

     Only text nodes are wrapped, so `<em>`, `<br>` and the eyebrow's dot come
     through untouched — and the whitespace between words is left as real text,
     so the line still breaks exactly where it did before. */
  function splitWords(host) {
    if (!host || host.dataset.flWords) return;
    host.dataset.flWords = '1';
    let n = 0;

    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (k) {

        if (k.nodeType === 3) {                       /* text */
          if (!k.nodeValue.trim()) return;
          const frag = document.createDocumentFragment();
          k.nodeValue.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (!p.trim()) { frag.appendChild(document.createTextNode(p)); return; }
            const s = document.createElement('span');
            s.className = 'fl-word';
            s.style.setProperty('--w', n++);
            s.textContent = p;
            frag.appendChild(s);
          });
          node.replaceChild(frag, k);
          return;
        }

        if (k.nodeType !== 1) return;

        /* A run whose colour is a gradient clipped to its own text — the
           hero's "With AI." — is one floating unit. Splitting inside it would
           restart the gradient on every word and cut the sweep into pieces. */
        if (k.tagName === 'EM' || k.classList.contains('fl-word')) {
          k.classList.add('fl-word');
          k.style.setProperty('--w', n++);
          return;
        }
        walk(k);
      });
    })(host);
  }

  /* The hero title and the display headings are already split into lines —
     by hand in the markup for the hero, by flow.js for the rest — so the
     words are wrapped inside those line boxes and the line entry above them
     is left completely alone. */
  /* Only what is on screen drifts. Without this the animation count climbs
     with every heading the visitor scrolls past and never comes back down —
     eighty compositor layers by the foot of the page, for eighty words nobody
     can see. The margin is generous so a heading is already moving by the time
     it is looked at, rather than starting the moment it is. */
  const live = ('IntersectionObserver' in window)
    ? new IntersectionObserver(function (es) {
        es.forEach(function (en) { en.target.classList.toggle('fl-live', en.isIntersecting); });
      }, { rootMargin: '18% 0px 18% 0px' })
    : null;

  function watch(host) {
    if (!host || host.dataset.flLive) return;
    host.dataset.flLive = '1';
    if (live) live.observe(host); else host.classList.add('fl-live');
  }

  function words() {
    $$('.hero__title .line > span').forEach(splitWords);
    $$('.fl-lines .fl-line > span').forEach(splitWords);
    /* the small caps labels above each heading: the least motion of anything
       on the page, but they are what makes the *whole* column read as afloat
       rather than one heading being animated in isolation */
    $$('.eyebrow').forEach(splitWords);
    /* the gate goes on the heading, not the word — one observed element per
       heading instead of one per word */
    $$('.hero__title, .fl-lines, .eyebrow').forEach(watch);
  }

  /* ══════════════════════════════════════════════════════════════════════
     2.  Everything leans away from the cursor
     ══════════════════════════════════════════════════════════════════════ */
  /* [selector, depth]. Depth is the travel in px at full deflection, and the
     sign is what builds the hierarchy: positive comes toward the viewer and
     tracks the cursor, negative sits behind the page and leans against it.
     Read the list top to bottom and it is the scene in section order, nearest
     first — that is the whole depth system, in one place, on purpose. */
  const PTR = [
    /* — hero — the three lines are staggered so the headline itself has
         thickness rather than being one flat plane that slides */
    ['.hero__title .line:nth-child(1)',  9],
    ['.hero__title .line:nth-child(2)',  6.5],
    ['.hero__title .line:nth-child(3)',  4],
    ['.hero__lede',                      3],
    ['.hero__meta',                      2],
    ['.hero__scroll',                   -3],

    /* — the decorative bodies live furthest back and move most, which is what
         makes them read as distance rather than as objects on the glass — */
    ['.fl-orb',                        -18],

    /* — section furniture: enough to keep the column alive, never enough to
         make a paragraph hard to hold still and read — */
    ['.sect-head__note',                 4],
    ['.about__arches',                  -9],
    ['.rating',                          4],
    ['.contact__bg',                    -7],
    ['.foot__brand',                     3]
  ];

  function depth() {
    PTR.forEach(function (p) {
      $$(p[0]).forEach(function (el) {
        el.classList.add('fl-ptr');
        el.style.setProperty('--fl-d', p[1]);
      });
    });
  }

  /* One loop, two properties, then it stops. The chase constant is low so the
     layers arrive a moment after the cursor does: without that lag the whole
     thing reads as a rigid object bolted to the mouse instead of a set of
     planes with weight. */
  let tmx = 0, tmy = 0, mx = 0, my = 0, praf = 0;

  function ploop() {
    mx += (tmx - mx) * .075;
    my += (tmy - my) * .075;
    root.style.setProperty('--fl-mx', mx.toFixed(4));
    root.style.setProperty('--fl-my', my.toFixed(4));
    if (Math.abs(tmx - mx) < .0009 && Math.abs(tmy - my) < .0009) { praf = 0; return; }
    praf = requestAnimationFrame(ploop);
  }
  function pkick() { if (!praf) praf = requestAnimationFrame(ploop); }

  function pointer() {
    if (!PROFILE.coarse) {
      window.addEventListener('pointermove', function (e) {
        tmx = clamp(e.clientX / window.innerWidth * 2 - 1, -1, 1);
        tmy = clamp(e.clientY / window.innerHeight * 2 - 1, -1, 1);
        pkick();
      }, { passive: true });
      /* the cursor leaving is a position too — the scene settles back level
         rather than holding whatever lean it had at the edge of the window */
      window.addEventListener('pointerout', function (e) {
        if (e.relatedTarget) return;
        tmx = tmy = 0; pkick();
      }, { passive: true });
      return;
    }

    /* A phone has no cursor, so the tilt of the device is the cursor. Damped
       hard: a hand is never as still as a mouse, and at desktop amplitude the
       page would swim. */
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', function (e) {
        if (e.gamma == null) return;
        tmx = clamp(e.gamma / 34, -1, 1) * .55;
        tmy = clamp((e.beta - 45) / 44, -1, 1) * .55;
        pkick();
      }, { passive: true });
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     3.  Bodies in the space
     ══════════════════════════════════════════════════════════════════════ */
  /* Not "floating circles" scattered for texture. These are placed: each one
     sits in the margin its section actually leaves empty, and the tint is the
     tint that section's own content already carries, so they read as the
     depth *behind* the page rather than as decoration laid on top of it.

       host   section to hang in        k  size, as a fraction of the section
       x / y  position within it        t  tint token
       r      ring rather than a body   d  drift clock, seconds

     They go behind the section's content and are inert to the pointer, so
     nothing here can ever get between the visitor and a link. */
  const ORBS = [
    /* one body only in the hero, and a soft one. The chakra and its node
       graph are already the object layer here - a second ring competing with
       them, in the corner the buttons occupy, was noise rather than depth. */
    { host: '.hero',      x: 84, y: 20, k: 26, t: 'gold',    d: 34 },
    { host: '.about',     x: 92, y: 30, k: 20, t: 'saffron', d: 46 },
    { host: '.portfolio', x: 6,  y: 34, k: 22, t: 'green',   d: 52, r: true },
    { host: '.services',  x: 88, y: 76, k: 24, t: 'gold',    d: 38 },
    { host: '.work',      x: 12, y: 22, k: 18, t: 'navy',    d: 44 },
    { host: '.tech',      x: 90, y: 40, k: 21, t: 'saffron', d: 49, r: true },
    { host: '.clients',   x: 8,  y: 66, k: 19, t: 'gold',    d: 36 },
    { host: '.contact',   x: 86, y: 24, k: 23, t: 'green',   d: 55 }
  ];

  let seeded = false;
  function bodies() {
    if (seeded) return;
    seeded = true;
    ORBS.forEach(function (o) {
      const host = $(o.host);
      if (!host) return;
      const el = document.createElement('span');
      el.className = 'fl-orb' + (o.r ? ' fl-orb--ring' : '');
      el.setAttribute('aria-hidden', 'true');
      el.style.cssText =
        '--x:' + o.x + '%;--y:' + o.y + '%;--k:' + o.k + ';--d-t:' + o.d + 's';
      el.setAttribute('data-tint', o.t);
      host.appendChild(el);
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
     4.  Wiring
     ══════════════════════════════════════════════════════════════════════ */
  words();
  if (RICH) { bodies(); depth(); pointer(); }

  /* flow.js measures the page in document space; the bodies are absolutely
     positioned and the word spans do not change a single line box, so nothing
     here moves anything it tracks. It is told anyway — cheap, and it keeps
     the two loops from ever disagreeing about where the page is. */
  if (window.SI_FLOW && window.SI_FLOW.remeasure) window.SI_FLOW.remeasure();

  /* The index list and the service panels repaint on interaction, and the
     admin panel can republish a heading — anything that arrives late gets its
     words wrapped too, rather than being the one still block on the page. */
  if ('MutationObserver' in window) {
    let mt = 0;
    const mo = new MutationObserver(function () {
      clearTimeout(mt);
      mt = setTimeout(words, 90);
    });
    $$('#svc-list, #live-grid, #index-list, #why-list').forEach(function (el) {
      mo.observe(el, { childList: true });
    });
  }

  window.SI_FLOAT = { words: words };
})();
