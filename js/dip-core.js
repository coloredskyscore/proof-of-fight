/* Buy the Dip (?dip): the rules. No drawing here, so this file also runs in node (tools/dip-sim.js).
   The ground is a price chart. A ball rolls and flies along it, left to right, through time. One button:
   hold it and the ball gets heavy (dive down the red slopes to pick up speed), let go and it gets light
   (launch off the green ones). A liquidation wall chases from behind and speeds up as the years pass.
   Two charts: 'btc' is Bitcoin's real daily price from 2010 on, followed by a made-up future that never
   ends in practice; 'daily' is a made-up coin seeded by the date, the same for everybody that day. */
(function (root) {
  var DAY = 22;          // world units across per day
  var VS = 2400;         // world units up per tenfold price move (after the long trend is flattened)
  var G = 1500, G_HOLD = 4700;
  var MIN_SPEED = 380, CRUISE = 640, MAX_SPEED = 2800;
  var R = 16;            // ball radius

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gaussRand(r) { return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(6.283185307 * r()); }
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  function decode(data) {
    var parts = data.d.split(','), out = new Float64Array(parts.length), v = 0;
    for (var i = 0; i < parts.length; i++) { v += Number(parts[i]); out[i] = v / 1000; }
    return out;
  }
  function gauss(a, s) {
    var n = a.length, out = new Float64Array(n), k = [], sum = 0, i, j, r = Math.ceil(3 * s);
    for (i = -r; i <= r; i++) { var w = Math.exp(-i * i / (2 * s * s)); k.push(w); sum += w; }
    for (i = 0; i < n; i++) {
      var acc = 0;
      for (j = -r; j <= r; j++) { var q = i + j; q = q < 0 ? 0 : q >= n ? n - 1 : q; acc += a[q] * k[j + r]; }
      out[i] = acc / sum;
    }
    return out;
  }

  // A made-up run of daily log10 prices: bull, bear and sideways stretches, with the odd one-day shock.
  function synth(r, n, start, drift, vol, shock) {
    var out = new Float64Array(n), v = start, left = 0, d = 0;
    for (var i = 0; i < n; i++) {
      if (left <= 0) {
        var pick = r();
        left = 40 + Math.floor(r() * 180);
        d = pick < 0.42 ? drift + 0.0035 + r() * 0.004 : pick < 0.78 ? drift - 0.004 - r() * 0.003 : drift;
      }
      left--;
      v += d + vol * gaussRand(r);
      if (shock && r() < shock) v += (r() < 0.6 ? -1 : 1) * (0.12 + r() * 0.2);
      out[i] = v;
    }
    return out;
  }

  var EVENTS = [
    ['2010-07-18', 'BITCOIN GETS A PRICE', '9 cents'],
    ['2011-06-08', 'FIRST BUBBLE', '$30, then down 93%'],
    ['2012-11-28', 'HALVING #1', ''],
    ['2013-11-29', '$1,000', 'for the first time'],
    ['2014-02-24', 'MT. GOX COLLAPSES', ''],
    ['2015-01-14', 'CAPITULATION', 'down 85% from the top'],
    ['2016-07-09', 'HALVING #2', ''],
    ['2017-12-17', '$19,000', 'the 2017 top'],
    ['2018-12-15', 'CRYPTO WINTER', 'down 84%'],
    ['2020-03-12', 'COVID CRASH', 'down 40% in a day'],
    ['2020-05-11', 'HALVING #3', ''],
    ['2021-04-14', '$64,000', ''],
    ['2021-07-20', 'CHINA BANS MINING', ''],
    ['2021-11-10', '$69,000', 'the 2021 top'],
    ['2022-05-09', 'LUNA COLLAPSES', ''],
    ['2022-11-08', 'FTX COLLAPSES', ''],
    ['2024-01-10', 'SPOT ETFS APPROVED', ''],
    ['2024-04-20', 'HALVING #4', ''],
    ['2024-12-05', '$100,000', ''],
    ['2025-10-06', '$124,000', 'the all-time high']
  ];
  var TICK_A = ['GIGA', 'TURBO', 'BABY', 'SAFE', 'MEGA', 'HYPER', 'ULTRA', 'SUPER', 'MICRO', 'DARK'];
  var TICK_B = ['MOON', 'FROG', 'CAT', 'ROCKET', 'CANDLE', 'WAGMI', 'HODL', 'DIP', 'YACHT', 'LAMBO'];

  function squash(v) { var A = 0.22; return A * Math.tanh(v / A); }
  function dayNum(iso) { return Math.round(Date.parse(iso + 'T00:00:00Z') / 86400000); }
  function isoOf(n) { return new Date(n * 86400000).toISOString().slice(0, 10); }

  /* The chart as ground. opts.mode 'btc' needs opts.data (js/dip-data.js); 'daily' needs opts.seed (a string). */
  function makeTerrain(opts) {
    var logs, real, day0, events = [], name, i;
    if (opts.mode === 'daily') {
      var r = rng(hashStr('dip-' + opts.seed));
      name = '$' + TICK_A[Math.floor(r() * TICK_A.length)] + TICK_B[Math.floor(r() * TICK_B.length)];
      logs = synth(r, 6000, -3.5 + r() * 2.5, 0.0004, 0.022, 0.012);
      real = 0; day0 = 0;
    } else {
      var base = decode(opts.data);
      real = base.length; day0 = dayNum(opts.data.start);
      var drift = (base[real - 1] - base[real - 900]) / 900;
      var fut = synth(rng(20260523), 4000, base[real - 1], Math.max(0.0001, drift * 0.5), 0.012, 0);
      logs = new Float64Array(real + fut.length);
      logs.set(base); logs.set(fut, real);
      name = 'BTC';
      EVENTS.forEach(function (e) { events.push({ day: dayNum(e[0]) - day0, title: e[1], sub: e[2] }); });
      events.push({ day: real, title: 'UNCHARTED', sub: 'nobody knows what comes next' });
    }
    var n = logs.length;
    var fine = gauss(logs, 5), trend = gauss(logs, 45), slow = gauss(logs, 180);
    // Flatten the long climb so the ground rolls instead of being one endless uphill: a straight line through
    // the slow trend comes out, the cycles (the bubbles and the winters) stay in faintly, and the weeks stay
    // in whole (squeezed a little at the extremes so a crash is a cliff you can still ride).
    var fitN = real || n, sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (i = 0; i < fitN; i++) { sx += i; sy += slow[i]; sxx += i * i; sxy += i * slow[i]; }
    var b = (fitN * sxy - sx * sy) / (fitN * sxx - sx * sx), a = (sy - b * sx) / fitN;
    var h = new Float64Array(n), raw = new Float64Array(n);
    for (i = 0; i < n; i++) {
      var cyc = 0.1 * (slow[i] - (a + b * i));
      h[i] = VS * (squash(fine[i] - trend[i]) + cyc);
      raw[i] = VS * (squash(logs[i] - trend[i]) + cyc);
    }
    var base0 = h[0];
    for (i = 0; i < n; i++) { h[i] -= base0; raw[i] -= base0; }

    function P(k) { return h[k < 0 ? 0 : k >= n ? n - 1 : k]; }
    function height(x) {
      var u = x / DAY, k = Math.floor(u), t = u - k, p0 = P(k - 1), p1 = P(k), p2 = P(k + 1), p3 = P(k + 2);
      return 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);
    }
    function slope(x) {
      var u = x / DAY, k = Math.floor(u), t = u - k, p0 = P(k - 1), p1 = P(k), p2 = P(k + 1), p3 = P(k + 2);
      return 0.5 * ((p2 - p0) + 2 * (2 * p0 - 5 * p1 + 4 * p2 - p3) * t + 3 * (3 * p1 - p0 - 3 * p2 + p3) * t * t) / DAY;
    }
    function curve(x) {
      var u = x / DAY, k = Math.floor(u), t = u - k, p0 = P(k - 1), p1 = P(k), p2 = P(k + 1), p3 = P(k + 2);
      return 0.5 * (2 * (2 * p0 - 5 * p1 + 4 * p2 - p3) + 6 * (3 * p1 - p0 - 3 * p2 + p3) * t) / (DAY * DAY);
    }
    function dayAt(x) { var k = Math.floor(x / DAY); return k < 0 ? 0 : k >= n ? n - 1 : k; }
    function priceAt(x) { return Math.pow(10, logs[dayAt(x)]); }
    function dateAt(x) { return opts.mode === 'daily' ? null : isoOf(day0 + dayAt(x)); }
    // Market mood, -1 (winter) to 1 (mania): how fast the 90-day trend is moving.
    function moodAt(x) {
      var k = dayAt(x), k2 = Math.min(n - 1, k + 30), k1 = Math.max(0, k - 30);
      var m = (slow[k2] - slow[k1]) / (k2 - k1 || 1) / 0.004;
      return m < -1 ? -1 : m > 1 ? 1 : m;
    }

    // Sats to pick up: an arc in the air after each real crest, a row down each real dip.
    var coins = [], lastCrest = -999;
    for (i = 12; i < n - 12; i++) {
      if (h[i] > h[i - 1] && h[i] >= h[i + 1] && i - lastCrest > 16) {
        var drop = h[i] - Math.min(h[Math.min(n - 1, i + 10)], h[Math.min(n - 1, i + 18)]);
        if (drop < 60) continue;
        lastCrest = i;
        var x0 = i * DAY, up = Math.min(260, 90 + drop * 0.35);
        for (var c = 0; c < 6; c++) {
          var f = c / 5, cx = x0 + 60 + f * 520;
          coins.push({ x: cx, y: h[i] + 40 + up * 4 * f * (1 - f) + (height(cx) - h[i]) * 0.35 * f, got: false });
        }
        for (c = 0; c < 4; c++) { var gx = x0 + 240 + c * 70; coins.push({ x: gx, y: height(gx) + 34, got: false }); }
      }
    }
    coins.sort(function (p, q) { return p.x - q.x; });

    return {
      mode: opts.mode, name: name, n: n, real: real, len: n * DAY, h: h, raw: raw, logs: logs, events: events, coins: coins,
      height: height, slope: slope, curve: curve, dayAt: dayAt, priceAt: priceAt, dateAt: dateAt, moodAt: moodAt
    };
  }

  function wallSpeed(T, x, t) {
    var prog = x / (5800 * DAY);
    var ease = Math.min(1, 0.6 + t / 30);                 // a gentle first few seconds
    return ease * (T.mode === 'daily' ? 740 + 1500 * prog : 740 + 760 * Math.min(1, prog) + Math.max(0, prog - 1) * 900);
  }

  function newRun(T) {
    var x = 8 * DAY;
    return {
      T: T, x: x, y: T.height(x), vx: 720, vy: 0, s: 720, air: false, airT: 0, t: 0,
      wall: x - 1500, hold: false, streak: 0, fever: 0, perfects: 0, coins: 0, bonus: 0, best: 0, maxAlt: 0,
      ci: 0, ei: 0, dead: false, lastEvent: null, ev: []
    };
  }
  function score(S) { return Math.max(0, Math.floor((S.x / DAY - 8) * 10)) + S.bonus; }

  /* Advance the run by dt seconds (keep dt small, 1/120). Things that happened are pushed onto S.ev. */
  function step(S, hold, dt) {
    if (S.dead) return;
    var T = S.T, g = hold ? G_HOLD : G, fever = S.fever > 0;
    S.t += dt; S.hold = hold;
    if (fever) { S.fever -= dt; if (S.fever <= 0) { S.fever = 0; S.ev.push({ type: 'feverEnd' }); } }
    var minS = fever ? MIN_SPEED + 500 : MIN_SPEED;

    if (S.air) {
      S.airT += dt;
      S.vy -= g * dt;
      if (S.vx < minS) S.vx += 500 * dt;
      S.x += S.vx * dt; S.y += S.vy * dt;
      var gh = T.height(S.x);
      if (S.y <= gh) {
        var m = T.slope(S.x), inv = 1 / Math.sqrt(1 + m * m), tx = inv, ty = m * inv;
        var along = S.vx * tx + S.vy * ty, into = -(S.vx * -ty + S.vy * tx);
        var ang = Math.atan2(Math.max(0, into), Math.max(1, along));
        S.y = gh; S.air = false; S.s = Math.max(along, minS * 0.6);
        if (S.airT > 0.32) {
          if (ang < 0.34 && m < 0.05) {
            S.streak++; S.perfects++; S.s += 190; S.bonus += 100 * Math.min(S.streak, 5);
            S.ev.push({ type: 'perfect', streak: S.streak });
            if (S.streak >= 3) { if (!S.fever) S.ev.push({ type: 'fever' }); S.fever = 6; }
          } else if (ang > 0.8) {
            S.streak = 0; S.s *= 0.8; S.ev.push({ type: 'bad', hard: into });
          } else S.ev.push({ type: 'land' });
        }
        S.airT = 0;
      }
    } else {
      var m2 = T.slope(S.x), inv2 = 1 / Math.sqrt(1 + m2 * m2), tx2 = inv2, ty2 = m2 * inv2;
      // Uphill costs less than downhill pays, so a good dive is always worth it.
      S.s += (-g * ty2 * (ty2 > 0 ? 0.55 : 1) - 0.06 * S.s) * dt;
      if (fever) S.s += 260 * dt;
      if (S.s < CRUISE) S.s += 420 * dt;
      if (S.s < minS) S.s = minS;
      if (S.s > MAX_SPEED) S.s = MAX_SPEED;
      S.x += S.s * tx2 * dt; S.y = T.height(S.x);
      S.vx = S.s * tx2; S.vy = S.s * ty2;
      // The ground drops away faster than the ball can fall: lift off. Holding keeps it glued to more crests.
      if (T.curve(S.x) * S.vx * S.vx < -g && S.vy > -200) { S.air = true; S.airT = 0; S.ev.push({ type: 'launch' }); }
    }

    var alt = S.y - T.height(S.x);
    if (alt > S.maxAlt) S.maxAlt = alt;

    if (S.ghost) return;
    // sats
    var cs = T.coins;
    while (S.ci < cs.length && cs[S.ci].x < S.x - 80) S.ci++;
    for (var i = S.ci; i < cs.length && cs[i].x < S.x + 80; i++) {
      var c = cs[i];
      if (!c.got && Math.abs(c.x - S.x) < 62 && Math.abs(c.y - S.y) < 62) {
        c.got = true; S.coins++; S.bonus += fever ? 50 : 25; S.ev.push({ type: 'coin', x: c.x, y: c.y });
      }
    }
    // landmarks
    var es = T.events;
    while (S.ei < es.length && es[S.ei].day * DAY <= S.x) { S.lastEvent = es[S.ei]; S.ev.push({ type: 'event', e: es[S.ei] }); S.ei++; }

    // the wall
    if (S.noWall) { S.wall = S.x - 4000; return; }
    var ws = wallSpeed(T, S.x, S.t), gap = S.x - S.wall;
    if (gap > 2600) ws = Math.max(ws, S.vx * 0.97);      // it never falls far out of sight
    S.wall += ws * dt;
    if (S.wall >= S.x || S.x >= T.len - 40 * DAY) { S.dead = true; S.won = S.wall < S.x; S.ev.push({ type: 'dead', won: S.won }); }
  }

  /* A decent player, for the title screen's demo ride and the balance check: tries holding and not holding
     for the next moment, plays each out for a second and a half, and keeps whichever gets further. */
  function simple(S) {
    var T = S.T;
    if (!S.air) return T.slope(S.x + 20) < -0.05;
    return S.vy < 0 && T.slope(S.x + S.vx * 0.12) < 0;
  }
  function bot(S) {
    var best = false, bestV = -1e9;
    [false, true].forEach(function (h) {
      var Q = Object.assign({}, S, { ghost: true, ev: [] }), t = 0;
      while (t < 1.5) { step(Q, t < 0.2 ? h : simple(Q), 1 / 60); t += 1 / 60; }
      var v = Q.x + Q.perfects * 400 + (Q.air ? 0 : Q.s * 0.2);
      if (v > bestV) { bestV = v; best = h; }
    });
    return best;
  }

  var api = {
    bot: bot,
    DAY: DAY, VS: VS, R: R, G: G, G_HOLD: G_HOLD, EVENTS: EVENTS,
    makeTerrain: makeTerrain, newRun: newRun, step: step, score: score, wallSpeed: wallSpeed, hashStr: hashStr, rng: rng
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.POF_DIP_CORE = api;
})(this);
