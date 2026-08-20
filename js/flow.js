/* ══════════════════════════════════════════════════════════════════════════
   SmartIndia.ai — animatic flow
   ──────────────────────────────────────────────────────────────────────────
   The page stops being a stack of blocks that each pop in on their own and
   becomes one continuous shot: headings rise line by line, grids arrive as a
   wave across their rows, depth layers drift against the scroll, cards lag a
   little behind a fast flick, and a block eases back once it has been read
   instead of simply cutting away at the top of the screen.

   How it is built
   ───────────────
   One rAF loop turns the scroll position into a small set of custom
   properties, and CSS does every pixel of the drawing:

     --fl-in    0→1   a section arriving          (draws its divider)
     --fl-out   0→1   a block leaving upward      (recedes it)
     --fl-y     px    depth-layer offset          (parallax)
     --fl-vel  -1→1   smoothed scroll velocity    (card drag)

   Two rules keep it cheap:
     • geometry is measured in document space once, and re-measured only when
       something can actually have moved (resize, fonts, injected content) —
       the loop itself never calls getBoundingClientRect();
     • the loop stops. When scrolling ends and the velocity has settled there
       is no rAF running at all.

   Motion targets are split by property on purpose: entry animations that
   already exist in style.css use `transform`, so everything here rides the
   independent `translate` property and the two never overwrite each other.

   The whole layer is gated behind the .flow-on class, which is only ever set
   from here — with JS off, or prefers-reduced-motion on, the page keeps its
   original plain reveals.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const PROFILE = window.SI_PROFILE || { low: false, reduced: false, coarse: false };
  if (PROFILE.reduced) return;

  const root = document.documentElement;
  const $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  const clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  root.classList.add('flow-on');

  /* Parallax, the receding exit and velocity drag are the expensive third:
     they repaint large areas every frame. On a weak device the page keeps the
     free half — sequenced entries and the line-by-line headings. */
  const RICH = !PROFILE.low;
  if (RICH) root.classList.add('flow-rich');

  /* ══════════════════════════════════════════════════════════════════════
     1.  Headings arrive a line at a time
     ══════════════════════════════════════════════════════════════════════ */
  /* Each display heading is already authored as hard-broken lines, so the
     <br>s are the line boxes — no measuring, no re-splitting on resize. Each
     part goes into its own overflow-mask and slides up behind it. */
  (function lines() {
    $$('.display').forEach(function (h) {
      const parts = h.innerHTML.split(/<br\s*\/?>/i);
      if (parts.length < 1) return;
      h.innerHTML = parts.map(function (p, i) {
        return '<span class="fl-line" style="--i:' + i + '"><span>' + p + '</span></span>';
      }).join('');
      h.classList.add('fl-lines');
    });
  })();

  /* ══════════════════════════════════════════════════════════════════════
     2.  Grids arrive as a wave
     ══════════════════════════════════════════════════════════════════════ */
  /* Rows are read back out of the layout rather than assumed, so the cascade
     runs left-to-right along whatever row the breakpoint actually produced —
     four across on a desktop, two on a tablet, one on a phone. */
  const SEQ = [
    { box: '#svc-list',       item: '.svc__item' },
    { box: '.prod',           item: '.prod__card' },
    { box: '.mv',             item: '.mv__card' },
    { box: '#why-list',       item: '.why__item' },
    { box: '.stats',          item: '.stat' },
    { box: '#steps',          item: 'li' },
    { box: '#vend-list',      item: '.vend__card' },
    { box: '.cap',            item: '.cap__col' },
    { box: '#index-list',     item: 'li', step: .04 },
    { box: '#wall',           item: 'a',  step: .03 },
    { box: '.contact__aside', item: '.cblock' },
    { box: '.foot__nav',      item: 'div' }
  ];

  /* Items that already carry .reveal-up animate with `transform`; they only
     want the delay. Everything else gets its own entry, on `translate`. */
  function tag(group) {
    $$(group.box).forEach(function (box) {
      const items = $$(group.item, box);
      if (!items.length) return;
      box.style.setProperty('--fl-step', (group.step || .07) + 's');
      items.forEach(function (el) {
        if (el.dataset.fl) return;
        el.dataset.fl = '1';
        if (el.classList.contains('reveal-up')) {
          el.classList.add('fl-stag');
          if (RICH) el.classList.add('fl-drag');
        } else {
          el.classList.add('fl-item');
        }
      });
      rows(items);
    });
  }

  /** Number each item by its position within its own row. */
  function rows(items) {
    const tops = items.map(function (el) { return el.offsetTop; });   /* read */
    let base = null, i = 0;
    items.forEach(function (el, n) {                                  /* then write */
      if (base === null || Math.abs(tops[n] - base) > 6) { base = tops[n]; i = 0; }
      el.style.setProperty('--i', i);
      /* cards further along a row hang back a touch more on a fast flick */
      if (el.classList.contains('fl-drag')) el.style.setProperty('--fl-amp', (5 + (i % 3) * 4) + 'px');
      i++;
    });
  }

  function relayoutRows() {
    SEQ.forEach(function (g) {
      $$(g.box).forEach(function (box) {
        const items = $$(g.item, box);
        if (items.length) rows(items);
      });
    });
  }

  /* items with no reveal of their own need watching; the ones that came with
     .reveal-up are already on site.js's observer and get .in from there */
  const io = ('IntersectionObserver' in window)
    ? new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.classList.add('in');
          io.unobserve(en.target);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: .1 })
    : null;

  function scan() {
    SEQ.forEach(tag);
    $$('.fl-item').forEach(function (el) {
      if (el.classList.contains('in') || el.dataset.flSeen) return;
      el.dataset.flSeen = '1';
      if (io) io.observe(el); else el.classList.add('in');
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
     3.  Scroll-linked layers
     ══════════════════════════════════════════════════════════════════════ */
  /* [selector, travel in px across a full pass of the viewport].
     Negative rises against the scroll (nearer the camera), positive trails
     behind it (further away). None of these carry an entry on `translate`,
     so the property is theirs alone. */
  const PAR = [
    ['.hero__skyline',            70],
    ['.hero__scroll',             34],
    ['.about__arches',           -54],
    ['.sect-head__note',         -30],
    ['.rating',                  -26],
    ['.mv__card:first-child',    -22],
    ['.mv__card:last-child',      22],
    ['.contact__bg',              56],
    ['.foot__brand',             -20]
  ];

  const par = [];     /* depth layers          → --fl-y   */
  const outs = [];    /* blocks leaving upward → --fl-out */
  const ins = [];     /* sections arriving     → --fl-in  */

  function collect() {
    par.length = outs.length = ins.length = 0;

    if (RICH) {
      PAR.forEach(function (p) {
        $$(p[0]).forEach(function (el) {
          el.classList.add('fl-par');
          par.push({ el: el, amp: p[1], top: 0, h: 1, v: null });
        });
      });

      /* The blocks that recede are the content columns, never the sections
         themselves — a section keeps its background and its divider still
         while the words inside it ease away. */
      $$('.section > .wrap, .work > .rail-wrap, .foot__inner').forEach(function (el) {
        el.classList.add('fl-block');
        /* a block that fades itself in keeps hold of its own opacity */
        if (!el.classList.contains('reveal-up')) el.classList.add('fl-fade');
        outs.push({ el: el, top: 0, h: 1, v: null });
      });
      const hero = document.querySelector('.hero__inner');
      if (hero) { hero.classList.add('fl-hero'); outs.push({ el: hero, top: 0, h: 1, v: null }); }
    }

    $$('main .section').forEach(function (el) {
      ins.push({ el: el, top: 0, h: 1, v: null });
    });
  }

  /* One batched read of the whole page, in document space. After this the
     frame loop only needs window.scrollY. */
  function measure() {
    const y = window.scrollY;
    const all = par.concat(outs, ins);
    for (let i = 0; i < all.length; i++) {
      const r = all[i].el.getBoundingClientRect();
      all[i].top = r.top + y;
      all[i].h = r.height || 1;
    }
  }

  /** Write only when the value actually moved — style churn is the cost here. */
  function put(item, prop, v, eps) {
    if (item.v !== null && Math.abs(item.v - v) < eps) return;
    item.v = v;
    item.el.style.setProperty(prop, prop === '--fl-y' ? v.toFixed(1) + 'px' : v.toFixed(3));
  }

  let vel = 0, lastY = window.scrollY, running = false, idle = 0;

  function frame() {
    const y = window.scrollY;
    const vh = window.innerHeight;

    /* velocity, smoothed — a raw per-frame delta is far too twitchy to drive
       anything you can see */
    const raw = clamp((y - lastY) / vh * 7, -1, 1);
    lastY = y;
    vel += (raw - vel) * .16;
    if (Math.abs(vel) < .0015) vel = 0;
    if (RICH) document.body.style.setProperty('--fl-vel', vel.toFixed(3));

    for (let i = 0; i < par.length; i++) {
      const it = par[i];
      const top = it.top - y;
      const p = clamp((vh - top) / (vh + it.h), 0, 1);
      put(it, '--fl-y', (p - .5) * it.amp, .35);
    }

    for (let i = 0; i < outs.length; i++) {
      const it = outs[i];
      const bottom = it.top + it.h - y;
      /* starts only once the block is nearly off the top, so nothing dims
         while it is still being read */
      put(it, '--fl-out', clamp((vh * .18 - bottom) / (vh * .43), 0, 1), .004);
    }

    for (let i = 0; i < ins.length; i++) {
      const it = ins[i];
      put(it, '--fl-in', clamp((vh * .92 - (it.top - y)) / (vh * .42), 0, 1), .004);
    }

    /* park the loop once the page is still again */
    if (++idle > 30 && vel === 0) { running = false; return; }
    requestAnimationFrame(frame);
  }

  function kick() {
    idle = 0;
    if (running) return;
    running = true;
    requestAnimationFrame(frame);
  }

  function remeasure() { measure(); kick(); }

  /* ══════════════════════════════════════════════════════════════════════
     4.  Wiring
     ══════════════════════════════════════════════════════════════════════ */
  scan();
  collect();
  measure();
  kick();

  window.addEventListener('scroll', kick, { passive: true });

  let rz = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rz);
    rz = setTimeout(function () { relayoutRows(); remeasure(); }, 140);
  }, { passive: true });

  window.addEventListener('si:revealed', remeasure);

  /* the index repaints on every filter and on "show all", and the rail, wall
     and service list are injected — re-tag whatever appears and re-measure,
     since the page just got taller or shorter */
  if ('MutationObserver' in window) {
    let mt = 0;
    const mo = new MutationObserver(function () {
      clearTimeout(mt);
      mt = setTimeout(function () { scan(); relayoutRows(); remeasure(); }, 60);
    });
    $$('#index-list, #wall, #svc-list, #why-list, #steps, #work-rail, #vend-list, #live-grid').forEach(function (el) {
      mo.observe(el, { childList: true });
    });
  }

  /* Anything that changes the height of the page moves every tracked block
     below it: a service panel opening, the index expanding, a late font, a
     canvas resizing. Watching the body's own box catches the lot without a
     listener per feature. */
  if ('ResizeObserver' in window) {
    let rt = 0;
    new ResizeObserver(function () {
      clearTimeout(rt);
      rt = setTimeout(remeasure, 90);
    }).observe(document.body);
  }

  /* Cormorant lands after first paint and reflows every heading under it. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { relayoutRows(); remeasure(); });
  }
  window.addEventListener('load', remeasure);

  window.SI_FLOW = { scan: scan, remeasure: remeasure };
})();
