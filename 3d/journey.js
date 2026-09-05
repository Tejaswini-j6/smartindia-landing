/* ══════════════════════════════════════════════════════════════════════════
   SmartIndia.ai — scroll video
   ──────────────────────────────────────────────────────────────────────────
   The Google Flow film is the shot. Scroll is the playhead: down advances
   the tape, up rewinds it. The Ashoka Chakra stays on top of that film,
   and three silk bands — saffron, white, green — drift through the frame.

   Existing page markup is not redesigned. This only drives the videos
   already on the page and draws on a pointer-events-none canvas.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LOW = (navigator.hardwareConcurrency || 4) <= 4 ||
              (navigator.deviceMemory || 4) <= 3 || window.innerWidth < 560;
  const VID = 'e744a868-ed98-4fa7-9510-7ccbe122bc0e';

  const SAFFRON = [255, 153, 51];
  const WHITE = [245, 245, 240];
  const GREEN = [19, 136, 8];
  const NAVY_LIT = [120, 150, 230];
  const NAVY = [27, 58, 143];

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')'; }

  function boot() {
    /* Let the Flow film show through the existing dark wash. */
    const wash = document.createElement('style');
    wash.setAttribute('data-si-journey', '1');
    wash.textContent =
      'div[style*="rgba(3,3,3,0.82)"]{background:rgba(3,3,3,0.38)!important;}';
    document.head.appendChild(wash);

    const videos = [];
    function collect() {
      videos.length = 0;
      const all = document.querySelectorAll('video');
      for (let i = 0; i < all.length; i++) {
        const v = all[i];
        const src = v.currentSrc || v.src || '';
        if (src.indexOf(VID) === -1) continue;
        v.loop = false;
        v.muted = true;
        v.playsInline = true;
        v.autoplay = false;
        try { v.pause(); } catch (e) {}
        videos.push(v);
      }
    }
    collect();
    setTimeout(collect, 400);
    setTimeout(collect, 1200);

    const cvs = document.createElement('canvas');
    cvs.id = 'si-journey';
    cvs.setAttribute('aria-hidden', 'true');
    cvs.style.cssText =
      'position:fixed;inset:0;width:100%;height:100%;z-index:22;' +
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

    let sy = 0, vel = 0, tvel = 0, prog = 0;
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

    function scrub() {
      for (let i = 0; i < videos.length; i++) {
        const v = videos[i];
        if (!v.duration || !isFinite(v.duration)) continue;
        const goal = prog * v.duration * 0.999;
        if (Math.abs(v.currentTime - goal) > 0.04) {
          try { v.currentTime = goal; } catch (e) {}
        }
      }
    }

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

      const hub = proj(rot(0, 0, 0, tilt, spin), cam);
      if (hub && !LOW) {
        const g = ctx.createRadialGradient(hub.x, hub.y, 4, hub.x, hub.y, R * 1.55);
        g.addColorStop(0, rgba(NAVY_LIT, 0.2 * alpha));
        g.addColorStop(1, rgba(NAVY, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(hub.x, hub.y, R * 1.55, 0, Math.PI * 2);
        ctx.fill();
      }

      ring(R, NAVY_LIT, 2.5, 0.95);
      ring(R * 0.92, NAVY, 1.15, 0.68);
      ring(R * 0.16, NAVY_LIT, 2.7, 1);

      ctx.beginPath();
      for (let i = 0; i < 24; i++) {
        const ang = (i / 24) * Math.PI * 2;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const a = proj(rot(ca * R * 0.18, sa * R * 0.18, 0, tilt, spin), cam);
        const b = proj(rot(ca * R * 0.90, sa * R * 0.90, 0, tilt, spin), cam);
        if (!a || !b) continue;
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      }
      ctx.strokeStyle = rgba(NAVY_LIT, 0.8 * alpha);
      ctx.lineWidth = 1.4;
      ctx.stroke();

      if (hub) {
        ctx.beginPath();
        ctx.arc(hub.x, hub.y, Math.max(3, R * 0.07), 0, Math.PI * 2);
        ctx.fillStyle = rgba(NAVY_LIT, 0.95 * alpha);
        ctx.fill();
      }
    }

    const BANDS = [
      { c: SAFFRON, y: -1.02, ph: 0.0 },
      { c: WHITE,   y:  0.00, ph: 1.15 },
      { c: GREEN,   y:  1.02, ph: 2.3 }
    ];
    const SEGS = LOW ? 22 : 34;

    function drawRibbon(cam, band, t, scroll) {
      const pts = [];
      const width = cam.R * 0.2;
      for (let i = 0; i <= SEGS; i++) {
        const u = i / SEGS;
        const x = (u - 0.5) * cam.R * 5.2;
        const wave = Math.sin(u * 4 + t * 0.85 + band.ph + scroll * 7) * cam.R * 0.34;
        const z = Math.cos(u * 3 + t * 0.5 + band.ph) * cam.R * 0.65 - scroll * cam.R * 3;
        const p = rot(x, band.y * cam.R * 0.82 + wave, z, 0.16, scroll * 1.25 + t * 0.07);
        const q = proj(p, cam);
        if (q) pts.push(q);
      }
      if (pts.length < 3) return;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y - width);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y - width);
      for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y + width);
      ctx.closePath();
      ctx.fillStyle = rgba(band.c, 0.28);
      ctx.fill();
      ctx.strokeStyle = rgba(band.c, 0.55);
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    let mx = 0, my = 0, tmx = 0, tmy = 0, spin = 0, last = 0, raf = 0;
    window.addEventListener('pointermove', function (e) {
      tmx = (e.clientX / W - 0.5) * 2;
      tmy = (e.clientY / H - 0.5) * 2;
    }, { passive: true });

    if (REDUCED) {
      const R = Math.min(W, H) * 0.16;
      drawChakra({ cx: W * 0.68, cy: H * 0.46, focal: R * 3.4, dist: R * 4.2, R: R }, 0.2, 0.14, 1, 0.7);
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
      scrub();
      spin += vel * 0.65 + dt * 0.1;

      const t = now / 1000;
      const wide = W > 860;
      const R = Math.max(64, wide ? Math.min(W * 0.17, H * 0.2) : Math.min(W * 0.3, H * 0.18));

      ctx.clearRect(0, 0, W, H);
      const cam = {
        cx: W * (wide ? 0.68 : 0.5) + mx * 18,
        cy: H * 0.47 + my * 12,
        focal: R * 3.5,
        dist: R * (4.05 - prog * 0.55),
        R: R
      };

      for (let i = 0; i < BANDS.length; i++) drawRibbon(cam, BANDS[i], t, prog);
      drawChakra(cam, spin * 0.85 + mx * 0.22, 0.2 + my * -0.18 + vel * 0.24, 1 - prog * 0.22, 0.78);

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
    document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 120); });
  } else {
    setTimeout(boot, 120);
  }
})();
