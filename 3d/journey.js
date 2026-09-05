/* ══════════════════════════════════════════════════════════════════════════
   SmartIndia.ai — scroll video
   ──────────────────────────────────────────────────────────────────────────
   A cinematic layer on the existing 3D page. The Ashoka Chakra stays the
   mark. Scroll plays the shot: the wheel moves through depth and three
   silk bands — saffron, white, green — float around it like a film.

   Bidirectional. Velocity writes intensity. Reduced motion holds a still.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LOW = (navigator.hardwareConcurrency || 4) <= 4 ||
              (navigator.deviceMemory || 4) <= 3 || window.innerWidth < 560;

  const SAFFRON = [255, 153, 51];
  const WHITE = [245, 245, 240];
  const GREEN = [19, 136, 8];
  const NAVY = [27, 58, 143];
  const NAVY_LIT = [120, 150, 230];

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')'; }

  function boot() {
    const cvs = document.createElement('canvas');
    cvs.id = 'si-journey';
    cvs.setAttribute('aria-hidden', 'true');
    cvs.style.cssText =
      'position:fixed;inset:0;width:100%;height:100%;z-index:24;' +
      'pointer-events:none;mix-blend-mode:screen;';
    document.body.appendChild(cvs);

    const ctx = cvs.getContext('2d', { alpha: true });
    if (!ctx) return;

    let W = 0, H = 0, dpr = 1;
    function fit() {
      dpr = LOW ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
      W = Math.max(1, window.innerWidth);
      H = Math.max(1, window.innerHeight);
      cvs.width = Math.round(W * dpr);
      cvs.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fit();
    window.addEventListener('resize', fit, { passive: true });

    let sy = 0, lastSy = 0, vel = 0, tvel = 0, prog = 0;
    function read() {
      sy = window.scrollY || 0;
      const max = Math.max(document.documentElement.scrollHeight - H, 1);
      prog = clamp(sy / max, 0, 1);
    }
    window.addEventListener('scroll', function () {
      const prev = sy;
      read();
      tvel = clamp((sy - prev) / 22, -2, 2);
    }, { passive: true });
    read();
    lastSy = sy;

    function rot(x, y, z, rx, ry) {
      const cy = Math.cos(ry), syr = Math.sin(ry);
      const x1 = x * cy + z * syr, z1 = -x * syr + z * cy;
      const cx = Math.cos(rx), sx = Math.sin(rx);
      return { x: x1, y: y * cx - z1 * sx, z: y * sx + z1 * cx };
    }
    function proj(p, cam) {
      const d = p.z + cam.dist;
      if (d < 12) return null;
      const k = cam.focal / d;
      return { x: cam.cx + p.x * k, y: cam.cy + p.y * k, k: k };
    }

    /* Ashoka Chakra — 24 spokes, navy. The same wheel. */
    function drawChakra(cam, spin, tilt, scale, alpha) {
      if (alpha < 0.04) return;
      const R = cam.R * scale;
      const n = LOW ? 40 : 72;

      function ring(rad, col, w, a) {
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const ang = (i / n) * Math.PI * 2;
          const q = proj(rot(Math.cos(ang) * rad, Math.sin(ang) * rad, 0, tilt, spin), cam);
          if (!q) continue;
          if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
        }
        ctx.strokeStyle = rgba(col, a * alpha);
        ctx.lineWidth = w;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      /* navy glow */
      const hub = proj(rot(0, 0, 0, tilt, spin), cam);
      if (hub && !LOW) {
        const g = ctx.createRadialGradient(hub.x, hub.y, 4, hub.x, hub.y, R * 1.6);
        g.addColorStop(0, rgba(NAVY_LIT, 0.22 * alpha));
        g.addColorStop(1, rgba(NAVY, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(hub.x, hub.y, R * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      ring(R, NAVY_LIT, 2.6, 0.95);
      ring(R * 0.92, NAVY, 1.2, 0.7);
      ring(R * 0.16, NAVY_LIT, 2.8, 1);

      ctx.beginPath();
      for (let i = 0; i < 24; i++) {
        const ang = (i / 24) * Math.PI * 2;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const a = proj(rot(ca * R * 0.18, sa * R * 0.18, 0, tilt, spin), cam);
        const b = proj(rot(ca * R * 0.90, sa * R * 0.90, 0, tilt, spin), cam);
        if (!a || !b) continue;
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      }
      ctx.strokeStyle = rgba(NAVY_LIT, 0.82 * alpha);
      ctx.lineWidth = 1.45;
      ctx.stroke();

      if (hub) {
        ctx.beginPath();
        ctx.arc(hub.x, hub.y, Math.max(3, R * 0.07), 0, Math.PI * 2);
        ctx.fillStyle = rgba(NAVY_LIT, 0.95 * alpha);
        ctx.fill();
      }
    }

    /* Three silk bands — saffron, white, green — floating through the shot. */
    const BANDS = [
      { c: SAFFRON, y: -1.05, ph: 0.0 },
      { c: WHITE,   y:  0.00, ph: 1.2 },
      { c: GREEN,   y:  1.05, ph: 2.4 }
    ];
    const SEGS = LOW ? 22 : 36;

    function drawRibbon(cam, band, t, scroll, speed) {
      const pts = [];
      const width = cam.R * 0.22;
      for (let i = 0; i <= SEGS; i++) {
        const u = i / SEGS;
        const x = (u - 0.5) * cam.R * 5.4;
        const wave = Math.sin(u * 4.2 + t * 0.9 + band.ph + scroll * 8) * cam.R * 0.38;
        const z = Math.cos(u * 3.1 + t * 0.55 + band.ph) * cam.R * 0.7 - scroll * cam.R * 3.2;
        const y = band.y * cam.R * 0.85 + wave;
        const p = rot(x, y, z, 0.18 + speed * 0.08, scroll * 1.4 + t * 0.08);
        const q = proj(p, cam);
        if (q) pts.push(q);
      }
      if (pts.length < 3) return;

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y - width);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y - width * (0.7 + pts[i].k * 0.15));
      for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y + width * (0.7 + pts[i].k * 0.15));
      ctx.closePath();
      ctx.fillStyle = rgba(band.c, 0.42);
      ctx.fill();
      ctx.strokeStyle = rgba(band.c, 0.7);
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }

    const motes = [];
    (function seed() {
      const n = LOW ? 40 : 90;
      for (let i = 0; i < n; i++) {
        motes.push({
          x: (Math.random() - 0.5) * 8,
          y: (Math.random() - 0.5) * 5,
          z: (Math.random() - 0.5) * 8,
          r: 0.8 + Math.random() * 2.2,
          c: i % 3 === 0 ? SAFFRON : (i % 3 === 1 ? WHITE : GREEN),
          ph: Math.random() * 6.28
        });
      }
    })();

    function drawMotes(cam, t, scroll, burst) {
      ctx.beginPath();
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        const z = ((m.z + 4 - scroll * 10) % 8) - 4;
        const p = rot(
          m.x * cam.R * 0.7,
          m.y * cam.R * 0.55 + Math.sin(t * 0.6 + m.ph) * cam.R * 0.12,
          z * cam.R,
          0.1, scroll * 0.6
        );
        const q = proj(p, cam);
        if (!q) continue;
        ctx.moveTo(q.x, q.y);
        ctx.arc(q.x, q.y, m.r * (1 + burst * 0.6), 0, Math.PI * 2);
      }
      ctx.fillStyle = rgba(WHITE, 0.22 + burst * 0.12);
      ctx.fill();
    }

    function grain() {
      if (LOW) return;
      ctx.save();
      ctx.globalAlpha = 0.045;
      for (let i = 0; i < 28; i++) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(Math.random() * W, Math.random() * H, 1.2, 1.2);
      }
      ctx.restore();
    }

    let mx = 0, my = 0, tmx = 0, tmy = 0, spin = 0, raf = 0, last = 0;

    window.addEventListener('pointermove', function (e) {
      tmx = (e.clientX / W - 0.5) * 2;
      tmy = (e.clientY / H - 0.5) * 2;
    }, { passive: true });

    if (REDUCED) {
      fit();
      const R = Math.min(W, H) * 0.18;
      const cam = { cx: W * 0.7, cy: H * 0.45, focal: R * 3.4, dist: R * 4.2, R: R };
      drawChakra(cam, 0.2, 0.15, 1, 0.8);
      return;
    }

    function loop(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      vel = lerp(vel, tvel, 0.14);
      tvel *= 0.9;
      mx = lerp(mx, tmx, 0.05);
      my = lerp(my, tmy, 0.05);
      read();
      spin += vel * 0.7 + dt * 0.12;

      const t = now / 1000;
      const speed = Math.abs(vel);
      const wide = W > 860;
      const R = Math.max(70, wide ? Math.min(W * 0.2, H * 0.24) : Math.min(W * 0.34, H * 0.2));

      ctx.clearRect(0, 0, W, H);

      const cam = {
        cx: W * (wide ? 0.62 : 0.5) + mx * 22,
        cy: H * 0.46 + my * 14 - prog * H * 0.08,
        focal: R * 3.5,
        dist: R * (4.0 - prog * 0.7 + vel * 0.15),
        R: R
      };

      drawMotes(cam, t, prog, speed);
      for (let i = 0; i < BANDS.length; i++) drawRibbon(cam, BANDS[i], t, prog, speed);

      const scale = 1.05 - prog * 0.28;
      const tilt = 0.22 + my * -0.2 + vel * 0.28;
      drawChakra(cam, spin * 0.9 + mx * 0.25, tilt, scale, 0.92);

      grain();
      raf = requestAnimationFrame(loop);
    }

    last = performance.now();
    raf = requestAnimationFrame(loop);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && !raf) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 80); });
  } else {
    setTimeout(boot, 80);
  }
})();
