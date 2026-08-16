/* ══════════════════════════════════════════════════════════════════════════
   SmartIndia.ai — 3D brand reveal
   ──────────────────────────────────────────────────────────────────────────
   Sequence:  particles assemble the skyline  →  3D depth develops  →
              wordmark resolves under a specular sweep  →  chakra locks  →
              tagline draws  →  hero hold  →  camera pushes through the mark
   The mark itself is the real vector logo. It is never redrawn, retyped or
   re-proportioned — only lit, extruded and moved in 3D.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── device profile ─────────────────────────────────────────────────── */
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CORES = navigator.hardwareConcurrency || 4;
  const MEM = navigator.deviceMemory || 4;
  const COARSE = window.matchMedia('(pointer: coarse)').matches;
  const LOW = REDUCED || CORES <= 4 || MEM <= 3 ||
              (COARSE && window.innerWidth < 820) || window.innerWidth < 560;

  const PROFILE = { reduced: REDUCED, low: LOW, coarse: COARSE };
  window.SI_PROFILE = PROFILE;
  if (LOW) document.body.classList.add('is-low');

  /* ══════════════════════════════════════════════════════════════════════
     Logo mounting — one template, many placements, zero redrawing
     ══════════════════════════════════════════════════════════════════════ */
  let uid = 0;

  function uniquify(svg) {
    const n = ++uid;
    const defs = svg.querySelectorAll('defs [id]');
    for (let i = 0; i < defs.length; i++) {
      const old = defs[i].id;
      const nw = old + '_' + n;
      defs[i].id = nw;
      const ref = 'url(#' + old + ')';
      const rep = 'url(#' + nw + ')';
      svg.querySelectorAll('[fill="' + ref + '"]').forEach(function (e) { e.setAttribute('fill', rep); });
      svg.querySelectorAll('[stroke="' + ref + '"]').forEach(function (e) { e.setAttribute('stroke', rep); });
    }
  }

  /**
   * Place the Ashoka Chakra exactly onto the reserved slot inside the
   * wordmark, at the correct optical size. Measured, never guessed, so the
   * mark keeps its proportions at any scale.
   */
  function placeChakra(svg) {
    const text = svg.querySelector('.si-wm');
    const slot = svg.querySelector('.si-slot');
    const chakra = svg.querySelector('.si-chakra');
    if (!text || !slot || !chakra) return;

    const size = parseFloat(text.getAttribute('font-size')) || 128;
    const baseline = parseFloat(text.getAttribute('y')) || 402;
    const r = size * 0.262;          /* a shade taller than the x-height, as drawn */
    const scale = r / 30;            /* the drawn chakra has radius 30 */
    let cx;

    try {
      const bb = slot.getBBox();
      cx = (bb && bb.width > 1) ? bb.x + bb.width / 2 : NaN;
    } catch (e) { cx = NaN; }

    if (!isFinite(cx)) {                        /* safety net */
      try {
        const tb = text.getBBox();
        cx = tb.x + tb.width * 0.615;
      } catch (e2) { cx = 566; }
    }

    const cy = baseline - r * 0.99;
    chakra.setAttribute('transform',
      'translate(' + cx.toFixed(2) + ' ' + cy.toFixed(2) + ') scale(' + scale.toFixed(4) + ')');
    chakra.dataset.cx = cx;
    chakra.dataset.cy = cy;
  }

  /**
   * Crop a wordmark-only clone tightly to the type it actually renders.
   * Horizontally we can trust the measured box; vertically we cannot —
   * getBBox() on <text> reports the font's full ascent/descent run, which for
   * Cormorant is far taller than these caps. So the vertical crop is derived
   * from the baseline and cap height instead, and the mark fills its box.
   */
  function fitWordmark(svg) {
    const text = svg.querySelector('.si-wm');
    const g = svg.querySelector('.si-wordmark');
    if (!g || !text) return;
    let bb;
    try { bb = g.getBBox(); } catch (e) { return; }
    if (!bb || bb.width < 10) return;

    const fs = parseFloat(text.getAttribute('font-size')) || 128;
    const base = parseFloat(text.getAttribute('y')) || 402;
    const top = base - fs * 0.74;
    const bot = base + fs * 0.05;
    const padX = fs * 0.10;

    svg.setAttribute('viewBox',
      (bb.x - padX).toFixed(1) + ' ' + top.toFixed(1) + ' ' +
      (bb.width + padX * 2).toFixed(1) + ' ' + (bot - top).toFixed(1));
  }

  const pending = [];
  const wordmarks = [];
  function scheduleChakra(svg) {
    pending.push(svg);
    placeChakra(svg);
  }
  function refit() {
    pending.forEach(placeChakra);
    wordmarks.forEach(fitWordmark);
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(refit).catch(function () {});
  }

  /**
   * @param {Element} host
   * @param {{viewBox?:string, part?:'full'|'lockup'|'skyline', decorative?:boolean}} opts
   */
  function mountLogo(host, opts) {
    opts = opts || {};
    const tpl = document.getElementById('si-logo-src');
    if (!tpl || !host) return null;
    const svg = tpl.content.firstElementChild.cloneNode(true);

    if (opts.part === 'lockup') {
      const t = svg.querySelector('.si-tagline'); if (t) t.remove();
      svg.setAttribute('viewBox', '0 0 1000 418');
    } else if (opts.part === 'wordmark') {
      /* compact nav lockup — the wordmark alone, cropped to its own box.
         The chakra travels with it, so the mark is still fully present. */
      const sk = svg.querySelector('.si-skyline'); if (sk) sk.remove();
      const t = svg.querySelector('.si-tagline'); if (t) t.remove();
      svg.setAttribute('viewBox', '112 296 776 122');
    } else if (opts.part === 'shell') {
      /* extrusion shell — skyline only, but keeps the full viewBox so it
         registers pixel-perfectly behind the face layer */
      const w = svg.querySelector('.si-wordmark'); if (w) w.remove();
      const t = svg.querySelector('.si-tagline'); if (t) t.remove();
    } else if (opts.part === 'skyline') {
      const w = svg.querySelector('.si-wordmark'); if (w) w.remove();
      const t = svg.querySelector('.si-tagline'); if (t) t.remove();
      svg.setAttribute('viewBox', '0 78 1000 186');
      svg.setAttribute('preserveAspectRatio', 'xMidYMax meet');
    }
    if (opts.viewBox) svg.setAttribute('viewBox', opts.viewBox);
    if (opts.decorative) {
      svg.setAttribute('aria-hidden', 'true');
      svg.removeAttribute('role');
      svg.removeAttribute('aria-label');
    }

    uniquify(svg);
    host.appendChild(svg);
    if (opts.part !== 'skyline' && opts.part !== 'shell') scheduleChakra(svg);

    /* the crop is only correct once the real wordmark metrics are known */
    if (opts.part === 'wordmark') { wordmarks.push(svg); fitWordmark(svg); }
    return svg;
  }

  window.SI_LOGO = { mount: mountLogo, place: placeChakra };

  /* ══════════════════════════════════════════════════════════════════════
     Build the reveal stage
     ══════════════════════════════════════════════════════════════════════ */
  const root = document.getElementById('reveal');
  const faceHost = document.getElementById('reveal-face');
  const extrudeHost = document.getElementById('reveal-extrude');
  const canvas = document.getElementById('reveal-canvas');
  const skipBtn = document.getElementById('reveal-skip');

  if (!root || !faceHost) { document.body.classList.remove('is-booting'); return; }

  const faceSvg = mountLogo(faceHost, {});

  /* ── real 3D extrusion: skyline shells receding in Z ──────────────────
     Each shell is a flat bitmap, not a live SVG clone. Cloning the skyline
     per shell costs ~200 DOM nodes and a filtered compositing layer each —
     that alone pushed first paint into the tens of seconds on slower
     hardware. Instead the skyline is serialised once per depth with its
     gold gradient pre-darkened, so there is no runtime filter at all. ── */
  const LAYERS = PROFILE.low ? 4 : 9;
  const STEP = 3.6;

  function shellImage(depth) {
    const tpl = document.getElementById('si-logo-src');
    const svg = tpl.content.firstElementChild.cloneNode(true);
    const w = svg.querySelector('.si-wordmark'); if (w) w.remove();
    const t = svg.querySelector('.si-tagline'); if (t) t.remove();

    /* bake the depth shading straight into the gradient stops */
    const k = 0.76 - depth * 0.66;
    const stops = svg.querySelectorAll('stop');
    for (let i = 0; i < stops.length; i++) {
      const c = stops[i].getAttribute('stop-color') || '#000000';
      const m = /^#([0-9a-f]{6})$/i.exec(c.trim());
      if (!m) continue;
      const v = parseInt(m[1], 16);
      const r = Math.round(((v >> 16) & 255) * k);
      const g = Math.round(((v >> 8) & 255) * k * 0.97);
      const b = Math.round((v & 255) * k * 0.92);
      stops[i].setAttribute('stop-color',
        '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1));
    }
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return 'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(new XMLSerializer().serializeToString(svg));
  }

  for (let i = 1; i <= LAYERS; i++) {
    const img = document.createElement('img');
    img.className = 'reveal__shell';
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    img.decoding = 'async';
    img.src = shellImage(i / LAYERS);
    img.style.transform = 'translateZ(' + (-i * STEP).toFixed(2) + 'px)';
    extrudeHost.appendChild(img);
  }

  /* ══════════════════════════════════════════════════════════════════════
     Particle field — motes converge onto the real skyline geometry
     ══════════════════════════════════════════════════════════════════════ */
  const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  let W = 0, H = 0, dpr = 1;
  let motes = [], ambient = [];
  let rafId = 0, t0 = 0, running = false;
  let assembleAlpha = 1;
  /* the hand-off moment, in seconds of reveal time. Driven by elapsed time
     rather than a timer so it can never desync from the visuals. */
  let fadeAt = 1e6;
  const clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };

  const DRAW = window.SI_DRAW;
  const GOLD = DRAW.cid([255, 231, 176]);
  const GOLD2 = DRAW.cid([227, 178, 91]);
  const SAFF = DRAW.cid([255, 153, 51]);
  const GRN = DRAW.cid([31, 168, 58]);
  const NAVY = DRAW.cid([90, 130, 220]);

  /** @returns {number} a batcher colour id, resolved once at build time */
  function pickColor(i) {
    const m = i % 20;
    if (m === 0 || m === 7) return SAFF;
    if (m === 3) return GRN;
    if (m === 11) return NAVY;
    if (m % 2) return GOLD;
    return GOLD2;
  }

  function fit() {
    if (!canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, PROFILE.low ? 1.5 : 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /**
   * Sample points along the actual skyline outlines, in SVG user space.
   * Deliberately *not* getScreenCTM(): the mark sits inside a CSS 3D
   * transform, and a 2D CTM cannot describe that. Targets are kept in
   * viewBox units and projected per frame against the live layout box, so
   * the motes stay welded to the logo no matter how the camera moves.
   */
  function sampleSkyline(count) {
    const out = [];
    if (!faceSvg) return out;
    const els = faceSvg.querySelectorAll('.si-skyline > *');
    const usable = [];
    let total = 0;

    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      if (typeof el.getTotalLength !== 'function') continue;
      let L = 0;
      try { L = el.getTotalLength(); } catch (e) { continue; }
      if (!isFinite(L) || L <= 2) continue;
      usable.push({ el: el, L: L });
      total += L;
    }
    if (!usable.length || !total) return out;

    for (let i = 0; i < usable.length; i++) {
      const u = usable[i];
      const n = Math.max(2, Math.round(count * (u.L / total)));
      for (let k = 0; k < n; k++) {
        let p;
        try { p = u.el.getPointAtLength((k + Math.random() * 0.6) / n * u.L); } catch (e) { break; }
        out.push([p.x, p.y]);
      }
    }
    return out;
  }

  /* live projection: viewBox units → viewport px */
  const VB_W = 1000;
  let mapX = 0, mapY = 0, mapS = 0.5;
  function refreshMap() {
    if (!faceSvg) return;
    const r = faceSvg.getBoundingClientRect();
    if (r.width < 20) return;
    mapS = r.width / VB_W;
    mapX = r.left;
    mapY = r.top;
  }

  function buildMotes() {
    const want = PROFILE.low ? 230 : 640;
    const targets = sampleSkyline(want);
    motes = [];

    const cx = W / 2, cy = H / 2;
    const spread = Math.max(W, H) * 0.85;

    if (targets.length) {
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        const a = Math.random() * Math.PI * 2;
        const rad = spread * (0.55 + Math.random() * 0.75);
        /* stagger left→right so the skyline "writes" itself across */
        const lead = (t[0] / VB_W) * 0.34 + Math.random() * 0.22;
        motes.push({
          x: cx + Math.cos(a) * rad,
          y: cy + Math.sin(a) * rad * 0.62,
          px: 0, py: 0,
          vx: t[0], vy: t[1],            /* target, in viewBox units */
          d: lead,
          sp: 0.055 + Math.random() * 0.06,
          r: 0.5 + Math.random() * 1.5,
          c: pickColor(i),
          seed: Math.random() * 6.283
        });
      }
    } else {
      /* geometry unavailable — fall back to an elegant convergent cloud */
      const n = PROFILE.low ? 160 : 380;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const rad = spread * (0.5 + Math.random() * 0.8);
        motes.push({
          x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad * 0.6,
          px: 0, py: 0,
          vx: 40 + Math.random() * 920, vy: 210 + Math.random() * 50,
          d: Math.random() * 0.4, sp: 0.05 + Math.random() * 0.05,
          r: 0.6 + Math.random() * 1.4, c: pickColor(i), seed: Math.random() * 6.283
        });
      }
    }
    for (let i = 0; i < motes.length; i++) { motes[i].px = motes[i].x; motes[i].py = motes[i].y; }

    ambient = [];
    const an = PROFILE.low ? 26 : 70;
    for (let i = 0; i < an; i++) {
      ambient.push({
        x: Math.random() * W, y: Math.random() * H,
        r: 0.4 + Math.random() * 1.3,
        v: 0.06 + Math.random() * 0.22,
        drift: (Math.random() - 0.5) * 0.14,
        a: 0.12 + Math.random() * 0.4,
        c: pickColor(i * 3 + 1),
        seed: Math.random() * 6.283
      });
    }
  }

  function draw(now) {
    if (!running || !ctx) return;
    const t = (now - t0) / 1000;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    /* ambient dust — present for the whole reveal */
    for (let i = 0; i < ambient.length; i++) {
      const p = ambient[i];
      p.y -= p.v; p.x += p.drift;
      if (p.y < -8) { p.y = H + 8; p.x = Math.random() * W; }
      const tw = 0.65 + 0.35 * Math.sin(t * 1.6 + p.seed);
      DRAW.fill(p.c, p.a * tw, p.x, p.y, p.r);
    }

    /* assembling motes */
    assembleAlpha = 1 - clamp01((t - fadeAt) / 0.42);
    if (assembleAlpha > 0.002) {
      refreshMap();
      const trails = !PROFILE.low;
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        const k = t - m.d;
        if (k <= 0) continue;
        m.px = m.x; m.py = m.y;
        const s = Math.min(m.sp * (1 + k * 1.7), 0.34);
        /* project the target through the mark's live layout box each frame */
        const tx = mapX + m.vx * mapS;
        const ty = mapY + m.vy * mapS;
        m.x += (tx - m.x) * s;
        m.y += (ty - m.y) * s;

        const dx = m.x - m.px, dy = m.y - m.py;
        const speed = Math.sqrt(dx * dx + dy * dy);
        const near = Math.min(1, speed / 26);
        const a = Math.min(1, k * 2.4) * assembleAlpha;

        /* light trail while travelling fast */
        if (speed > 1.6 && trails) {
          DRAW.line(m.c, a * near * 0.42, m.r * 0.75,
            m.px - dx * 2.2, m.py - dy * 2.2, m.x, m.y);
        }
        const tw = 0.7 + 0.3 * Math.sin(t * 3.2 + m.seed);
        DRAW.fill(m.c, a * tw * 0.9, m.x, m.y, m.r * (1 + near * 0.5));
      }
    }

    DRAW.flush(ctx);
    ctx.globalCompositeOperation = 'source-over';
    rafId = requestAnimationFrame(draw);
  }

  function startField() {
    if (!ctx) return;
    fit();
    refreshMap();
    buildMotes();
    running = true;
    t0 = performance.now();
    rafId = requestAnimationFrame(draw);
  }
  function stopField() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (ctx) ctx.clearRect(0, 0, W, H);
  }

  /* ══════════════════════════════════════════════════════════════════════
     Subtle parallax — the mark responds to the viewer, gently
     ══════════════════════════════════════════════════════════════════════ */
  const stageEl = root.querySelector('.reveal__stage');
  let px = 0, py = 0, tpx = 0, tpy = 0, parallaxOn = false, parRaf = 0;

  /* Moving the perspective origin moves the *camera*, not the logo — the mark
     keeps its exact shape while the viewer looks around it. */
  function parallaxLoop() {
    if (!parallaxOn) return;
    px += (tpx - px) * 0.055;
    py += (tpy - py) * 0.055;
    stageEl.style.setProperty('--ox', (px * -70).toFixed(1) + 'px');
    stageEl.style.setProperty('--oy', (py * -46).toFixed(1) + 'px');
    parRaf = requestAnimationFrame(parallaxLoop);
  }
  function onMove(e) {
    tpx = (e.clientX / window.innerWidth - 0.5) * 2;
    tpy = (e.clientY / window.innerHeight - 0.5) * 2;
  }
  function onTilt(e) {
    if (e.gamma == null) return;
    tpx = Math.max(-1, Math.min(1, e.gamma / 26));
    tpy = Math.max(-1, Math.min(1, (e.beta - 45) / 34));
  }

  /* ══════════════════════════════════════════════════════════════════════
     Timeline
     ══════════════════════════════════════════════════════════════════════ */
  const KEY = 'si_seen_reveal_v1';
  let seen = false;
  try { seen = sessionStorage.getItem(KEY) === '1'; } catch (e) {}

  let timers = [];
  let finished = false;
  let outroRan = false;

  function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function stage(n) {
    root.classList.remove('s-0', 's-1', 's-2', 's-3', 's-4');
    root.classList.add('s-' + n);
  }

  function dropParallax() {
    parallaxOn = false;
    if (parRaf) cancelAnimationFrame(parRaf);
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('deviceorientation', onTilt);
  }

  /**
   * The closing beat: the mark pushes past the camera and, as it goes, the
   * brand line lands in the space it leaves behind and holds.
   * @param {number} hold  ms the line stays on screen
   */
  function outro(hold) {
    if (finished || outroRan) return;
    outroRan = true;
    stage(4);
    dropParallax();

    const enter = PROFILE.reduced ? 40 : 300;
    at(enter, function () { root.classList.add('is-outro'); });
    at(enter + hold, function () { root.classList.add('is-outro-out'); });
    at(enter + hold + 90, function () { finish(true); });
  }

  /** @param {boolean} [fast]  true when the dramatic exit has already played */
  function finish(fast) {
    if (finished) return;
    finished = true;
    clearTimers();
    dropParallax();
    if (!fast) stage(4);

    setTimeout(function () {
      document.body.classList.remove('is-booting');
      root.classList.add('is-done');
      window.dispatchEvent(new CustomEvent('si:revealed'));
    }, PROFILE.reduced ? 60 : (fast ? 110 : 620));

    setTimeout(function () {
      stopField();
      root.classList.add('is-gone');
      root.setAttribute('aria-hidden', 'true');
    }, PROFILE.reduced ? 400 : (fast ? 660 : 1240));

    try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
  }

  function run() {
    /* ── reduced motion: present the mark, then the line, no movement ── */
    if (PROFILE.reduced) {
      stage(3);
      at(900, function () { outro(1100); });
      return;
    }

    /* ── returning visitor: compressed mark, shorter line hold ── */
    if (seen) {
      fadeAt = -1;                 /* no assembly pass — go straight to the mark */
      startField();
      stage(2);
      at(60, function () { stage(3); });
      at(950, function () { outro(1200); });
      return;
    }

    /* ── first visit: the full sequence, ~6s ── */
    fadeAt = 0.72;                 /* motes hand off to the vector mark here */
    startField();
    stage(0);

    at(40, function () { stage(1); });                  /* skyline resolves out of the dust */
    at(1180, function () { stage(2); });                /* wordmark + specular sweep + chakra */
    at(1900, function () {                              /* tagline draws, hero moment begins */
      stage(3);
      if (!PROFILE.coarse) {
        parallaxOn = true;
        window.addEventListener('mousemove', onMove, { passive: true });
        parallaxLoop();
      } else if (window.DeviceOrientationEvent) {
        parallaxOn = true;
        window.addEventListener('deviceorientation', onTilt, { passive: true });
        parallaxLoop();
      }
    });
    /* camera pushes through the chakra, and the brand line takes its place */
    at(3400, function () { outro(2200); });
  }

  const bail = function () { finish(true); };
  if (skipBtn) skipBtn.addEventListener('click', bail);
  window.addEventListener('keydown', function (e) {
    if (!finished && (e.key === 'Escape' || e.key === 'Enter')) bail();
  });
  window.addEventListener('resize', function () {
    if (running) { fit(); }
  }, { passive: true });

  /* never trap the visitor if something goes wrong */
  setTimeout(function () { if (!finished) bail(); }, 11000);

  /* start once the fonts are settled so the wordmark never reflows mid-reveal */
  function boot() {
    refit();
    requestAnimationFrame(function () { requestAnimationFrame(run); });
  }
  if (document.fonts && document.fonts.ready) {
    let started = false;
    const go = function () { if (!started) { started = true; boot(); } };
    document.fonts.ready.then(go).catch(go);
    setTimeout(go, 1400);          /* don't wait on a slow font CDN */
  } else {
    boot();
  }
})();
