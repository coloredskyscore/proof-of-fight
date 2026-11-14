/* Sui Swell: the rules, with no drawing. The same file runs in the browser (window.POF_SW_CORE), in node
   (tools/sw-sim.js) and on the leaderboard server, which surfs every submitted heat again from its recorded
   input and only accepts the score if it comes out the same.
   For that to hold on every machine this file uses only + - * / and Math.floor/abs/min/max/round:
   no sin, cos or pow, whose last digits can differ between browsers.

   A heat is three waves. Each wave has two parts:
   - the ride (side view): hold to carve up the face, let go to drop. Grab droplets, launch off the lip, keep
     your speed up or the whitewater catches you;
   - the tube (first person): the same one button keeps you inside the barrel until you shoot out of the end.
   A wave is worth up to 10,000 points, shown the way surf judges do: 10.00. */
(function (root) {
  'use strict';
  var TPS = 60, DT = 1 / TPS, FH = 300, NW = 3, MAX_WAVE = 10000;
  // the ride: h is the height on the face, 0 at the bottom and 1 at the lip, per second
  var UP = 3.4, DOWN = 3.0, VMAX = 1.25, LAUNCH = 0.8, GA = 2.4, SPIN = 1.25, PUMP = 1.9;
  var GAIN = 11, DECAY = 4.5;          // speed meter per second: carving earns it, coasting loses it
  // the tube
  var TUP = 2.6, TDOWN = 2.3, TV = 0.85, DRAIN = 3;
  var WAVES = [
    { name: 'TESTNET RIPPLE', ft: 8, vx: 300, ride: 20, vz: 300, tube: 10, bend: 0.7, r1: 0.31, open: 0.37, hurt: 0.6 },
    { name: 'DEVNET SWELL', ft: 15, vx: 335, ride: 20, vz: 335, tube: 10.5, bend: 0.85, r1: 0.28, open: 0.33, hurt: 0.8 },
    { name: 'MAINNET MONSTER', ft: 30, vx: 370, ride: 20, vz: 370, tube: 11, bend: 1, r1: 0.25, open: 0.29, hurt: 1 }
  ];
  var KINDS = [
    [['arc', 0.34], ['air', 0.2], ['buoy', 0.16], ['jelly', 0.15], ['fin', 0.1], ['whale', 0.05]],
    [['arc', 0.22], ['air', 0.2], ['buoy', 0.18], ['jelly', 0.18], ['fin', 0.12], ['whale', 0.05], ['gull', 0.05]],
    [['arc', 0.15], ['air', 0.2], ['buoy', 0.2], ['jelly', 0.2], ['fin', 0.13], ['whale', 0.05], ['gull', 0.07]]
  ];

  function hash(s) { var h = 2166136261, i; for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) {   // mulberry32: whole numbers only
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // A smooth there-and-back wave: u counts cycles, the result goes 0 -> 1 -> 0.
  function pp(u) { var f = u - Math.floor(u), p = f < 0.5 ? f * 2 : 2 - f * 2; return p * p * (3 - 2 * p); }

  // ---------- A wave, built from a seed: the same for everyone with that seed ----------
  function build(key, w) {
    var W = WAVES[w], r = rng(hash(key + ':' + w)), objs = [], L = W.vx * W.ride, sp = W.vx / 300, x = 520 * sp, end = L - 420 * sp;
    var i, k, n, last = '', nDrops = 0;
    function drop(dx, h) { objs.push({ t: 'drop', x: dx, h: h }); nDrops++; }
    function pick() { var roll = r(), list = KINDS[w], acc = 0, j; for (j = 0; j < list.length; j++) { acc += list[j][1]; if (roll < acc) return list[j][0]; } return 'arc'; }
    while (x < end) {
      var kind = pick(); if (kind === last) kind = kind === 'arc' ? 'air' : 'arc';
      last = kind;
      if (kind === 'arc') {
        n = 6 + Math.floor(r() * 4); var u0 = r();
        for (k = 0; k < n; k++) drop(x + k * 58 * sp, 0.14 + 0.72 * pp(u0 + k / 12));
        x += n * 58 * sp;
      } else if (kind === 'air') {         // a ramp of droplets up the face, then an arch above the lip
        for (k = 0; k < 3; k++) drop(x + k * 60 * sp, 0.45 + k * 0.22);
        var arch = [1.17, 1.29, 1.29, 1.17];
        for (k = 0; k < 4; k++) drop(x + (225 + k * 62) * sp, arch[k]);
        x += 520 * sp;
      } else if (kind === 'buoy') {        // two FUD buoys and one gap
        var slots = [0.16, 0.5, 0.84], gp = Math.floor(r() * 3);
        for (k = 0; k < 3; k++) if (k !== gp) objs.push({ t: 'buoy', x: x + 120 * sp, h: slots[k], r: 24 });
        for (k = 0; k < 3; k++) drop(x + (60 + k * 60) * sp, slots[gp]);
        x += 300 * sp;
      } else if (kind === 'jelly') {       // a gas-spike jellyfish bobbing in the middle of the face
        var hc = 0.3 + r() * 0.4;
        objs.push({ t: 'jelly', x: x + 150 * sp, h: hc, r: 24, amp: 0.16, sp: 1 / (100 + r() * 60), ph: r() });
        for (k = 0; k < 5; k++) drop(x + (30 + k * 60) * sp, hc > 0.5 ? 0.1 : 0.9);
        x += 330 * sp;
      } else if (kind === 'fin') {         // a rug-pull shark patrolling the bottom
        objs.push({ t: 'fin', x: x + 160 * sp, h: 0.07, r: 22, range: 110, sp: 1 / (140 + r() * 60), ph: r() });
        for (k = 0; k < 4; k++) drop(x + (70 + k * 60) * sp, 0.78);
        x += 340 * sp;
      } else if (kind === 'gull') {        // a paper-hands gull cruising just above the lip
        objs.push({ t: 'gull', x: x + 150 * sp, h: 1.2, r: 20, range: 130, sp: 1 / (150 + r() * 60), ph: r() });
        for (k = 0; k < 4; k++) drop(x + (60 + k * 60) * sp, 0.5);
        x += 320 * sp;
      } else {                             // a whale: touch its back at the bottom and it pumps you into the sky
        objs.push({ t: 'whale', x: x + 80 * sp, h: 0.05 });
        for (k = 1; k <= 6; k++) { var ta = k * 1.58 / 7; drop(x + (80 + (0.47 + ta) * 300) * sp, 1 + 1.9 * ta - 1.2 * ta * ta); }
        x += 760 * sp;
      }
      x += (150 - 30 * w + r() * 90) * sp;
    }
    objs.sort(function (p, q) { return p.x - q.x; });
    for (i = 0; i < objs.length; i++) objs[i].i = i;

    // the tube: its centre wanders, it narrows toward the end, and chunks of the lip close half of it
    var B = { w: w, objs: objs, L: L, nDrops: nDrops, dropV: 2400 / Math.max(1, nDrops), TL: W.vz * W.tube, p1: r(), p2: r(), gates: [], tdrops: [] };
    var z = 800, tops = 0;
    while (z < B.TL - 500) {
      var top = r() < 0.5; if (tops >= 2) top = false; else if (tops <= -2) top = true;
      tops = top ? Math.max(1, tops + 1) : Math.min(-1, tops - 1);
      var c = cen(B, z), rd = rad(B, z), g = { z: z, top: top };
      if (top) { g.lo = c - rd; g.hi = g.lo + W.open; } else { g.hi = c + rd; g.lo = g.hi - W.open; }
      B.gates.push(g);
      z += 520 - 60 * w + r() * 260;
    }
    var p4 = r();
    for (z = 400; z < B.TL - 200; z += 150) {
      var near = false;
      for (i = 0; i < B.gates.length; i++) if (z > B.gates[i].z - 280 && z < B.gates[i].z + 120) near = true;
      if (!near) B.tdrops.push({ z: z, h: cen(B, z) + (pp(z / 800 + p4) * 2 - 1) * rad(B, z) * 0.45 });
    }
    for (i = 0; i < B.gates.length; i++) B.tdrops.push({ z: B.gates[i].z, h: (B.gates[i].lo + B.gates[i].hi) / 2 });
    B.tdrops.sort(function (p, q) { return p.z - q.z; });
    B.tdropV = 1500 / Math.max(1, B.tdrops.length);
    return B;
  }
  function cen(B, z) { var W = WAVES[B.w], k = Math.min(1, z / 500) * W.bend; return 0.5 + k * (0.19 * (pp(z / 900 + B.p1) * 2 - 1) + 0.07 * (pp(z / 370 + B.p2) * 2 - 1)); }
  function rad(B, z) { var W = WAVES[B.w]; return 0.38 - (0.38 - W.r1) * Math.min(1, z / B.TL); }

  // Where a moving thing is on this tick: fills o.cx (px along the wave) and o.ch (height on the face).
  function place(o, tick) {
    o.cx = o.x; o.ch = o.h;
    if (o.t === 'jelly') o.ch = o.h + (pp(tick * o.sp + o.ph) * 2 - 1) * o.amp;
    else if (o.t === 'fin' || o.t === 'gull') { var u = tick * o.sp + o.ph; o.cx = o.x + (pp(u) * 2 - 1) * o.range; o.dir = (u - Math.floor(u)) < 0.5 ? 1 : -1; }
  }

  // ---------- A heat ----------
  function seedKey(mode, seed) { return (mode === 'daily' ? 'sw-' : 'swf-') + seed; }
  function newRun(mode, seed) {
    var S = { mode: mode, seed: String(seed), wave: -1, phase: 'between', tick: 0, total: 0, made: 0, results: [], ev: [], n: 0, tog: [], lastHold: false, taken: {} };
    next(S);
    return S;
  }
  // Paddle out for the next wave.
  function next(S) {
    if (S.phase !== 'between' || S.wave >= NW - 1) return;
    S.wave++; S.W = WAVES[S.wave]; S.B = build(seedKey(S.mode, S.seed), S.wave); S.taken = {};
    S.phase = 'ride'; S.wt = 0; S.x = 0; S.h = 0.5; S.vh = 0; S.air = false; S.rot = 0; S.pump = 0; S.meter = 60; S.inv = 0; S.lo = 0;
    S.z = 0; S.gap = 0; S.gi = 0; S.ti = 0; S.scrapes = 0; S.hits = 0; S.dropsN = 0; S.tdropsN = 0; S.airsN = 0; S.spinsN = 0;
    S.wp = { drops: 0, airs: 0, speed: 0, tube: 0, tdrops: 0, clean: 0 };
  }
  function endWave(S, out, where) {
    var p = S.wp;
    if (out) { p.tube = 2500; p.clean = Math.max(0, 1000 - 350 * S.scrapes); }
    var pts = Math.min(MAX_WAVE, Math.round(p.drops + p.airs + p.speed + p.tube + p.tdrops + p.clean));
    S.total += pts; if (out) S.made++;
    S.results.push({ pts: pts, out: out, where: where, drops: S.dropsN, nDrops: S.B.nDrops, tdrops: S.tdropsN, nT: S.B.tdrops.length, airs: S.airsN, spins: S.spinsN, scrapes: S.scrapes, hits: S.hits,
      parts: { drops: Math.round(p.drops), airs: Math.round(p.airs), speed: Math.round(p.speed), tube: p.tube, tdrops: Math.round(p.tdrops), clean: p.clean } });
    S.phase = S.wave >= NW - 1 ? 'done' : 'between';
    S.ev.push(out ? 'out' : 'wipe:' + where);
    if (S.phase === 'done') S.ev.push('finish');
  }
  function meter(S, d) { S.meter = Math.max(0, Math.min(100, S.meter + d)); }

  // One tick. hold: is the button down.
  function step(S, hold) {
    if (S.phase !== 'ride' && S.phase !== 'tube') return;
    S.tick++; S.wt++;
    if (S.inv > 0) S.inv--;
    if (S.phase === 'ride') ride(S, hold); else tube(S, hold);
  }
  function ride(S, hold) {
    var W = S.W, B = S.B, objs = B.objs, i, o, dx, dy, d, f, spins;
    S.x += W.vx * DT;
    if (S.air) {
      S.vh -= GA * DT; S.h += S.vh * DT;
      if (hold) S.rot += SPIN * DT;
      if (S.h <= 1 && S.vh < 0) {          // landing: clean if the spin is (nearly) a whole number of turns
        spins = Math.floor(S.rot + 0.5); f = Math.abs(S.rot - spins);
        S.h = 1; S.air = false; S.vh = -0.5;
        if (f <= 0.22) {
          S.wp.airs = Math.min(2000, S.wp.airs + 200 + 500 * spins); S.airsN++; S.spinsN += spins; meter(S, 10 + 6 * spins); S.ev.push('land:' + spins);
        } else { meter(S, -22); S.inv = 50; S.ev.push('sketchy'); }
        S.rot = 0;
      }
    } else {
      if (S.pump > 0) S.vh = PUMP;
      else { S.vh += (hold ? UP : -DOWN) * DT; S.vh = Math.max(-VMAX, Math.min(VMAX, S.vh)); }
      S.h += S.vh * DT;
      if (S.h <= 0) { S.h = 0; if (S.vh < 0) S.vh = 0; }
      if (S.h >= 1) {
        if (S.vh >= LAUNCH) { S.air = true; S.rot = 0; S.ev.push(S.pump > 0 ? 'launch:whale' : 'launch'); S.pump = 0; }
        else { S.h = 1; S.vh = 0; }
      }
      meter(S, (GAIN * Math.min(1, Math.abs(S.vh) / VMAX) - DECAY) * DT);
    }
    while (S.lo < objs.length && objs[S.lo].x < S.x - 260) S.lo++;
    for (i = S.lo; i < objs.length; i++) {
      o = objs[i];
      if (o.x > S.x + 320) break;
      if (S.taken[o.i]) continue;
      place(o, S.wt);
      dx = o.cx - S.x; dy = (o.ch - S.h) * FH;
      if (o.t === 'drop') {
        if (dx * dx + dy * dy < 34 * 34) { S.taken[o.i] = 1; S.wp.drops += B.dropV; S.dropsN++; meter(S, 1.5); S.ev.push('drop'); }
      } else if (o.t === 'whale') {
        if (!S.air && S.pump === 0 && Math.abs(dx) < 50 && S.h < 0.24) { S.taken[o.i] = 1; S.pump = 1; S.vh = PUMP; S.ev.push('whale'); }
      } else if (S.inv === 0) {
        d = o.r + 15;
        if (dx * dx + dy * dy < d * d) { meter(S, -26); S.inv = 70; S.hits++; S.vh *= 0.3; S.ev.push('hit:' + o.t); }
      }
    }
    if (S.meter <= 0) { endWave(S, false, 'ride'); return; }
    if (S.x >= B.L && !S.air) {            // the lip throws over: into the tube with whatever speed you kept
      S.wp.speed = S.meter * 6; S.phase = 'tube'; S.z = 0; S.h = 0.5; S.vh = 0; S.inv = 0; S.gap = 55 + 0.45 * S.meter; S.ev.push('tube');
    }
  }
  function tube(S, hold) {
    var W = S.W, B = S.B, c, r, g, d;
    S.z += W.vz * DT;
    S.vh += (hold ? TUP : -TDOWN) * DT; S.vh = Math.max(-TV, Math.min(TV, S.vh));
    S.h += S.vh * DT;
    c = cen(B, S.z); r = rad(B, S.z);
    if (S.h > c + r - 0.05) { S.h = c + r - 0.05; S.vh = -0.35; scrape(S, 'scrape:top'); }
    else if (S.h < c - r + 0.05) { S.h = c - r + 0.05; S.vh = 0.35; scrape(S, 'scrape:bottom'); }
    while (S.gi < B.gates.length && B.gates[S.gi].z <= S.z) {
      g = B.gates[S.gi++];
      if (S.h < g.lo + 0.02 || S.h > g.hi - 0.02) { S.gap -= 18 * W.hurt; S.inv = 40; S.scrapes++; S.ev.push('chunk'); } else S.ev.push('thread');
    }
    while (S.ti < B.tdrops.length && B.tdrops[S.ti].z <= S.z) {
      d = B.tdrops[S.ti++];
      if (Math.abs(S.h - d.h) < 0.1) { S.taken['t' + (S.ti - 1)] = 1; S.wp.tdrops += B.tdropV; S.tdropsN++; S.gap = Math.min(100, S.gap + 1.5); S.ev.push('drop'); }
    }
    S.gap -= DRAIN * DT;
    if (S.gap <= 0) { S.gap = 0; endWave(S, false, 'tube'); return; }
    if (S.z >= B.TL) endWave(S, true, '');
  }
  function scrape(S, ev) { if (S.inv > 0) return; S.gap -= 10 * S.W.hurt; S.inv = 50; S.scrapes++; S.ev.push(ev); }

  // ---------- Recording: the ticks on which the button changed, packed as base64 numbers ----------
  var A64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_', MAX_N = TPS * 150;
  // The game calls this instead of step().
  function play(S, hold) {
    if (S.phase !== 'ride' && S.phase !== 'tube') return;
    hold = !!hold;
    if (hold !== S.lastHold) { S.tog.push(S.n); S.lastHold = hold; }
    S.n++;
    step(S, hold);
  }
  function encode(S) {
    var out = '', prev = 0, i, v;
    for (i = 0; i < S.tog.length; i++) { v = S.tog[i] - prev; prev = S.tog[i]; while (v >= 32) { out += A64[32 + (v & 31)]; v = Math.floor(v / 32); } out += A64[v]; }
    return ['sw1', S.mode === 'daily' ? 'd' : 'f', S.seed, S.total, S.n, out].join('.');
  }
  function decode(code) {
    if (typeof code !== 'string') return null;
    var p = code.split('.'), tog = [], i, c, v = 0, sh = 1, at = 0;
    if (p.length !== 6 || p[0] !== 'sw1' || (p[1] !== 'd' && p[1] !== 'f')) return null;
    if (p[1] === 'd' ? !/^\d{4}-\d{2}-\d{2}$/.test(p[2]) : !/^[a-z0-9]{1,12}$/.test(p[2])) return null;
    if (!/^\d{1,5}$/.test(p[3]) || !/^\d{1,5}$/.test(p[4]) || +p[4] > MAX_N || p[5].length > 12000) return null;
    for (i = 0; i < p[5].length; i++) {
      c = A64.indexOf(p[5][i]); if (c < 0) return null;
      if (c >= 32) { v += (c - 32) * sh; sh *= 32; if (sh > 32768) return null; }
      else { v += c * sh; at += v; if (at > MAX_N) return null; tog.push(at); v = 0; sh = 1; }
    }
    if (sh !== 1) return null;
    return { mode: p[1] === 'd' ? 'daily' : 'free', seed: p[2], total: +p[3], n: +p[4], tog: tog };
  }
  function replay(R) {
    var S = newRun(R.mode, R.seed), ti = 0, hold = false, n;
    for (n = 0; n < R.n && S.phase !== 'done'; n++) {
      if (S.phase === 'between') next(S);
      while (ti < R.tog.length && R.tog[ti] <= n) { hold = !hold; ti++; }
      step(S, hold); S.ev.length = 0;
    }
    S.n = n;
    return S;
  }

  // ---------- A bot, for balance checks and demos: tries a few plans ahead and picks the best ----------
  function clone(S) {
    var T = {}, k; for (k in S) T[k] = S[k];
    T.taken = Object.create(S.taken); T.ev = []; T.results = S.results.slice(); T.wp = {}; for (k in S.wp) T.wp[k] = S.wp[k];
    return T;
  }
  function value(T) { var p = T.wp; return p.drops + p.airs + p.tdrops; }
  function bot(S, skill) {
    var look = skill >= 1 ? 54 : 26, cuts = skill >= 1 ? [0, 6, 12, 20, 30, 42] : [0, 12], best = -1e9, pick = false, a, c, k, T, sc, wave = S.wave, v0 = value(S);
    for (a = 0; a < 2; a++) for (c = 0; c < cuts.length; c++) {
      // plan: hold (a = 1) or let go (a = 0) for cuts[c] ticks, then the opposite
      T = clone(S);
      for (k = 0; k < look && T.wave === wave && (T.phase === 'ride' || T.phase === 'tube'); k++) step(T, cuts[c] === 0 ? a === 1 : (k < cuts[c]) === (a === 1));
      sc = value(T) - v0 - (T.hits - S.hits) * 900 - (T.scrapes - S.scrapes) * 1200;
      if (T.phase === 'ride' && S.phase === 'ride') sc += (T.meter - S.meter) * 12 + (T.meter < 25 ? -600 : 0);
      if (S.phase === 'tube') { sc += T.phase === 'tube' ? -Math.abs(T.h - cen(T.B, T.z)) * 300 : 0; }
      if (T.results.length > S.results.length && !T.results[T.results.length - 1].out) sc -= 8000;
      if (sc > best) { best = sc; pick = a === 1; }
    }
    return pick;
  }

  function fmt(pts) { return (pts / 1000).toFixed(2); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function dayNum(date) { return Math.floor((Date.parse(date) - Date.parse('2026-11-14')) / 864e5) + 1; }

  var C = { TPS: TPS, DT: DT, FH: FH, NW: NW, MAX_WAVE: MAX_WAVE, VMAX: VMAX, TV: TV, WAVES: WAVES, pp: pp, rng: rng, hash: hash, cen: cen, rad: rad, place: place,
    newRun: newRun, next: next, step: step, play: play, encode: encode, decode: decode, replay: replay, bot: bot, fmt: fmt, today: today, dayNum: dayNum };
  if (typeof module !== 'undefined' && module.exports) module.exports = C; else root.POF_SW_CORE = C;
})(typeof window !== 'undefined' ? window : this);
