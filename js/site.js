/* ══════════════════════════════════════════════════════════════════════════
   SmartIndia.ai — site behaviour
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const D = window.SI;
  const PROFILE = window.SI_PROFILE || { low: false, reduced: false, coarse: false };
  const LOGO = window.SI_LOGO;
  const $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  const $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  const clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  /* ── pointer plumbing ────────────────────────────────────────────────
     A gaming mouse delivers pointermove at 500–1000Hz. Calling
     getBoundingClientRect() in the handler forces a synchronous layout
     that often, and writing a style straight back invalidates it again —
     the browser ends up doing eight or ten full layouts per displayed
     frame and the whole page stutters.

     So: rects are measured once and re-measured only when the geometry
     can actually have changed, and every style write is deferred to the
     next animation frame. One layout, one paint, per frame.
     ──────────────────────────────────────────────────────────────────── */
  let geomEpoch = 0;
  window.addEventListener('scroll', function () { geomEpoch++; }, { passive: true });
  window.addEventListener('resize', function () { geomEpoch++; }, { passive: true });

  /** getBoundingClientRect() memoised until the page geometry moves. */
  function rectOf(el, box) {
    if (box.e !== geomEpoch) { box.r = el.getBoundingClientRect(); box.e = geomEpoch; }
    return box.r;
  }

  /** Coalesce repeated calls down to one per animation frame. */
  function perFrame(fn) {
    let raf = 0, args = null;
    return function () {
      args = arguments;
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = 0; fn.apply(null, args); });
    };
  }

  /* ══════════════════════════════════════════════════════════════════════
     1.  Logo placements
     ══════════════════════════════════════════════════════════════════════ */
  if (LOGO) {
    LOGO.mount($('#nav-logo'), { part: 'wordmark' });
    LOGO.mount($('#foot-logo'), {});
    LOGO.mount($('#hero-skyline'), { part: 'skyline', decorative: true });
  }

  /* ══════════════════════════════════════════════════════════════════════
     2.  Icon set — every glyph is drawn from the logo's own geometry:
         domes, gopuram tiers, arches and the 24-spoke wheel.
     ══════════════════════════════════════════════════════════════════════ */
  const ICONS = {
    window: '<path data-stroke d="M5 20v20a3 3 0 003 3h32a3 3 0 003-3V20M5 20C5 10.6 13.5 5 24 5s19 5.6 19 15M5 20h38"/><path data-stroke d="M11.5 13.5h.01M17 11h.01"/><path data-stroke d="M14 29h20M14 35h13"/>',
    device: '<path data-stroke d="M14 44V16c0-6.1 4.5-11 10-11s10 4.9 10 11v28a2 2 0 01-2 2H16a2 2 0 01-2-2z"/><path data-stroke d="M14 18h20"/><path data-stroke d="M14 38h20"/><path data-stroke d="M20 42h8"/><path data-stroke d="M20 24h8M20 30h5"/>',
    cart: '<path data-stroke d="M10 18h28l-3 21a3 3 0 01-3 2.6H16a3 3 0 01-3-2.6z"/><path data-stroke d="M17 18v-3a7 7 0 0114 0v3"/><path data-stroke d="M10 18C10 12 16 7 24 7s14 5 14 11"/><circle data-stroke cx="19" cy="46" r="0"/><path data-stroke d="M18 26v8M30 26v8M24 24v12"/>',
    grid: '<path data-stroke d="M6 12h15v13H6zM27 12h15v13H27zM6 31h15v12H6zM27 31h15v12H27z"/><path data-stroke d="M13.5 12c0-4 0-7 0-7M34.5 12c0-4 0-7 0-7"/><path data-stroke d="M10 18.5h7M31 18.5h7"/>',
    layers: '<path data-stroke d="M17 39h14v6H17zM13 30h22v9H13zM9 21h30v9H9z"/><path data-stroke d="M15 21c0-6 4-10 9-10s9 4 9 10"/><path data-stroke d="M24 5v6"/>',
    pen: '<path data-stroke d="M8 40l4-13L31 8a5 5 0 017 7L19 34z"/><path data-stroke d="M28 11l7 7"/><path data-stroke d="M8 40l7-3"/><path data-stroke d="M10 46h28"/>',
    chakra: '<circle data-stroke cx="24" cy="24" r="19"/><circle data-stroke cx="24" cy="24" r="3.4"/><path data-stroke d="M24 6.5v11M24 30.5v11M6.5 24h11M30.5 24h11"/><path data-stroke d="M11.6 11.6l7.8 7.8M28.6 28.6l7.8 7.8M36.4 11.6l-7.8 7.8M19.4 28.6l-7.8 7.8"/>'
  };

  function icon(name) {
    return '<svg viewBox="0 0 48 48" aria-hidden="true">' + (ICONS[name] || ICONS.chakra) + '</svg>';
  }

  /* ══════════════════════════════════════════════════════════════════════
     3.  Render content
     ══════════════════════════════════════════════════════════════════════ */

  /* — services — */
  (function services() {
    const host = $('#svc-list');
    if (!host || !D) return;
    host.innerHTML = D.SERVICES.map(function (s) {
      return '<article class="svc__item" tabindex="0">' +
        '<span class="svc__no">' + s.no + '</span>' +
        '<div class="svc__ico">' + icon(s.icon) + '</div>' +
        '<h3>' + s.title + '</h3>' +
        '<p>' + s.copy + '</p>' +
        '<div class="svc__more"><ul>' +
          s.tags.map(function (t) { return '<li>' + t + '</li>'; }).join('') +
        '</ul></div>' +
      '</article>';
    }).join('');

    /* measure each stroke so the icon can draw itself in */
    $$('.svc__ico [data-stroke]', host).forEach(function (p) {
      let L = 220;
      try { L = p.getTotalLength() || 220; } catch (e) {}
      p.style.setProperty('--len', Math.ceil(L + 2));
    });

    /* light follows the pointer across each panel */
    if (!PROFILE.coarse && !PROFILE.low) {
      $$('.svc__item', host).forEach(function (el) {
        const box = { e: -1, r: null };
        const paint = perFrame(function (x, y) {
          const r = box.r;
          el.style.setProperty('--mx', ((x - r.left) / r.width * 100).toFixed(1) + '%');
          el.style.setProperty('--my', ((y - r.top) / r.height * 100).toFixed(1) + '%');
        });
        el.addEventListener('pointermove', function (e) {
          rectOf(el, box);
          paint(e.clientX, e.clientY);
        }, { passive: true });
      });
    }
    /* keyboard + touch: tap to expand the detail row */
    $$('.svc__item', host).forEach(function (el) {
      el.addEventListener('click', function () { el.classList.toggle('is-open'); });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.classList.toggle('is-open'); }
      });
    });
  })();

  /* — why us — */
  (function why() {
    const host = $('#why-list');
    if (!host || !D) return;
    host.innerHTML = D.WHY.map(function (w, i) {
      return '<li class="why__item reveal-up">' +
        '<span class="n">0' + (i + 1) + '</span>' +
        '<h3>' + w.t + '</h3>' +
        '<p>' + w.p + '</p>' +
      '</li>';
    }).join('');
  })();

  /* — process steps + capability columns — */
  (function tech() {
    const host = $('#steps');
    if (host && D) {
      host.innerHTML = D.STEPS.map(function (s) {
        return '<li class="reveal-up"><h4>' + s.t + '</h4><p>' + s.p + '</p></li>';
      }).join('');
    }
    if (!D) return;
    const map = { 'cap-build': 'build', 'cap-commerce': 'commerce', 'cap-ai': 'ai', 'cap-ops': 'ops' };
    Object.keys(map).forEach(function (id) {
      const ul = document.getElementById(id);
      if (!ul) return;
      ul.innerHTML = D.CAPS[map[id]].map(function (c) { return '<li>' + c + '</li>'; }).join('');
    });
  })();

  /* — ticker — */
  (function ticker() {
    const row = $('#ticker-row');
    if (!row || !D) return;
    const names = D.PLATFORMS.filter(function (_, i) { return i % 3 === 0; })
      .map(function (p) { return p.n; });
    const html = names.map(function (n) { return '<span>' + n + '</span>'; }).join('');
    row.innerHTML = html + html;   /* duplicated so the loop is seamless */
  })();

  /* — featured rail — */
  (function rail() {
    const host = $('#work-rail');
    if (!host || !D) return;
    host.innerHTML = D.FEATURED.map(function (p, i) {
      const tint = D.CARD_TINTS[i % D.CARD_TINTS.length];
      return '<article class="rail__card" style="--c1:' + tint[0] + ';--c2:' + tint[1] + '">' +
        '<div class="rail__vis"><span class="rail__grid"></span>' +
          '<span class="rail__mono">' + D.monogram(p.n) + '</span></div>' +
        '<div class="rail__body">' +
          '<span class="rail__cat">' + D.CATS[p.c] + '</span>' +
          '<h3>' + p.n + '</h3>' +
          '<p class="rail__dom">' + p.d + '</p>' +
          '<a class="rail__cta" href="https://' + p.d + '" target="_blank" rel="noopener">' +
            'Visit live site' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</a>' +
        '</div>' +
      '</article>';
    }).join('');

    /* arrows */
    $$('.rail__btn').forEach(function (b) {
      b.addEventListener('click', function () {
        const card = host.querySelector('.rail__card');
        const step = card ? card.getBoundingClientRect().width + 20 : 320;
        host.scrollBy({ left: step * parseInt(b.dataset.rail, 10), behavior: 'smooth' });
      });
    });

    /* drag to scroll */
    let down = false, sx = 0, sl = 0, moved = 0;
    host.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return;
      down = true; moved = 0; sx = e.clientX; sl = host.scrollLeft;
      host.classList.add('is-drag');
    });
    /* one scroll write per frame, not one per pointer sample */
    const dragTo = perFrame(function (x) { host.scrollLeft = sl - (x - sx); });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      moved = Math.abs(e.clientX - sx);
      dragTo(e.clientX);
    }, { passive: true });
    window.addEventListener('pointerup', function (e) {
      if (!down) return;
      down = false;
      host.classList.remove('is-drag');
      if (moved > 6) {                        /* swallow the click after a drag */
        const kill = function (ev) { ev.preventDefault(); ev.stopPropagation(); };
        host.addEventListener('click', kill, { capture: true, once: true });
        setTimeout(function () { host.removeEventListener('click', kill, true); }, 40);
      }
    });

    /* depth: cards away from centre sit slightly back.
       Every rect is read before any style is written — interleaving the
       two makes the browser re-lay-out the rail once per card. */
    if (!PROFILE.low) {
      let raf = 0;
      const cards = $$('.rail__card', host);
      const mids = new Float64Array(cards.length);
      const depth = function () {
        raf = 0;
        const hr = host.getBoundingClientRect();
        const cw = host.clientWidth;
        const mid = hr.left + cw / 2;
        const reach = cw * .62;
        for (let i = 0; i < cards.length; i++) {          /* read */
          const r = cards[i].getBoundingClientRect();
          mids[i] = r.left + r.width / 2;
        }
        for (let i = 0; i < cards.length; i++) {          /* then write */
          const d = clamp(Math.abs(mids[i] - mid) / reach, 0, 1);
          cards[i].style.transform =
            'scale(' + (1 - d * .055).toFixed(3) + ') translateY(' + (d * 10).toFixed(1) + 'px)';
          cards[i].style.opacity = (1 - d * .32).toFixed(3);
        }
      };
      host.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(depth); }, { passive: true });
      window.addEventListener('resize', function () { if (!raf) raf = requestAnimationFrame(depth); }, { passive: true });
      setTimeout(depth, 60);
    }
  })();

  /* — filterable live index — */
  (function index() {
    const list = $('#index-list');
    const bar = $('#filters');
    const more = $('#index-more');
    if (!list || !D) return;

    const CAP = 24;
    let active = 'all';
    let expanded = false;

    const order = [
      ['all', 'All', D.counts.total],
      ['dynamic', 'Dynamic', D.counts.dynamic],
      ['ecom', 'E-Commerce', D.counts.ecom],
      ['multi', 'Multi-Vendor', D.counts.multi],
      ['web', 'Web Platform', D.counts.web]
    ];

    if (bar) {
      bar.innerHTML = order.map(function (o) {
        return '<button type="button" role="tab" data-f="' + o[0] + '" aria-selected="' +
          (o[0] === 'all') + '">' + o[1] + '<b>' + o[2] + '</b></button>';
      }).join('');
      bar.addEventListener('click', function (e) {
        const b = e.target.closest('button[data-f]');
        if (!b) return;
        active = b.dataset.f;
        expanded = false;
        $$('button', bar).forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); });
        paint();
      });
    }

    function rows() {
      return active === 'all' ? D.PLATFORMS : D.PLATFORMS.filter(function (p) { return p.c === active; });
    }

    function paint() {
      const all = rows();
      const show = expanded ? all : all.slice(0, CAP);
      list.innerHTML = show.map(function (p) {
        return '<li><a href="https://' + p.d + '" target="_blank" rel="noopener">' +
          '<span class="ix-mono" aria-hidden="true">' + D.monogram(p.n) + '</span>' +
          '<span class="ix-txt">' +
            '<span class="ix-name">' + p.n + '</span>' +
            '<span class="ix-dom">' + p.d + '</span>' +
          '</span>' +
          '<svg class="ix-arrow" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">' +
            '<path d="M7 17L17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '</a></li>';
      }).join('');
      if (more) {
        const hidden = all.length - show.length;
        more.hidden = all.length <= CAP;
        more.querySelector('span').textContent = expanded
          ? 'Show fewer'
          : 'Show all ' + all.length + ' platforms (' + hidden + ' more)';
      }
    }

    if (more) {
      more.addEventListener('click', function () {
        expanded = !expanded;
        paint();
        if (!expanded) $('#index-block').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    paint();
  })();

  /* — client wall — */
  (function wall() {
    const host = $('#wall');
    if (!host || !D) return;
    /* an even spread across every category, not just the first 40 rows */
    const step = Math.max(1, Math.floor(D.PLATFORMS.length / 42));
    const picks = D.PLATFORMS.filter(function (_, i) { return i % step === 0; }).slice(0, 42);
    host.innerHTML = picks.map(function (p) {
      return '<a href="https://' + p.d + '" target="_blank" rel="noopener" title="' + p.n + '">' +
        '<span class="w-mono">' + D.monogram(p.n) + '</span>' +
        '<span class="w-name">' + p.n + '</span>' +
      '</a>';
    }).join('');
  })();

  /* — footer year — */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ══════════════════════════════════════════════════════════════════════
     4.  Scroll choreography
     ══════════════════════════════════════════════════════════════════════ */
  const io = ('IntersectionObserver' in window)
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.classList.add('in');
          io.unobserve(en.target);
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 })
    : null;

  function observeAll() {
    const sel = '.reveal-up, .svc__item, .stat, .about__arches, .steps li';
    $$(sel).forEach(function (el) {
      if (el.classList.contains('in')) return;
      if (io) io.observe(el); else el.classList.add('in');
    });
  }
  observeAll();

  /* — animated counters — */
  function runCounter(el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    if (el.hasAttribute('data-plain')) return;

    let target = parseFloat(el.dataset.count);
    if (el.dataset.live && D && D.counts[el.dataset.live] != null) {
      target = D.counts[el.dataset.live];
    }
    if (!isFinite(target)) return;

    const dec = parseInt(el.dataset.decimals || '0', 10);
    const suffix = el.dataset.suffix || '';
    if (PROFILE.reduced) { el.textContent = target.toFixed(dec) + suffix; return; }

    const dur = 1500;
    const t0 = performance.now();
    (function step(now) {
      const k = clamp((now - t0) / dur, 0, 1);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = (target * e).toFixed(dec) + suffix;
      if (k < 1) requestAnimationFrame(step);
      else el.textContent = target.toFixed(dec) + suffix;
    })(t0);
  }

  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting) { runCounter(en.target); cio.unobserve(en.target); }
      });
    }, { threshold: 0.4 });
    $$('[data-count]').forEach(function (el) { cio.observe(el); });
  } else {
    $$('[data-count]').forEach(runCounter);
  }

  /* — scroll progress + nav state + active section — */
  const nav = $('#nav');
  const bar = $('#scroll-progress');
  const navLinks = $$('.nav__links a');
  const sections = navLinks.map(function (a) {
    return document.querySelector(a.getAttribute('href'));
  });

  let lastY = window.scrollY, navTick = 0, lastCur = -2;

  /* Read the whole frame's worth of geometry first, then write. Toggling a
     class and *then* measuring forces the browser to re-run layout inside
     the handler — on every scroll frame, all the way down the page. */
  function onScroll() {
    navTick = 0;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const doc = document.documentElement;

    /* ── read ── */
    const max = Math.max(doc.scrollHeight - vh, 1);
    const hi = vh * 0.42, lo = vh * 0.32;
    let cur = -1;
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      if (!s) continue;
      const r = s.getBoundingClientRect();
      if (r.top <= hi && r.bottom > lo) cur = i;
    }

    /* ── write ── */
    if (bar) bar.style.width = (y / max * 100).toFixed(2) + '%';
    if (nav) {
      nav.classList.toggle('is-stuck', y > 40);
      /* hide on the way down, reveal on the way up — never over the hero */
      if (y > 300 && y > lastY + 4) nav.classList.add('is-hidden');
      else if (y < lastY - 4) nav.classList.remove('is-hidden');
    }
    lastY = y;
    if (cur !== lastCur) {                 /* only touch the DOM when it moves */
      lastCur = cur;
      navLinks.forEach(function (a, i) { a.classList.toggle('is-active', i === cur); });
    }
  }
  window.addEventListener('scroll', function () {
    if (!navTick) navTick = requestAnimationFrame(onScroll);
  }, { passive: true });
  onScroll();

  /* ══════════════════════════════════════════════════════════════════════
     5.  Mobile menu
     ══════════════════════════════════════════════════════════════════════ */
  (function menu() {
    const burger = $('#nav-burger');
    const panel = $('#menu');
    if (!burger || !panel) return;

    function open(state) {
      burger.setAttribute('aria-expanded', String(state));
      burger.setAttribute('aria-label', state ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('is-locked', state);
      if (state) {
        panel.hidden = false;
        requestAnimationFrame(function () {
          panel.classList.add('is-open');
          $$('a', panel).forEach(function (a, i) { a.style.transitionDelay = (0.06 + i * 0.045) + 's'; });
        });
      } else {
        panel.classList.remove('is-open');
        $$('a', panel).forEach(function (a) { a.style.transitionDelay = '0s'; });
        setTimeout(function () { if (!panel.classList.contains('is-open')) panel.hidden = true; }, 700);
      }
    }
    burger.addEventListener('click', function () {
      open(burger.getAttribute('aria-expanded') !== 'true');
    });
    $$('a', panel).forEach(function (a) {
      a.addEventListener('click', function () { open(false); });
    });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') open(false);
    });
  })();

  /* ══════════════════════════════════════════════════════════════════════
     6.  Micro-interactions
     ══════════════════════════════════════════════════════════════════════ */
  if (!PROFILE.coarse && !PROFILE.reduced) {

    /* magnetic buttons */
    $$('.magnetic').forEach(function (el) {
      const strength = 0.28;
      const box = { e: -1, r: null };
      const move = perFrame(function (x, y) {
        const r = box.r;
        const dx = (x - (r.left + r.width / 2)) * strength;
        const dy = (y - (r.top + r.height / 2)) * strength;
        el.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
      });
      el.addEventListener('pointermove', function (e) {
        rectOf(el, box);
        move(e.clientX, e.clientY);
      }, { passive: true });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; }, { passive: true });
    });

    /* card tilt with real perspective */
    $$('.tilt').forEach(function (el) {
      const box = { e: -1, r: null };
      const move = perFrame(function (cx, cy) {
        const r = box.r;
        const x = (cx - r.left) / r.width - .5;
        const y = (cy - r.top) / r.height - .5;
        el.style.transform =
          'perspective(900px) rotateX(' + (-y * 5).toFixed(2) + 'deg) rotateY(' +
          (x * 6).toFixed(2) + 'deg) translateZ(6px)';
      });
      el.addEventListener('pointermove', function (e) {
        rectOf(el, box);
        move(e.clientX, e.clientY);
      }, { passive: true });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; }, { passive: true });
    });

    /* cursor */
    const cur = $('#cursor');
    if (cur) {
      let x = 0, y = 0, tx = 0, ty = 0, on = false, raf = 0;
      /* Chase the pointer, then stop. Left running, this is a permanent rAF
         writing an identical transform for as long as the tab is open. */
      const loop = function () {
        x += (tx - x) * .18; y += (ty - y) * .18;
        cur.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
        if (Math.abs(tx - x) < .1 && Math.abs(ty - y) < .1) { raf = 0; return; }
        raf = requestAnimationFrame(loop);
      };
      window.addEventListener('mousemove', function (e) {
        tx = e.clientX; ty = e.clientY;
        if (!on) { on = true; cur.classList.add('is-on'); x = tx; y = ty; }
        if (!raf) raf = requestAnimationFrame(loop);
      }, { passive: true });
      window.addEventListener('mouseleave', function () {
        cur.classList.remove('is-on'); on = false;
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
      });
      const hot = 'a, button, .svc__item, .rail__card, input, textarea, select, .wall a';
      document.addEventListener('pointerover', function (e) {
        if (e.target.closest && e.target.closest(hot)) cur.classList.add('is-hot');
      });
      document.addEventListener('pointerout', function (e) {
        if (e.target.closest && e.target.closest(hot)) cur.classList.remove('is-hot');
      });
    }
  }

  /* anchor scrolling that clears the fixed header */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      const id = a.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      const t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      const top = t.getBoundingClientRect().top + window.scrollY - (id === '#top' ? 0 : 72);
      window.scrollTo({ top: top, behavior: PROFILE.reduced ? 'auto' : 'smooth' });
      if (nav) nav.classList.remove('is-hidden');
    });
  });

  /* ══════════════════════════════════════════════════════════════════════
     7.  Contact form
     ══════════════════════════════════════════════════════════════════════ */
  (function form() {
    const f = $('#contact-form');
    if (!f) return;
    const status = $('#form-status');

    function fail(id, msg) {
      const input = document.getElementById(id);
      const box = input.closest('.field');
      const err = f.querySelector('[data-err="' + id + '"]');
      box.classList.add('has-err');
      input.setAttribute('aria-invalid', 'true');
      if (err) err.textContent = msg;
      return input;
    }
    function clear() {
      $$('.field', f).forEach(function (b) { b.classList.remove('has-err'); });
      $$('.err', f).forEach(function (e) { e.textContent = ''; });
      $$('input,textarea', f).forEach(function (i) { i.removeAttribute('aria-invalid'); });
      if (status) { status.textContent = ''; status.classList.remove('is-err'); }
    }

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      clear();

      const name = $('#f-name').value.trim();
      const email = $('#f-email').value.trim();
      const phone = $('#f-phone').value.trim();
      const topic = $('#f-topic').value;
      const msg = $('#f-msg').value.trim();

      let first = null;
      if (msg.length < 10) first = fail('f-msg', 'A sentence or two about the project, please.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) first = fail('f-email', 'That email address does not look right.');
      if (name.length < 2) first = fail('f-name', 'Please tell us your name.');

      if (first) {
        first.focus();
        if (status) { status.textContent = 'Please correct the highlighted fields.'; status.classList.add('is-err'); }
        return;
      }

      /* No server is wired up yet, so hand the enquiry to the visitor's own
         mail client with everything already filled in. */
      const body = [
        'Name: ' + name,
        'Email: ' + email,
        phone ? 'Phone: ' + phone : '',
        'Enquiry: ' + topic,
        '',
        msg
      ].filter(Boolean).join('\n');

      const href = 'mailto:' + D.CONTACT.email +
        '?subject=' + encodeURIComponent('New enquiry — ' + topic + ' — ' + name) +
        '&body=' + encodeURIComponent(body);

      if (status) status.textContent = 'Opening your mail app with the enquiry ready to send…';
      window.location.href = href;
    });

    /* clear a field's error as soon as the visitor starts fixing it */
    $$('input,textarea', f).forEach(function (i) {
      i.addEventListener('input', function () {
        const box = i.closest('.field');
        if (!box.classList.contains('has-err')) return;
        box.classList.remove('has-err');
        i.removeAttribute('aria-invalid');
        const err = f.querySelector('[data-err="' + i.id + '"]');
        if (err) err.textContent = '';
      });
    });
  })();

  /* ══════════════════════════════════════════════════════════════════════
     8.  Hand-off from the reveal
     ══════════════════════════════════════════════════════════════════════ */
  function enter() {
    const t = $('.hero__title');
    if (t) t.classList.add('in');
    $$('.hero .reveal-up').forEach(function (el, i) {
      setTimeout(function () { el.classList.add('in'); }, 90 + i * 90);
    });
    observeAll();
    onScroll();
  }
  window.addEventListener('si:revealed', enter);
  /* if the reveal never fires for any reason, don't leave the hero blank */
  setTimeout(function () {
    if (!document.body.classList.contains('is-booting')) enter();
  }, 6000);
})();
