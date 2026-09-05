/* ══════════════════════════════════════════════════════════════════════════
   SmartIndia.ai — 3D brand reveal
   ──────────────────────────────────────────────────────────────────────────
   Sequence:  particles assemble the mark  →  3D depth develops  →
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
    chakra.dataset.scale = scale;      /* the mote field rebuilds the wheel
                                          analytically and needs the scale */
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
   * @param {{viewBox?:string, part?:'full'|'wordmark', decorative?:boolean}} opts
   */
  function mountLogo(host, opts) {
    opts = opts || {};
    const tpl = document.getElementById('si-logo-src');
    if (!tpl || !host) return null;
    const svg = tpl.content.firstElementChild.cloneNode(true);

    if (opts.part === 'wordmark') {
      /* compact nav lockup — the wordmark alone, cropped to its own box.
         The chakra travels with it, so the mark is still fully present. */
      const t = svg.querySelector('.si-tagline'); if (t) t.remove();
      svg.setAttribute('viewBox', '112 296 776 122');
    }
    if (opts.viewBox) svg.setAttribute('viewBox', opts.viewBox);
    if (opts.decorative) {
      svg.setAttribute('aria-hidden', 'true');
      svg.removeAttribute('role');
      svg.removeAttribute('aria-label');
    }

    uniquify(svg);
    host.appendChild(svg);
    scheduleChakra(svg);

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

  /* Normal template: hand the page over immediately. Do not write the
     "seen" key — a later visit in 3D should still get the intro. */
  if (document.documentElement.getAttribute('data-mode') === 'normal') {
    document.body.classList.remove('is-booting');
    root.classList.add('is-done', 'is-gone');
    root.setAttribute('aria-hidden', 'true');
    window.dispatchEvent(new CustomEvent('si:revealed'));
    return;
  }

  const faceSvg = mountLogo(faceHost, {});

  /* ── real 3D extrusion: the wheel, in shells receding in Z ────────────
     The skyline used to be the extruded body. With it gone the Ashoka
     Chakra is the only pure-vector element left in the mark, and it is the
     right one to give the depth to: it is the same wheel the hero turns, so
     the intro and the page under it are one object seen twice.

     The old shells had to be bitmaps — cloning ~200 skyline nodes per depth
     pushed first paint into the tens of seconds on slower hardware. A
     chakra is 27 nodes, so the shells are live SVG again: no serialising,
     no data URI, no font to wait on, and no runtime filter either, since
     the depth shading is written straight onto the stroke. They also
     inherit the spin-up from the same CSS the face uses, so the whole
     extrusion turns as one body instead of drifting out of register. ── */
  const LAYERS = PROFILE.low ? 4 : 9;
  const STEP = 3.6;
  const SVGNS = 'http://www.w3.org/2000/svg';

  /* the wheel recedes toward a deeper indigo, never toward black — on paper
     a black shell reads as a hole cut in the page rather than as depth */
  const SHELL_NEAR = [46, 78, 178];
  const SHELL_FAR = [14, 26, 72];

  function shellNode(depth) {
    const src = faceSvg && faceSvg.querySelector('.si-chakra');
    if (!src) return null;

    const k = 0.26 + depth * 0.62;               /* 0 = face colour, 1 = shade */
    const ink = 'rgb(' +
      Math.round(SHELL_NEAR[0] + (SHELL_FAR[0] - SHELL_NEAR[0]) * k) + ',' +
      Math.round(SHELL_NEAR[1] + (SHELL_FAR[1] - SHELL_NEAR[1]) * k) + ',' +
      Math.round(SHELL_NEAR[2] + (SHELL_FAR[2] - SHELL_NEAR[2]) * k) + ')';

    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', faceSvg.getAttribute('viewBox'));
    svg.setAttribute('class', 'reveal__shell');
    svg.setAttribute('aria-hidden', 'true');

    const g = src.cloneNode(true);
    g.setAttribute('stroke', ink);
    g.querySelectorAll('[fill]').forEach(function (e) {
      if (e.getAttribute('fill') !== 'none') e.setAttribute('fill', ink);
    });
    svg.appendChild(g);
    return svg;
  }

  /* Built after the fonts settle, not at parse time: the chakra is placed by
     measuring the slot in the real typeface, so a shell cloned before that
     would freeze the fallback position and never re-register. */
  function buildShells() {
    if (!extrudeHost) return;
    extrudeHost.textContent = '';
    for (let i = 1; i <= LAYERS; i++) {
      const n = shellNode(i / LAYERS);
      if (!n) return;
      n.style.transform = 'translateZ(' + (-i * STEP).toFixed(2) + 'px)';
      extrudeHost.appendChild(n);
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     Particle field — motes converge onto the real mark: letters and wheel
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

  /* Inks, not sparks: the field is drawn onto paper, so the motes are
     pigment settling on the mark rather than light gathering out of black.
     They composite normally for the same reason (see draw()). */
  const DRAW = window.SI_DRAW;
  const GOLD = DRAW.cid([176, 124, 32]);
  const GOLD2 = DRAW.cid([150, 104, 28]);
  const SAFF = DRAW.cid([230, 122, 24]);
  const GRN = DRAW.cid([19, 136, 8]);
  const NAVY = DRAW.cid([43, 74, 160]);

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

  /* The glyph run as the wordmark actually sets it, including the invisible
     slot the chakra occupies — it advances the pen without being drawn, so
     the dust lands on the letters as they are really set rather than on an
     evenly spaced approximation of them. */
  const WM_RUN = [
    ['Smart', 128], ['In', 128], ['d', 128],
    ['n', 128, true],                    /* the reserved slot */
    ['a', 128], ['.ai', 88]
  ];

  /**
   * Sample points on the wordmark's silhouette, in SVG user space.
   *
   * The skyline used to supply these as vector outlines. Type cannot:
   * getTotalLength() is meaningless on a <text>, and converting Cormorant
   * to paths would mean shipping a second copy of the mark. So the wordmark
   * is drawn once into an offscreen canvas at viewBox scale and the motes
   * are seeded from the pixels that came back opaque — the letters fill in
   * out of the dust rather than being outlined by it.
   *
   * Deliberately *not* getScreenCTM(): the mark sits inside a CSS 3D
   * transform, and a 2D CTM cannot describe that. Targets stay in viewBox
   * units and are projected per frame against the live layout box, so the
   * motes stay welded to the logo no matter how the camera moves.
   */
  function sampleWordmark(count) {
    const out = [];
    const cv = document.createElement('canvas');
    const c2 = cv.getContext && cv.getContext('2d');
    if (!c2) return out;

    const SS = 0.5;                            /* silhouette resolution */
    cv.width = Math.max(1, Math.round(vbW * SS));
    cv.height = Math.max(1, Math.round(vbH * SS));
    /* the same face the sheet sets on .si-wm, tracking included — a couple of
       percent of drift across the run is enough to walk the dust off the
       letters at the ends. letterSpacing is re-applied after every font
       assignment because some engines clear it with the shorthand. */
    const face = function (px) {
      c2.font = '600 ' + px + 'px "Cormorant Garamond", Garamond, "Times New Roman", serif';
      if ('letterSpacing' in c2) c2.letterSpacing = '-1px';
    };

    let total = 0;
    for (let i = 0; i < WM_RUN.length; i++) {
      face(WM_RUN[i][1]);
      total += c2.measureText(WM_RUN[i][0]).width;
    }
    if (!(total > 10)) return out;

    /* text-anchor="middle" about x=500, on the baseline the <text> declares */
    let x = 500 - total / 2;
    c2.setTransform(SS, 0, 0, SS, -vbX * SS, -vbY * SS);
    c2.fillStyle = '#fff';
    c2.textAlign = 'left';
    c2.textBaseline = 'alphabetic';
    for (let i = 0; i < WM_RUN.length; i++) {
      const seg = WM_RUN[i];
      face(seg[1]);
      if (!seg[2]) c2.fillText(seg[0], x, 402);
      x += c2.measureText(seg[0]).width;
    }

    let img;
    try { img = c2.getImageData(0, 0, cv.width, cv.height); } catch (e) { return out; }
    const d = img.data, cw = cv.width, ch = cv.height;
    const hits = [];
    for (let py = 0; py < ch; py++) {
      for (let pxi = 0; pxi < cw; pxi++) {
        if (d[(py * cw + pxi) * 4 + 3] > 120) hits.push(pxi, py);
      }
    }
    const n = hits.length / 2;
    if (!n) return out;

    for (let i = 0; i < count; i++) {
      const j = (Math.random() * n) | 0;
      out.push([
        vbX + (hits[j * 2] + Math.random()) / SS,
        vbY + (hits[j * 2 + 1] + Math.random()) / SS
      ]);
    }
    return out;
  }

  /**
   * The wheel, rebuilt analytically rather than walked with
   * getPointAtLength(): each spoke carries its own rotate(), and
   * getPointAtLength reports a point *before* the element's own transform,
   * so walking them would stack all twenty-four onto one. The geometry is
   * fixed and known — rim r30, hub r4.6, spokes r6→r28 — so it is cheaper
   * and exact to lay the points down directly and push them through the
   * placement placeChakra() measured.
   */
  function sampleChakra(count) {
    const out = [];
    const g = faceSvg && faceSvg.querySelector('.si-chakra');
    if (!g) return out;
    const cx = parseFloat(g.dataset.cx);
    const cy = parseFloat(g.dataset.cy);
    const sc = parseFloat(g.dataset.scale);
    if (!isFinite(cx) || !isFinite(cy) || !isFinite(sc)) return out;

    const rim = Math.max(8, Math.round(count * 0.46));
    for (let i = 0; i < rim; i++) {
      const a = (i / rim) * Math.PI * 2;
      out.push([cx + Math.cos(a) * 30 * sc, cy + Math.sin(a) * 30 * sc]);
    }
    const per = Math.max(2, Math.round(count * 0.44 / 24));
    for (let s = 0; s < 24; s++) {
      const a = (s / 24) * Math.PI * 2 - Math.PI / 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      for (let k = 0; k < per; k++) {
        const r = (6 + 22 * (k + Math.random() * 0.6) / per) * sc;
        out.push([cx + ca * r, cy + sa * r]);
      }
    }
    const hub = Math.max(6, Math.round(count * 0.10));
    for (let i = 0; i < hub; i++) {
      const a = (i / hub) * Math.PI * 2;
      out.push([cx + Math.cos(a) * 4.6 * sc, cy + Math.sin(a) * 4.6 * sc]);
    }
    return out;
  }

  /* live projection: viewBox units → viewport px.
     The viewBox no longer starts at the origin — it is cropped to the
     lockup — so the offset has to come out of the map, not be assumed. */
  let vbX = 0, vbY = 290, vbW = 1000, vbH = 182;
  let mapX = 0, mapY = 0, mapS = 0.5;
  function refreshMap() {
    if (!faceSvg) return;
    const vb = (faceSvg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
    if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) {
      vbX = vb[0]; vbY = vb[1]; vbW = vb[2]; vbH = vb[3];
    }
    const r = faceSvg.getBoundingClientRect();
    if (r.width < 20) return;
    mapS = r.width / vbW;
    mapX = r.left - vbX * mapS;
    mapY = r.top - vbY * mapS;
  }

  function buildMotes() {
    const want = PROFILE.low ? 230 : 640;
    /* the letters take the bulk of the dust, the wheel the rest — split by
       the area each actually covers, so neither reads as denser than it is */
    const targets = sampleWordmark(Math.round(want * 0.72))
      .concat(sampleChakra(Math.round(want * 0.28)));
    motes = [];

    const cx = W / 2, cy = H / 2;
    const spread = Math.max(W, H) * 0.85;

    if (targets.length) {
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        const a = Math.random() * Math.PI * 2;
        const rad = spread * (0.55 + Math.random() * 0.75);
        /* stagger left→right so the mark "writes" itself across */
        const lead = ((t[0] - vbX) / vbW) * 0.34 + Math.random() * 0.22;
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
          vx: 140 + Math.random() * 720, vy: 320 + Math.random() * 80,
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
    ctx.globalCompositeOperation = 'source-over';

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

    at(40, function () { stage(1); });                  /* the wheel's depth develops */
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
  window.addEventListener('si:mode', function (e) {
    if (e.detail === 'normal' && !finished) bail();
  });
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
    buildShells();               /* after refit — the shells clone the placed chakra */
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
