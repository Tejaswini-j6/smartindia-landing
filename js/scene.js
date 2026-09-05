/* ══════════════════════════════════════════════════════════════════════════
   SmartIndia.ai — 3D scenes
   ──────────────────────────────────────────────────────────────────────────
   A small purpose-built 3D renderer. No library, no download, no WebGL
   context to lose — depth-sorted primitives on a 2D canvas.

   The hero object is the Ashoka Chakra from the logo, rebuilt in 3D and
   wrapped in a network of nodes: the brand symbol at the centre of an
   information graph. Every colour is taken from the mark.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const PROFILE = window.SI_PROFILE || { low: false, reduced: false, coarse: false };

  /* Two palettes for the same roles. On the dark ground these are emissive —
     light added to a dark field. On paper nothing can be drawn by adding
     light, so the same roles become inks at the weight they hold against the
     warm page. Composite is 'source-over' throughout for the same reason
     (see COMP below).

     The wheel is the Ashoka Chakra, so it is indigo in both themes — the
     mark's own navy, taken to ink weight on paper and lit on the dark
     ground. The gold stays where the gold belongs: the orbits, the graph
     and the dust around it. */
  const WHEEL_HI = [38, 50, 127];   /* the wheel's lit edge */
  const WHEEL = [63, 82, 181];      /* inner rim, spokes */
  const GOLD_HI = [176, 124, 32];
  const GOLD = [150, 104, 28];
  const GOLD_MID = [198, 156, 92];  /* the far orbits, where ink thins out */
  const SAFFRON = [230, 122, 24];
  const GREEN = [19, 136, 8];
  const NAVY = [43, 74, 160];
  const NAVY_SOFT = [96, 122, 186];

  /* [array, light, dark] — the arrays above are mutated in place and their
     cached strings rewritten, so the colour ids the geometry already holds
     stay valid and a theme flip never rebuilds a scene. */
  const TINTS = [
    [WHEEL_HI, [38, 50, 127], [150, 172, 246]],
    [WHEEL, [63, 82, 181], [110, 138, 216]],
    [GOLD_HI, [176, 124, 32], [220, 192, 138]],
    [GOLD, [150, 104, 28], [194, 164, 104]],
    [GOLD_MID, [198, 156, 92], [167, 140, 80]],
    [SAFFRON, [230, 122, 24], [238, 148, 69]],
    [GREEN, [19, 136, 8], [110, 140, 85]],
    [NAVY, [43, 74, 160], [110, 138, 216]],
    [NAVY_SOFT, [96, 122, 186], [140, 163, 226]]
  ];

  /* Every scene drew under 'lighter', which is additive and therefore
     order-independent — that is what let draw.js regroup primitives into
     colour buckets. On paper additive blending only washes toward white, so
     the scenes composite normally instead. Regrouping stays safe: these are
     scattered translucent motes and hairlines, not stacked opaque shapes. */
  const COMP = 'source-over';

  const DRAW = window.SI_DRAW;
  const TAU = DRAW.TAU;
  const rgba = DRAW.rgba;
  const cid = DRAW.cid;
  const addFill = DRAW.fill;
  const addLine = DRAW.line;
  const flush = DRAW.flush;
  const recolor = DRAW.recolor;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  /* Load the palette for whichever theme the head script stamped, before any
     scene registers a colour. */
  function applyTheme() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    for (let i = 0; i < TINTS.length; i++) {
      const t = TINTS[i], v = dark ? t[2] : t[1];
      t[0][0] = v[0]; t[0][1] = v[1]; t[0][2] = v[2];
      recolor(t[0]);
    }
  }
  applyTheme();

  /* ══════════════════════════════════════════════════════════════════════
     Quality governor
     ──────────────────────────────────────────────────────────────────────
     Device sniffing only guesses. This measures: if the page cannot hold
     its frame budget we shed the optional work rather than let the whole
     site stutter. It steps down and never back up — hunting between two
     levels reads worse than sitting at either one.

     The wheel itself is never reduced. It is the mark; only the
     atmosphere around it thins out.
     ══════════════════════════════════════════════════════════════════════ */
  let QUALITY = PROFILE.low ? 1 : 0;
  const qHooks = [];
  const onQuality = function (fn) { qHooks.push(fn); };
  const qScale = function () { return QUALITY === 0 ? 1 : QUALITY === 1 ? .68 : .42; };
  const qDpr = function () { return QUALITY === 0 ? 1 : QUALITY === 1 ? .8 : .62; };

  function stepDown() {
    if (QUALITY >= 2) return;
    QUALITY++;
    for (let i = 0; i < qHooks.length; i++) qHooks[i](QUALITY);
  }

  /* ══════════════════════════════════════════════════════════════════════
     Shared ticker — one rAF for every canvas on the page
     ══════════════════════════════════════════════════════════════════════ */
  const jobs = [];
  let ticking = false, last = 0;
  let warmup = 90, acc = 0, accN = 0, cooldown = 0;

  function tick(now) {
    const raw = now - last;
    const dt = Math.min(raw / 1000, 0.05);
    last = now;

    let alive = false;
    for (let i = 0; i < jobs.length; i++) {
      const j = jobs[i];
      if (!j.active) continue;
      alive = true;
      j.frame(now / 1000, dt);
    }

    /* Nothing on screen: stop burning frames entirely. gate() restarts us
       the moment a canvas scrolls back into view. */
    if (!alive) { ticking = false; acc = 0; accN = 0; return; }

    if (warmup > 0) { warmup--; }
    else if (cooldown > 0) { cooldown--; }
    else if (raw < 200) {                   /* ignore tab-switch gaps */
      acc += raw; accN++;
      if (accN >= 45) {
        const avg = acc / accN;
        acc = 0; accN = 0;
        if (avg > 21 && QUALITY < 2) { stepDown(); cooldown = 90; }
      }
    }
    requestAnimationFrame(tick);
  }
  function wake() {
    if (ticking) return;
    ticking = true; last = performance.now();
    requestAnimationFrame(tick);
  }
  function register(job) {
    jobs.push(job);
    if (job.active) wake();
  }

  /* visibility gate — nothing renders while it is off screen */
  function gate(el, job) {
    if (!('IntersectionObserver' in window)) { job.active = true; wake(); return; }
    new IntersectionObserver(function (es) {
      job.active = es[0].isIntersecting;
      if (job.active) wake();
    }, { rootMargin: '120px' }).observe(el);
  }

  /* ══════════════════════════════════════════════════════════════════════
     Canvas helper
     ══════════════════════════════════════════════════════════════════════ */
  function setup(canvas, maxDpr) {
    const ctx = canvas.getContext('2d', { alpha: true });
    const o = { canvas: canvas, ctx: ctx, w: 0, h: 0, dpr: 1, max: maxDpr || 2 };
    o.fit = function () {
      const r = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width));
      const h = Math.max(1, Math.round(r.height));
      const cap = o.max * qDpr();
      o.dpr = Math.min(window.devicePixelRatio || 1, cap);
      canvas.width = Math.round(w * o.dpr);
      canvas.height = Math.round(h * o.dpr);
      ctx.setTransform(o.dpr, 0, 0, o.dpr, 0, 0);
      o.w = w; o.h = h;
    };
    o.fit();
    return o;
  }

  /* debounced resize that survives a torn-down scene */
  function onResize(fn, ms) {
    let rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt); rt = setTimeout(fn, ms || 180);
    }, { passive: true });
  }

  /* ══════════════════════════════════════════════════════════════════════
     HERO — the Chakra Core
     ══════════════════════════════════════════════════════════════════════ */
  function heroScene() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas || !canvas.getContext) return;
    /* full-viewport particle field: 2× device pixels is four times the
       fill rate for detail no one can resolve at these alphas */
    const s = setup(canvas, 1.5);
    const ctx = s.ctx;

    /* ── geometry ──────────────────────────────────────────────────────── */
    const pts = [];    /* {x,y,z, r, ci, a, glow} */
    const lines = [];  /* {a,b, ci, w, o} */
    let R = 1;

    /* g:0 = the wheel itself — it sways, it never spins like a logo turntable.
       g:1 = the surrounding cloud — that is what actually orbits. */
    let GRP = 0;
    function P(x, y, z, r, c, a, glow) {
      pts.push({ x: x, y: y, z: z, r: r, ci: cid(c), a: a, glow: glow || 0, g: GRP, dust: 0, ph: 0 });
      return pts.length - 1;
    }
    function L(a, b, c, w, o) { lines.push({ a: a, b: b, ci: cid(c), w: w, o: o }); }

    function build(unit) {
      pts.length = 0; lines.length = 0;
      R = unit;
      GRP = 0;
      const qs = qScale();

      /* — chakra rim (two concentric circles, as in the mark) —
         The wheel is indigo, the same navy the chakra carries in the
         wordmark. The gold belongs to what orbits it, not to the
         wheel itself. — */
      const RIM = PROFILE.low ? 60 : 108;
      let firstOuter = -1, prevOuter = -1;
      for (let i = 0; i < RIM; i++) {
        const a = (i / RIM) * Math.PI * 2;
        const id = P(Math.cos(a) * R, Math.sin(a) * R, 0, 1.5, WHEEL_HI, .95, 1);
        if (prevOuter >= 0) L(prevOuter, id, WHEEL_HI, 1.7, .9);
        else firstOuter = id;
        prevOuter = id;
      }
      L(prevOuter, firstOuter, WHEEL_HI, 1.7, .9);

      const RIM2 = PROFILE.low ? 40 : 72;
      let firstIn = -1, prevIn = -1;
      for (let i = 0; i < RIM2; i++) {
        const a = (i / RIM2) * Math.PI * 2;
        const id = P(Math.cos(a) * R * .93, Math.sin(a) * R * .93, 0, 0, WHEEL, .0, 0);
        if (prevIn >= 0) L(prevIn, id, WHEEL, .9, .55);
        else firstIn = id;
        prevIn = id;
      }
      L(prevIn, firstIn, WHEEL, .9, .55);

      /* — 24 spokes, exactly as the wheel is drawn — */
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        const i0 = P(ca * R * .17, sa * R * .17, 0, 0, WHEEL, 0, 0);
        const i1 = P(ca * R * .90, sa * R * .90, 0, 1.9, WHEEL_HI, .85, 1);
        L(i0, i1, WHEEL, 1.15, .72);
      }

      /* — hub — */
      let fh = -1, ph = -1;
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        const id = P(Math.cos(a) * R * .155, Math.sin(a) * R * .155, 0, 0, WHEEL_HI, 0, 0);
        if (ph >= 0) L(ph, id, WHEEL_HI, 2.2, .95); else fh = id;
        ph = id;
      }
      L(ph, fh, WHEEL_HI, 2.2, .95);

      GRP = 1;

      /* — two orbital rings, tilted: depth cues that read as motion — */
      function orbit(rad, tiltX, tiltY, col, alpha, n) {
        const cx = Math.cos(tiltX), sx = Math.sin(tiltX);
        const cy = Math.cos(tiltY), sy = Math.sin(tiltY);
        let f = -1, p = -1;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          let x = Math.cos(a) * rad, y = Math.sin(a) * rad, z = 0;
          let y2 = y * cx - z * sx, z2 = y * sx + z * cx;
          let x2 = x * cy + z2 * sy; z2 = -x * sy + z2 * cy;
          const id = P(x2, y2, z2, i % 9 === 0 ? 1.6 : 0, col, i % 9 === 0 ? alpha : 0, i % 9 === 0 ? .6 : 0);
          if (p >= 0) L(p, id, col, .8, alpha * .5); else f = id;
          p = id;
        }
        L(p, f, col, .8, alpha * .5);
      }
      const ON = Math.max(24, Math.round((PROFILE.low ? 40 : 84) * qs));
      orbit(R * 1.42, 1.16, .22, GOLD_MID, .55, ON);
      orbit(R * 1.78, -.92, .58, NAVY, .5, ON);
      if (QUALITY < 2 && !PROFILE.low) orbit(R * 2.14, .38, -1.1, GOLD_MID, .3, ON);

      /* — information graph: nodes on a shell, linked to near neighbours — */
      const NN = Math.max(20, Math.round((PROFILE.low ? 46 : 120) * qs));
      const nodeIds = [];
      const nodePos = [];
      for (let i = 0; i < NN; i++) {
        /* fibonacci shell keeps the spread even, never clumpy */
        const k = i + .5;
        const phi = Math.acos(1 - 2 * k / NN);
        const th = Math.PI * (1 + Math.sqrt(5)) * k;
        const rr = R * (1.25 + ((i * 37) % 100) / 100 * 1.35);
        const x = Math.cos(th) * Math.sin(phi) * rr;
        const y = Math.sin(th) * Math.sin(phi) * rr;
        const z = Math.cos(phi) * rr;
        const accent = i % 17 === 0 ? SAFFRON : (i % 23 === 0 ? GREEN : (i % 3 === 0 ? NAVY : GOLD));
        nodeIds.push(P(x, y, z, 1 + (i % 4) * .45, accent, .62, i % 11 === 0 ? .8 : 0));
        nodePos.push([x, y, z]);
      }
      const linkD = R * 0.92, linkD2 = linkD * linkD;
      for (let i = 0; i < NN; i++) {
        let made = 0;
        for (let j = i + 1; j < NN && made < 2; j++) {
          const dx = nodePos[i][0] - nodePos[j][0];
          const dy = nodePos[i][1] - nodePos[j][1];
          const dz = nodePos[i][2] - nodePos[j][2];
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < linkD2) { L(nodeIds[i], nodeIds[j], NAVY_SOFT, .7, .34); made++; }
        }
      }

      /* — atmospheric dust — */
      const DN = Math.max(24, Math.round((PROFILE.low ? 70 : 190) * qs));
      const DI = cid(GOLD), DS = cid(SAFFRON), DG = cid(GREEN);
      for (let i = 0; i < DN; i++) {
        const a = Math.random() * Math.PI * 2;
        const b2 = Math.acos(2 * Math.random() - 1);
        const rr = R * (2.3 + Math.random() * 2.6);
        pts.push({
          x: Math.sin(b2) * Math.cos(a) * rr,
          y: Math.sin(b2) * Math.sin(a) * rr * .78,
          z: Math.cos(b2) * rr,
          r: .35 + Math.random() * 1.15,
          ci: i % 13 === 0 ? DS : (i % 19 === 0 ? DG : DI),
          a: .18 + Math.random() * .34, glow: 0, dust: 1, g: 1,
          ph: Math.random() * 6.283
        });
      }
    }

    /* ── camera + projection buffers (no per-frame allocation) ─────────── */
    let cx = 0, cy = 0, focal = 1, dist = 1;
    let mx = 0, my = 0, tmx = 0, tmy = 0;
    let scrollK = 0;
    let px, py, pz, psc;

    function allocate() {
      const n = pts.length;
      px = new Float32Array(n); py = new Float32Array(n);
      pz = new Float32Array(n); psc = new Float32Array(n);
    }

    function layout() {
      s.fit();
      const wide = s.w > 980;
      /* On narrow screens the wheel drops below the copy instead of sitting
         behind it — a deliberate mobile composition, not a shrunk desktop. */
      const unit = wide
        ? Math.min(s.w * .21, s.h * .245)
        : Math.min(s.w * .36, s.h * .21);
      build(Math.max(64, unit));
      allocate();
      focal = R * 3.5;
      dist = R * 4.3;
      cx = s.w * (wide ? .705 : .5);
      /* mobile: the wheel rises behind the stat bar, clear of the body copy */
      cy = s.h * (wide ? .47 : .80);
    }
    layout();
    onQuality(layout);

    function frame(t) {
      const n = pts.length;
      if (!n) return;

      mx += (tmx - mx) * 0.045;
      my += (tmy - my) * 0.045;

      /* cinematic idle. The wheel sways within ±22° so it always reads as the
         brand symbol; the cloud around it turns continuously. */
      const swayY = Math.sin(t * 0.155) * 0.38 + mx * 0.30;
      const orbitY = t * 0.085 + mx * 0.42;
      const rx = Math.sin(t * 0.21) * 0.12 + my * -0.26 + 0.08;
      const rz = Math.sin(t * 0.155) * 0.04;

      const cS = Math.cos(swayY), sS = Math.sin(swayY);
      const cO = Math.cos(orbitY), sO = Math.sin(orbitY);
      const cB = Math.cos(rx), sB = Math.sin(rx);
      const cC = Math.cos(rz), sC = Math.sin(rz);

      const drift = scrollK;
      const offY = drift * s.h * 0.24;
      const zoom = 1 - drift * 0.14;
      const dustWob = R * 0.03;

      for (let i = 0; i < n; i++) {
        const p = pts[i];
        let x = p.x, y = p.y, z = p.z;
        if (p.dust) {                                   /* dust shimmers slowly */
          y += Math.sin(t * 0.5 + p.ph) * dustWob;
        }
        /* Y — wheel and cloud turn at different rates */
        const cA = p.g ? cO : cS, sA = p.g ? sO : sS;
        const x1 = x * cA + z * sA;
        let z1 = -x * sA + z * cA;
        /* X */
        const y1 = y * cB - z1 * sB; z1 = y * sB + z1 * cB;
        /* Z */
        const x2 = x1 * cC - y1 * sC, y2 = x1 * sC + y1 * cC;

        const d = z1 + dist;
        pz[i] = d;
        if (d < 24) { psc[i] = 0; continue; }
        const k = (focal / d) * zoom;
        psc[i] = k;
        px[i] = cx + x2 * k;
        py[i] = cy + y2 * k + offY;
      }

      ctx.clearRect(0, 0, s.w, s.h);
      ctx.globalCompositeOperation = COMP;
      ctx.lineCap = 'round';

      const near = dist - R * 2.4, far = dist + R * 4.6;
      const invSpan = 1 / (far - near);
      const invRel = dist / focal;                 /* 1 / (focal / dist) */
      const canGlow = QUALITY === 0 && !PROFILE.low;

      /* — links — */
      for (let i = 0, m = lines.length; i < m; i++) {
        const l = lines[i];
        const sa = psc[l.a], sb = psc[l.b];
        if (!sa || !sb) continue;
        /* depth-of-field: things far from the focal plane lose light */
        const depth = clamp(((pz[l.a] + pz[l.b]) * .5 - near) * invSpan, 0, 1);
        const dof = 1 - Math.abs(depth - 0.42) * 0.85;
        const rel = (sa + sb) * .5 * invRel;
        const al = l.o * dof * (0.35 + 0.65 * rel);
        if (al <= 0.012) continue;
        addLine(l.ci, al * 0.55, Math.max(0.35, l.w * rel * 0.9),
          px[l.a], py[l.a], px[l.b], py[l.b]);
      }

      /* — points — */
      for (let i = 0; i < n; i++) {
        const k = psc[i];
        if (!k) continue;
        const p = pts[i];
        if (!p.a || !p.r) continue;
        const depth = clamp((pz[i] - near) * invSpan, 0, 1);
        const dof = 1 - Math.abs(depth - 0.42) * 0.85;
        let al = p.a * dof;
        if (p.dust) al *= 0.55 + 0.45 * Math.sin(t * 1.4 + p.ph);
        if (al <= 0.015) continue;
        const rad = Math.max(0.3, p.r * k * invRel);
        /* Halo as a second, wider translucent pass rather than shadowBlur.
           On paper it is a soft cast rather than a bloom, so it is thinner. */
        if (canGlow && p.glow) addFill(p.ci, al * 0.08 * p.glow, px[i], py[i], rad * 3.6);
        addFill(p.ci, al, px[i], py[i], rad);
      }

      flush(ctx);
      ctx.globalCompositeOperation = 'source-over';
    }

    const job = { active: false, frame: frame };
    register(job);
    gate(canvas, job);

    /* pointer → camera orbit (never a 1:1 grab; it should feel like weight) */
    if (!PROFILE.coarse) {
      window.addEventListener('mousemove', function (e) {
        tmx = (e.clientX / window.innerWidth - .5) * 2;
        tmy = (e.clientY / window.innerHeight - .5) * 2;
      }, { passive: true });
    } else if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', function (e) {
        if (e.gamma == null) return;
        tmx = clamp(e.gamma / 30, -1, 1);
        tmy = clamp((e.beta - 45) / 40, -1, 1);
      }, { passive: true });
    }

    /* scroll → the camera pulls back as the hero leaves */
    window.addEventListener('scroll', function () {
      scrollK = clamp(window.scrollY / Math.max(window.innerHeight, 1), 0, 1.2);
    }, { passive: true });

    onResize(layout);
  }

  /* ══════════════════════════════════════════════════════════════════════
     CONTACT — a quiet field of embers under the closing section
     ══════════════════════════════════════════════════════════════════════ */
  function contactScene() {
    const el = document.getElementById('contact-canvas');
    if (!el || !el.getContext) return;
    const s = setup(el, 1.5);
    const ctx = s.ctx;
    const I_SAFF = cid(SAFFRON), I_GRN = cid(GREEN), I_GOLD = cid(GOLD);
    let n = PROFILE.low ? 30 : 80;
    const ps = [];
    function seed() {
      n = Math.max(16, Math.round((PROFILE.low ? 30 : 80) * qScale()));
      ps.length = 0;
      for (let i = 0; i < n; i++) {
        ps.push({
          x: Math.random() * s.w, y: Math.random() * s.h,
          r: .4 + Math.random() * 1.5,
          v: 4 + Math.random() * 16,
          d: (Math.random() - .5) * 5,
          a: .1 + Math.random() * .38,
          ci: i % 11 === 0 ? I_SAFF : (i % 17 === 0 ? I_GRN : I_GOLD),
          ph: Math.random() * 6.283
        });
      }
    }
    seed();

    const frame = function (t, dt) {
      ctx.clearRect(0, 0, s.w, s.h);
      ctx.globalCompositeOperation = COMP;

      /* a large, very faint chakra outline behind the closing statement.
         Rim, inner rim and all 24 spokes share one colour and weight, so
         they are one path and one stroke — not twenty-six. */
      const R = Math.min(s.w, s.h) * .52;
      const cx = s.w * .5, cy = s.h * .56;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * .028);
      ctx.strokeStyle = rgba(GOLD, .10);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(R, 0); ctx.arc(0, 0, R, 0, TAU);
      ctx.moveTo(R * .93, 0); ctx.arc(0, 0, R * .93, 0, TAU);
      for (let i = 0; i < 24; i++) {
        const a = i / 24 * 6.283;
        const ca = Math.cos(a), sa = Math.sin(a);
        ctx.moveTo(ca * R * .17, sa * R * .17);
        ctx.lineTo(ca * R * .9, sa * R * .9);
      }
      ctx.stroke();
      ctx.restore();

      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        p.y -= p.v * dt; p.x += p.d * dt;
        if (p.y < -6) { p.y = s.h + 6; p.x = Math.random() * s.w; }
        addFill(p.ci, p.a * (.6 + .4 * Math.sin(t * 1.7 + p.ph)), p.x, p.y, p.r);
      }
      flush(ctx);
      ctx.globalCompositeOperation = 'source-over';
    };

    const job = { active: false, frame: frame };
    register(job);
    gate(el, job);
    onQuality(function () { s.fit(); seed(); });
    onResize(function () { s.fit(); seed(); }, 200);
  }

  /* ══════════════════════════════════════════════════════════════════════
     boot
     ══════════════════════════════════════════════════════════════════════ */
  function start() {
    if (PROFILE.reduced) {
      /* still paint one static frame so the composition is not empty */
      heroScene();
      const j = jobs[jobs.length - 1];
      if (j) { j.active = true; j.frame(0, 0); j.active = false; }
      return;
    }
    heroScene();
    contactScene();
  }

  /* Hold every scene until the reveal hands the page over. Running five
     canvases behind an intro nobody can see steals the frame budget from
     the one animation that is actually on screen. */
  function boot() {
    if (!document.body.classList.contains('is-booting')) { start(); return; }
    let done = false;
    const go = function () { if (!done) { done = true; start(); } };
    window.addEventListener('si:revealed', go, { once: true });
    setTimeout(go, 12000);              /* never depend on the reveal alone */
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* The theme can flip mid-visit, and the scenes are ink on a canvas rather
     than CSS, so nothing repaints them on its own. Re-tint in place, then
     push one frame through every job that is currently parked — a scene that
     is off screen, or held still by reduced-motion, would otherwise keep the
     other theme's palette on the canvas until something else woke it. */
  if (window.MutationObserver) {
    new MutationObserver(function () {
      applyTheme();
      for (let i = 0; i < jobs.length; i++) {
        if (!jobs[i].active) jobs[i].frame(performance.now() / 1000, 0);
      }
      wake();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  /* a backgrounded tab should cost nothing, and should not come back
     mid-throttle and trip the quality governor */
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { warmup = Math.max(warmup, 30); wake(); }
  });
})();
