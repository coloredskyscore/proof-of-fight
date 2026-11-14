/* Doge Moon Crash: the rules, with no drawing. The same file runs in the browser (window.POF_DM_CORE), in node
   (tools/dm-sim.js) and on the leaderboard server, which flies every submitted run again from its recorded
   input and only accepts the time if it comes out the same.
   For that to hold on every machine this file uses only + - * / and Math.sqrt/floor/abs/min/max:
   no sin, cos or pow, whose last digits can differ between browsers. Every moving hazard is a formula of the
   tick, so nothing about it has to be stored or replayed. */
(function (root) {
  'use strict';
  var TPS = 60, DT = 1 / TPS, FW = 480, LEN = 9000, NL = 5, TOTAL = LEN * NL, MAX_TICKS = TPS * 300;
  var HR = 20, BR = 13, BODY = 30;     // helmet radius, body radius, how far the body sits under the helmet
  var G = 1100, THRUST = 2500, FALL_MAX = -520, COMBO = 180;
  var LAYERS = [
    { id: 'launchpad', name: 'LAUNCHPAD', km: [0, 12], rise: 300 },
    { id: 'clouds', name: 'CLOUDS', km: [12, 50], rise: 320 },
    { id: 'stratosphere', name: 'STRATOSPHERE', km: [50, 100], rise: 340 },
    { id: 'space', name: 'SPACE', km: [100, 300000], rise: 360 },
    { id: 'moon', name: 'MOON', km: [300000, 384400], rise: 380 }
  ];
  var MULTS = [[0, 1, ''], [5, 2, 'wow'], [12, 3, 'much'], [25, 5, 'such']];
  // Medal times (ms): gold, silver, bronze. Set from tools/dm-sim.js.
  var PAR = [108000, 120000, 140000];

  function hash(s) { var h = 2166136261, i; for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) {   // mulberry32: whole numbers only
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // A smooth there-and-back wave: u counts cycles, the result goes 0 -> 1 -> 0.
  function pp(u) { var f = u - Math.floor(u), p = f < 0.5 ? f * 2 : 2 - f * 2; return p * p * (3 - 2 * p); }
  function layerAt(a) { return Math.min(NL - 1, Math.max(0, Math.floor(a / LEN))); }
  function km(a) { a = Math.max(0, Math.min(TOTAL, a)); var L = layerAt(a), f = Math.min(1, (a - L * LEN) / LEN), k = LAYERS[L].km; return k[0] + (k[1] - k[0]) * (L === 3 ? f * f : f); }
  function multIdx(streak) { var i, m = 0; for (i = 0; i < MULTS.length; i++) if (streak >= MULTS[i][0]) m = i; return m; }

  // ---------- The map: built from a seed, the same for everyone with that seed ----------
  function build(seedKey) {
    var r = rng(hash(seedKey)), objs = [], L, i;
    function coinsIn(x0, a0, n, amp, waves) { for (var k = 0; k < n; k++) objs.push({ t: 'coin', x: Math.max(24, Math.min(FW - 24, x0 + (pp(k / (n - 1) * waves) * 2 - 1) * amp)), a: a0 + k * 42, r: 13 }); }
    for (L = 0; L < NL; L++) {
      var a0 = L * LEN, end = a0 + LEN - (L === NL - 1 ? 700 : 150), a = a0 + (L === 0 ? 700 : 250);
      var specials = L === 0 ? [[0.6, 'tweet']] : [[0.22, 'tweet'], [0.5, 'wow'], [0.7, 'tweet']];
      if (L >= 2) specials.push([0.86, 'bone']);
      var slideChance = [0, 0.2, 0.4, 0.5, 0.6][L];
      while (a < end) {
        var sp = null; for (i = 0; i < specials.length; i++) if (!specials[i][2] && a >= a0 + specials[i][0] * LEN) { sp = specials[i]; break; }
        if (sp) {
          sp[2] = 1;
          objs.push({ t: sp[1], x: 70 + r() * (FW - 140), a: a, r: sp[1] === 'tweet' ? 34 : 24, kind: L === 0 || r() < 0.55 ? 'boost' : 'dump', post: Math.floor(r() * 4), ph: r() });
          a += 260; continue;
        }
        var roll = r(), kind;
        if (L === 0) kind = roll < 0.45 ? 'row' : roll < 0.75 ? 'coins' : 'bird';
        else if (L === 1) kind = roll < 0.35 ? 'row' : roll < 0.5 ? 'bird' : roll < 0.65 ? 'balloon' : roll < 0.8 ? 'ghost' : 'coins';
        else if (L === 2) kind = roll < 0.35 ? 'row' : roll < 0.55 ? 'jet' : roll < 0.7 ? 'ghost' : roll < 0.8 ? 'bird' : 'coins';
        else if (L === 3) kind = roll < 0.3 ? 'row' : roll < 0.5 ? 'sat' : roll < 0.7 ? 'rock' : roll < 0.8 ? 'ghost' : 'coins';
        else kind = roll < 0.3 ? 'row' : roll < 0.6 ? 'meteor' : roll < 0.75 ? 'rock' : roll < 0.85 ? 'sat' : 'coins';
        if (kind === 'row') {
          // a row of red candles with one gap; some rows slide from side to side
          var gw = 160 - 12 * L - r() * 20, gx = 16 + r() * (FW - 32 - gw), bars = [], x;
          for (x = -80; x < FW + 80; x += 40) { var bh = 40 + r() * 60, bo = (r() - 0.5) * 24; if (x + 36 > gx && x < gx + gw) continue; bars.push({ x: x, h: bh, o: bo }); }
          var row = { t: 'row', a: a, bars: bars, range: r() < slideChance ? 50 : 0, sp: 1 / (190 + r() * 120), ph: r(), gx: gx + gw / 2 };
          objs.push(row);
          for (i = -1; i <= 1; i++) objs.push({ t: 'coin', x: gx + gw / 2, a: a + i * 44, r: 13, ride: row });
          a += 300 - 20 * L + r() * 100;
        } else if (kind === 'bird') {
          var n = 1 + Math.floor(r() * (1 + L * 0.5));
          for (i = 0; i < n; i++) objs.push({ t: 'bird', a: a + i * 80, r: 18, sp: 1 / (300 + r() * 200), ph: r() });
          a += 220 + n * 50;
        } else if (kind === 'ghost') {
          objs.push({ t: 'ghost', x: FW / 2, a: a, r: 24, amp: 120 + r() * 70, sp: 1 / (260 + r() * 120), ph: r() });
          a += 260 + r() * 100;
        } else if (kind === 'balloon') {
          objs.push({ t: 'balloon', x: 90 + r() * (FW - 180), a: a, r: 32, sp: 1 / (300 + r() * 150), ph: r() });
          a += 280 + r() * 80;
        } else if (kind === 'jet') {
          objs.push({ t: 'jet', a: a, dir: r() < 0.5 ? 1 : -1, P: 150 + Math.floor(r() * 60), ph: Math.floor(r() * 200), dur: 44 });
          a += 240 + r() * 80;
        } else if (kind === 'sat') {
          objs.push({ t: 'sat', a: a, sp: 1 / (420 + r() * 200), ph: r() });
          a += 260 + r() * 80;
        } else if (kind === 'rock') {
          objs.push({ t: 'rock', a: a, x0: r() * FW, x1: r() * FW, r: 22, P: 210 + Math.floor(r() * 60), ph: Math.floor(r() * 200) });
          a += 260 + r() * 80;
        } else if (kind === 'meteor') {
          var cols = 2 + Math.floor(r() * 2), base = r() * FW;
          for (i = 0; i < cols; i++) objs.push({ t: 'meteor', x: 30 + (base + i * (FW / cols) + r() * 60) % (FW - 60), a: a, P: 170 + Math.floor(r() * 50), ph: Math.floor(r() * 200) });
          a += 300 + r() * 80;
        } else {
          var cn = 6 + Math.floor(r() * 4);
          coinsIn(90 + r() * (FW - 180), a, cn, 40 + r() * 90, 1 + Math.floor(r() * 2));
          a += cn * 42 + 160;
        }
      }
    }
    objs.sort(function (p, q) { return p.a - q.a; });
    for (i = 0; i < objs.length; i++) { objs[i].i = i; objs[i].taken = false; if (objs[i].t === 'coin') { objs[i].x0 = objs[i].x; objs[i].a0 = objs[i].a; } }
    return objs;
  }

  // Where a moving thing is on this tick. Fills o.px / o.pa, o.on (can it hurt), o.warn (0..1 before it arrives).
  function place(o, tick) {
    var c, u;
    o.on = true; o.warn = 0; o.pa = o.a;
    switch (o.t) {
      case 'row': o.off = o.range ? (pp(tick * o.sp + o.ph) * 2 - 1) * o.range : 0; break;
      case 'coin': o.px = o.x + (o.ride ? o.ride.off || 0 : 0); break;
      case 'bird': u = tick * o.sp + o.ph; o.px = -30 + pp(u) * (FW + 60); o.dir = (u - Math.floor(u)) < 0.5 ? 1 : -1; break;
      case 'ghost': o.px = o.x + (pp(tick * o.sp + o.ph) * 2 - 1) * o.amp; break;
      case 'balloon': o.px = o.x + (pp(tick * o.sp + o.ph) * 2 - 1) * 46; o.pa = o.a + (pp(tick * o.sp * 1.7 + o.ph) * 2 - 1) * 26; break;
      case 'sat': o.px = 70 + pp(tick * o.sp + o.ph) * (FW - 140); break;
      case 'jet':
        c = (tick + o.ph) % o.P;
        if (c < 54) { o.on = false; o.warn = (c + 1) / 54; o.px = o.dir > 0 ? -140 : FW + 140; }
        else if (c < 54 + o.dur) { u = (c - 54) / o.dur; o.px = o.dir > 0 ? -90 + u * (FW + 180) : FW + 90 - u * (FW + 180); }
        else { o.on = false; o.px = o.dir > 0 ? FW + 200 : -200; }
        break;
      case 'rock': u = ((tick + o.ph) % o.P) / o.P; o.px = o.x0 + (o.x1 - o.x0) * u; o.pa = o.a + 380 - 760 * u; break;
      case 'meteor':
        c = (tick + o.ph) % o.P; o.px = o.x;
        if (c < 48) { o.on = false; o.warn = (c + 1) / 48; o.pa = o.a + 560; }
        else { u = (c - 48) / (o.P - 48); o.pa = o.a + 560 - u * 980; }
        break;
      default: o.px = o.x + (pp(tick / 150 + (o.ph || 0)) * 2 - 1) * 16;
    }
  }

  // ---------- A run ----------
  function seedKey(mode, seed) { return (mode === 'daily' ? 'dm-' : 'dmf-') + seed; }
  function newRun(mode, seed) {
    return { mode: mode, seed: String(seed), objs: build(seedKey(mode, seed)), lo: 0, tick: 0, x: FW / 2, a: 60, vy: 0, top: 60, floor: -400,
      coins: 0, streak: 0, combo: 0, bestStreak: 0, hp: 3, hits: 0, oofs: 0, inv: 0, slow: 0, boost: 0, shield: 0, dump: 0, dumpWarn: 0, oof: 0,
      done: false, ms: 0, ev: [], inp: [], sim: false, simTaken: null };
  }
  function circ(S, px, pa, r) {
    var dx = px - S.x, dy = pa - S.a, d = HR + r - 5;
    if (dx * dx + dy * dy < d * d) return true;
    dy = pa - (S.a - BODY); d = BR + r - 4;
    return dx * dx + dy * dy < d * d;
  }
  function rectHit1(cx, ca, r, x0, a0, w, h) {   // circle against a box whose low corner is x0, a0
    var nx = Math.max(x0, Math.min(cx, x0 + w)), na = Math.max(a0, Math.min(ca, a0 + h)), dx = cx - nx, da = ca - na;
    return dx * dx + da * da < r * r;
  }
  function rect(S, x0, a0, w, h) { return rectHit1(S.x, S.a, HR - 5, x0, a0, w, h) || rectHit1(S.x, S.a - BODY, BR - 4, x0, a0, w, h); }
  function hurt(S) {
    if (S.inv > 0 || S.boost > 0) return;
    if (S.shield > 0) { S.shield = 0; S.inv = 60; S.ev.push('shieldbreak'); return; }
    S.hp--; S.hits++; S.inv = 84; S.slow = 66; S.streak = 0; S.vy = Math.min(S.vy, -120);
    if (S.hp <= 0) { S.oof = 108; S.oofs++; S.ev.push('oof'); } else S.ev.push('hit');
  }
  function taken(S, o) { return S.sim ? !!S.simTaken[o.i] || o.taken : o.taken; }
  function take(S, o) { if (S.sim) S.simTaken[o.i] = 1; else o.taken = true; }

  // One tick. hold: is the jetpack firing. tx: where the player is steering to (0..FW).
  function step(S, hold, tx) {
    var i, o, L, objs = S.objs;
    if (S.done) return;
    S.tick++;
    if (S.tick >= MAX_TICKS && !S.sim) { S.done = true; S.ms = 0; S.ev.push('timeout'); return; }
    if (S.oof > 0) {
      if (--S.oof === 0) {   // back to the start of this layer, clock still running
        L = layerAt(S.a); S.a = L * LEN + 60; S.top = S.a; S.vy = 0; S.hp = 3; S.inv = 120; S.dump = S.dumpWarn = S.slow = 0; S.streak = 0; S.floor = S.a - 460; S.x = FW / 2; S.lo = 0;
        if (!S.sim) for (i = 0; i < objs.length; i++) { o = objs[i]; if (o.a0 !== undefined ? o.a0 >= L * LEN - 60 : o.a >= L * LEN - 60) { o.taken = false; if (o.t === 'coin') { o.x = o.x0; o.a = o.a0; } } }
        S.ev.push('back');
      }
      return;
    }
    if (S.inv > 0) S.inv--; if (S.slow > 0) S.slow--; if (S.boost > 0) S.boost--; if (S.shield > 0) S.shield--;
    if (S.dumpWarn > 0 && --S.dumpWarn === 0) { S.dump = 240; S.ev.push('dumpstart'); }
    if (S.dump > 0) S.dump--;
    // a coin streak only lasts while the coins keep coming: 3 seconds without one and it is gone
    if (S.streak > 0 && S.boost === 0 && --S.combo <= 0) { if (S.streak >= 5) S.ev.push('combolost'); S.streak = 0; }
    L = layerAt(S.a);
    // climb: thrust against gravity up to a top speed. Coin streaks raise it, hits and bad posts lower it.
    var top = LAYERS[L].rise * (1 + 0.08 * multIdx(S.streak));
    if (S.slow > 0) top *= 0.55;
    if (S.dump > 0) top *= 0.4;
    if (S.boost > 0) S.vy += (top * 1.9 - S.vy) * 0.1;
    else { S.vy -= (S.dump > 0 ? G * 1.8 : G) * DT; if (hold) S.vy += THRUST * DT; S.vy = Math.max(FALL_MAX, Math.min(top, S.vy)); }
    S.a += S.vy * DT;
    if (S.a < 60) { S.a = 60; S.vy = Math.max(0, S.vy); }
    // steer toward the target, at most 9 px a tick
    S.x += Math.max(-9, Math.min(9, (tx - S.x) * 0.2));
    S.x = Math.max(HR, Math.min(FW - HR, S.x));
    if (S.a > S.top) S.top = S.a;
    // the dump: a wall of red candles that rises behind you
    if (S.a > 500 || S.floor > -400) S.floor = Math.max(S.floor + LAYERS[L].rise * 0.62 * DT, S.top - 440);
    if (S.a - BODY - BR < S.floor) { S.a = S.floor + BODY + BR; S.vy = 430; hurt(S); if (S.oof > 0) return; }
    while (S.lo < objs.length && objs[S.lo].a < S.a - 700) S.lo++;
    for (i = S.lo; i < objs.length; i++) {
      o = objs[i];
      if (o.a > S.a + 700) break;
      if (o.t === 'coin' && o.ride) continue;   // placed right after their row, below
      hit(S, o);
      if (S.oof > 0) return;
    }
    if (S.a >= TOTAL) { S.a = TOTAL; S.done = true; S.ms = Math.round(S.tick * 1000 / TPS); S.ev.push('finish'); }
  }
  function hit(S, o) {
    var k, b, m;
    if (taken(S, o)) return;
    place(o, S.tick);
    switch (o.t) {
      case 'row':
        if (Math.abs(o.a - S.a) < 150) for (k = 0; k < o.bars.length; k++) {
          b = o.bars[k];
          if (rect(S, b.x + o.off, o.a + b.o - b.h / 2, 36, b.h) || rect(S, b.x + o.off + 16, o.a + b.o - b.h / 2 - 14, 4, b.h + 28)) { hurt(S); break; }
        }
        for (k = 1; k <= 3; k++) { b = S.objs[o.i + k]; if (b && b.ride === o) hit(S, b); }   // its coins ride along
        // rows sort before their coins only when the coin is level or above, so sweep back too
        for (k = 1; k <= 3; k++) { b = S.objs[o.i - k]; if (b && b.ride === o) hit(S, b); }
        return;
      case 'coin':
        if (S.shield > 0 && !S.sim && !o.ride) { var dx = S.x - o.x, da = S.a - o.a; if (dx * dx + da * da < 170 * 170) { o.x += dx * 0.12; o.a += da * 0.12; o.px = o.x; o.pa = o.a; } }
        if (circ(S, o.px, o.pa, o.r + 9)) {
          take(S, o); S.coins++; S.streak++; S.combo = COMBO; if (S.streak > S.bestStreak) S.bestStreak = S.streak;
          m = multIdx(S.streak); S.ev.push(MULTS[m][0] === S.streak && m > 0 ? 'mult' : 'coin');
        }
        return;
      case 'bird': case 'ghost': case 'balloon': case 'rock':
        if (circ(S, o.px, o.pa, o.r)) hurt(S); return;
      case 'sat': if (rect(S, o.px - 56, o.a - 12, 112, 24)) hurt(S); return;
      case 'jet': if (o.on && rect(S, o.px - 46, o.a - 11, 92, 22)) hurt(S); return;
      case 'meteor': if (o.on && rect(S, o.px - 13, o.pa - 34, 26, 68)) hurt(S); return;
      case 'tweet':
        if (circ(S, o.px, o.pa, o.r)) { take(S, o); if (o.kind === 'boost') { S.boost = 180; S.ev.push('boost:' + o.post); } else { S.dumpWarn = 60; S.ev.push('dump:' + o.post); } }
        return;
      case 'wow': if (circ(S, o.px, o.pa, o.r)) { take(S, o); S.shield = 420; S.inv = Math.max(S.inv, 30); S.ev.push('wow'); } return;
      case 'bone': if (circ(S, o.px, o.pa, o.r)) { take(S, o); if (S.hp < 3) S.hp++; S.ev.push('bone'); } return;
    }
  }

  // ---------- Recording: one sample of input every 2 ticks, run-length packed ----------
  var A64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  function sample(hold, tx) { return Math.max(0, Math.min(FW, Math.round(tx))) * 2 + (hold ? 1 : 0); }
  // The game calls this instead of step(): it samples on even ticks and holds the sample for two.
  function play(S, hold, tx) {
    if (S.done) return;
    if (S.tick % 2 === 0) S.inp.push(sample(hold, tx));
    var v = S.inp[S.inp.length - 1];
    step(S, (v & 1) === 1, v >> 1);
  }
  function encode(S) {
    var out = '', i = 0, n, v;
    while (i < S.inp.length) { v = S.inp[i]; n = 1; while (n < 64 && S.inp[i + n] === v) n++; out += A64[v >> 6] + A64[v & 63] + A64[n - 1]; i += n; }
    return ['dm1', S.mode === 'daily' ? 'd' : 'f', S.seed, S.tick, S.coins, out].join('.');
  }
  function decode(code) {
    if (typeof code !== 'string') return null;
    var p = code.split('.'), body, inp = [], i, a, b, n, v;
    if (p.length !== 6 || p[0] !== 'dm1' || (p[1] !== 'd' && p[1] !== 'f')) return null;
    if (p[1] === 'd' ? !/^\d{4}-\d{2}-\d{2}$/.test(p[2]) : !/^[a-z0-9]{1,12}$/.test(p[2])) return null;
    if (!/^\d{1,6}$/.test(p[3]) || !/^\d{1,5}$/.test(p[4])) return null;
    body = p[5]; if (body.length % 3 || body.length > 60000) return null;
    for (i = 0; i < body.length; i += 3) {
      a = A64.indexOf(body[i]); b = A64.indexOf(body[i + 1]); n = A64.indexOf(body[i + 2]);
      if (a < 0 || b < 0 || n < 0) return null;
      v = a * 64 + b; if ((v >> 1) > FW) return null;
      for (n++; n > 0; n--) inp.push(v);
      if (inp.length > MAX_TICKS) return null;
    }
    return { mode: p[1] === 'd' ? 'daily' : 'free', seed: p[2], ticks: +p[3], coins: +p[4], inp: inp };
  }
  function replay(R) {
    var S = newRun(R.mode, R.seed), v;
    while (!S.done && S.tick < R.ticks) { v = R.inp[S.tick >> 1]; if (v === undefined) break; step(S, (v & 1) === 1, v >> 1); S.ev.length = 0; }
    return S;
  }

  // ---------- A bot, for balance checks and demos: tries a few moves ahead and picks the best ----------
  function bot(S, skill) {
    var best = -1e9, pick = { hold: true, tx: S.x }, c, h, k, T, sc, xs = [S.x, 40, 90, 140, 190, 240, 290, 340, 390, 440], look = skill >= 1 ? 54 : 30;
    for (c = 0; c < xs.length; c++) for (h = 1; h >= 0; h--) {
      T = {}; for (k in S) T[k] = S[k];
      T.sim = true; T.simTaken = {}; T.ev = [];
      for (k = 0; k < look && !T.done && T.oof === 0; k++) step(T, h === 1, xs[c]);
      sc = (T.a - S.a) + (T.coins - S.coins) * (skill >= 1 ? 45 : 10) - (T.hits - S.hits) * 3000 - (T.oof > 0 ? 9000 : 0) + (T.boost > S.boost ? 500 : 0) + (T.shield > S.shield ? 300 : 0) - (T.dumpWarn > 0 || T.dump > S.dump ? 600 : 0) - Math.abs(xs[c] - S.x) * 0.05;
      if (sc > best) { best = sc; pick = { hold: h === 1, tx: xs[c] }; }
    }
    return pick;
  }

  function fmt(ms) { var m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60, t = Math.floor(ms / 10) % 100; return m + ':' + (s < 10 ? '0' : '') + s + '.' + (t < 10 ? '0' : '') + t; }
  function medal(ms) { return !ms ? 0 : ms <= PAR[0] ? 3 : ms <= PAR[1] ? 2 : ms <= PAR[2] ? 1 : 0; }
  function today() { return new Date().toISOString().slice(0, 10); }
  function dayNum(date) { return Math.floor((Date.parse(date) - Date.parse('2026-11-13')) / 864e5) + 1; }

  var C = { TPS: TPS, DT: DT, FW: FW, LEN: LEN, NL: NL, TOTAL: TOTAL, MAX_TICKS: MAX_TICKS, COMBO: COMBO, HR: HR, BR: BR, BODY: BODY, LAYERS: LAYERS, MULTS: MULTS, PAR: PAR,
    layerAt: layerAt, km: km, multIdx: multIdx, pp: pp, rng: rng, hash: hash, place: place, newRun: newRun, step: step, play: play, encode: encode, decode: decode, replay: replay,
    bot: bot, fmt: fmt, medal: medal, today: today, dayNum: dayNum };
  if (typeof module !== 'undefined' && module.exports) module.exports = C; else root.POF_DM_CORE = C;
})(typeof window !== 'undefined' ? window : this);
