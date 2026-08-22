/* ══════════════════════════════════════════════════════════════════════════
   SmartIndia.ai — canvas draw batching
   ──────────────────────────────────────────────────────────────────────────
   Canvas 2D charges per *call*, not per pixel. Assigning fillStyle re-parses
   a colour string; every fill()/stroke() is its own submission. Drawn one
   primitive at a time the reveal costs ~1,350 of each per frame and the hero
   ~1,400 — plus that many freshly built 'rgba(…)' strings for the garbage
   collector to sweep up sixty times a second. That is the lag.

   Two changes remove nearly all of it:

     • every colour × alpha pair is a string built once and looked up, so no
       concatenation or toFixed() runs inside a frame at all;

     • primitives are collected into buckets keyed by (colour, alpha, width)
       and each bucket is emitted as ONE path with ONE draw.

   Regrouping is safe because everything here composites under 'lighter',
   which is additive and therefore order-independent: the same light lands in
   the same places whatever sequence it arrives in.

   Alpha is quantised to 1/64 and width to 1/2 px — both below what an 8-bit
   additive buffer can show.

   Usage:
     const D = window.SI_DRAW;
     const gold = D.cid([227,178,91]);      // once, at build time
     D.fill(gold, alpha, x, y, r);          // queue a disc
     D.line(gold, alpha, w, x0,y0, x1,y1);  // queue a segment
     D.flush(ctx);                          // emit and reset
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const AQ = 64;        /* alpha steps */
  const WQ = 2;         /* width steps per px */
  const WSLOTS = 32;    /* → widths up to 16px */
  const MAXC = 24;      /* colour slots */
  const TAU = 6.283185307179586;

  const CSTR = [];      /* CSTR[colourId][alphaStep] = 'rgba(…)' */
  const CID = new Map();

  function cid(c) {
    const hit = CID.get(c);
    if (hit !== undefined) return hit;
    const id = CSTR.length;
    if (id >= MAXC) return 0;                    /* never overflow the key space */
    const head = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',';
    const row = new Array(AQ + 1);
    for (let i = 0; i <= AQ; i++) row[i] = head + (i / AQ).toFixed(3) + ')';
    CSTR.push(row);
    CID.set(c, id);
    return id;
  }

  /**
   * Rewrite the strings of a colour already registered with cid(), in place.
   * The scenes hold colour *ids*, not colours, so re-tinting this way lets a
   * theme flip cost sixty-five string builds instead of tearing down and
   * rebuilding every point and line in the geometry. Pass the same array
   * object that was handed to cid(), with its three channels mutated.
   */
  function recolor(c) {
    const id = CID.get(c);
    if (id === undefined) return;                /* not registered yet — the
                                                    mutated array is enough */
    const head = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',';
    const row = CSTR[id];
    for (let i = 0; i <= AQ; i++) row[i] = head + (i / AQ).toFixed(3) + ')';
  }

  const FB = new Array(MAXC * (AQ + 1));             /* fill buckets  */
  const SB = new Array(MAXC * (AQ + 1) * WSLOTS);    /* stroke buckets */
  const FK = [], SK = [];                            /* keys touched this frame */

  function mkBuf(stride) {
    return { cap: 256, n: 0, v: new Float32Array(256 * stride) };
  }
  function grow(b, stride) {
    const v = new Float32Array(b.cap * 2 * stride);
    v.set(b.v);
    b.v = v; b.cap *= 2;
  }

  /**
   * Queue one disc.
   * @param {number} ci colour id from cid()
   * @param {number} a  alpha 0–1
   */
  function fill(ci, a, x, y, r) {
    const q = a <= 0 ? 0 : a >= 1 ? AQ : (a * AQ + .5) | 0;
    if (!q || !(r > 0)) return;
    const key = ci * (AQ + 1) + q;
    let b = FB[key];
    if (b === undefined) b = FB[key] = mkBuf(3);
    if (b.n === 0) FK.push(key);
    if (b.n === b.cap) grow(b, 3);
    const i = b.n++ * 3;
    b.v[i] = x; b.v[i + 1] = y; b.v[i + 2] = r;
  }

  /** Queue one line segment. */
  function line(ci, a, w, x0, y0, x1, y1) {
    const q = a <= 0 ? 0 : a >= 1 ? AQ : (a * AQ + .5) | 0;
    if (!q) return;
    let wq = (w * WQ + .5) | 0;
    if (wq < 1) wq = 1; else if (wq >= WSLOTS) wq = WSLOTS - 1;
    const key = (ci * (AQ + 1) + q) * WSLOTS + wq;
    let b = SB[key];
    if (b === undefined) b = SB[key] = mkBuf(4);
    if (b.n === 0) SK.push(key);
    if (b.n === b.cap) grow(b, 4);
    const i = b.n++ * 4;
    b.v[i] = x0; b.v[i + 1] = y0; b.v[i + 2] = x1; b.v[i + 3] = y1;
  }

  /** Emit everything queued since the last flush, then reset. */
  function flush(ctx) {
    for (let k = 0; k < SK.length; k++) {
      const key = SK[k], b = SB[key];
      const wq = key % WSLOTS, rest = (key - wq) / WSLOTS;
      const q = rest % (AQ + 1), ci = (rest - q) / (AQ + 1);
      ctx.strokeStyle = CSTR[ci][q];
      ctx.lineWidth = wq / WQ;
      ctx.beginPath();
      const v = b.v, n = b.n * 4;
      for (let i = 0; i < n; i += 4) {
        ctx.moveTo(v[i], v[i + 1]);
        ctx.lineTo(v[i + 2], v[i + 3]);
      }
      ctx.stroke();
      b.n = 0;
    }
    SK.length = 0;

    for (let k = 0; k < FK.length; k++) {
      const key = FK[k], b = FB[key];
      const q = key % (AQ + 1), ci = (key - q) / (AQ + 1);
      ctx.fillStyle = CSTR[ci][q];
      ctx.beginPath();
      const v = b.v, n = b.n * 3;
      for (let i = 0; i < n; i += 3) {
        const x = v[i], y = v[i + 1], r = v[i + 2];
        ctx.moveTo(x + r, y);        /* break the subpath, or the arcs chain */
        ctx.arc(x, y, r, 0, TAU);
      }
      ctx.fill();
      b.n = 0;
    }
    FK.length = 0;
  }

  window.SI_DRAW = {
    cid: cid, recolor: recolor, fill: fill, line: line, flush: flush, TAU: TAU,
    rgba: function (c, a) {
      return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' +
        (a < 0 ? 0 : a > 1 ? 1 : a).toFixed(3) + ')';
    }
  };
})();
