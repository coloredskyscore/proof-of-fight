/* Wen Lambo: the rules, with no drawing. The same file runs in the browser (window.POF_WL_CORE), in node
   (tools/wl-sim.js) and on the leaderboard server, which drives every submitted run again from its recorded
   steering and only accepts the time if it comes out the same.
   For that to hold on every machine this file uses only + - * / and Math.sqrt/floor/abs/min/max:
   no sin, cos or pow, whose last digits can differ between browsers. */
(function (root) {
  'use strict';
  var TPS = 60, DT = 1 / TPS;
  var SEG = 200, ROAD_W = 2200, PZ = 870;            // PZ: how far in front of the camera the car sits
  var MAX = SEG * 60, ACCEL = MAX / 5, OFF_LIMIT = MAX * 0.3, CENT = 0.3;
  var SAND = 1;
  var MAX_TICKS = TPS * 300;
  var CAR_HALF = 0.33, NEAR = 0.64, HIT_BACK = 300, HIT_FRONT = 200, BOOST_TICKS = 80;

  // top speed, acceleration, grip (1 = the reference). shove: how much speed is kept after hitting traffic.
  var CARS = [
    { id: 'nightwedge', name: 'NIGHTWEDGE', blurb: 'The poster car. Fast everywhere.', top: 0.97, acc: 0.92, grip: 0.92, shove: 0.45 },
    { id: 'bigblock', name: 'BIG BLOCK', blurb: 'Launches like a rocket. Corners like one too.', top: 0.96, acc: 1.0, grip: 0.78, shove: 0.5 },
    { id: 'niner', name: 'NINER', blurb: 'Engine in the back, glued to the road.', top: 0.93, acc: 0.95, grip: 1.0, shove: 0.45 },
    { id: 'strake', name: 'STRAKE 80', blurb: 'Highest top speed. Needs room to stop.', top: 1.0, acc: 0.86, grip: 0.84, shove: 0.45 },
    { id: 'suv', name: 'HODL SUV', blurb: 'Slower, but traffic moves out of its way.', top: 0.89, acc: 0.88, grip: 0.94, shove: 0.85 },
    { id: 'bear', name: 'BEAR MARKET', blurb: 'Down 80%. Still running.', top: 0.76, acc: 0.8, grip: 0.9, shove: 0.4 }
  ];

  // A stage is a list of road pieces: [ease in, hold, ease out, curve (+ right), hill (in segments), flag].
  var STAGES = [
    { id: 'miami', name: 'MIAMI', title: 'SUNSET CAUSEWAY', event: 'HODL CON', grip: 1, traffic: 34, weavers: 0, seed: 11,
      road: [[30, 90, 30, 0, 0], [40, 90, 40, 1.5, 0], [60, 60, 60, 0, 35], [60, 60, 60, 0, -35], [40, 70, 40, -2, 0], [30, 60, 30, 2, 15], [30, 60, 30, -2, -15],
        [50, 150, 50, 0, 0], [50, 90, 50, 2.5, 25], [50, 60, 50, 0, -25], [40, 60, 40, -1.5, 0], [25, 25, 25, 0, 45], [25, 25, 25, 0, -45], [60, 140, 60, -1.2, 0],
        [40, 80, 40, 2, 0], [40, 60, 40, -2.6, 10], [40, 60, 40, 0, -10], [60, 120, 60, 1, 0], [40, 80, 40, -2.2, 0], [30, 50, 30, 2.8, 0], [50, 150, 50, 0, 20], [50, 80, 50, -1, -20], [40, 110, 40, 0, 0]] },
    { id: 'denver', name: 'DENVER', title: 'ROAD TO DENVER', event: 'BUIDL WEEK', grip: 1, traffic: 36, weavers: 0, seed: 23,
      road: [[30, 80, 30, 0, 0], [50, 80, 50, 1.2, 40], [40, 60, 40, -2.4, 50], [40, 50, 40, 3, 40], [40, 50, 40, -3.2, 50], [50, 100, 50, 0, 70], [40, 60, 40, 2, -30],
        [30, 30, 30, 0, 60], [30, 30, 30, 0, -50], [40, 80, 40, -1.5, 60], [30, 50, 30, 3.6, 30], [30, 50, 30, -3.6, 30], [60, 120, 60, 0.8, 80], [40, 40, 40, 0, -60],
        [40, 70, 40, 2.6, 40], [40, 70, 40, -2.2, -40], [30, 40, 30, 0, 70], [30, 40, 30, 0, -70], [40, 60, 40, 3.2, 50], [40, 60, 40, -2.8, 60], [50, 60, 50, 3.8, 30], [60, 100, 60, -1, 60], [40, 110, 40, 0, 20]] },
    { id: 'riviera', name: 'RIVIERA', title: 'PARIS TO THE COAST', event: 'LE SUMMIT', grip: 1, traffic: 40, weavers: 2, seed: 37,
      road: [[30, 80, 30, 0, 0], [40, 60, 40, -2, -20], [40, 60, 40, 2.6, -20], [40, 60, 40, -3, 10], [40, 60, 40, 3.2, 20], [50, 120, 50, 0, -30], [40, 90, 40, 2, 0],
        [30, 40, 30, -3.8, 20], [30, 40, 30, 3.8, -20], [30, 40, 30, -3.4, 25], [60, 100, 60, 0.8, -40], [40, 70, 40, -2.6, 30], [40, 120, 40, 1.6, 0], [30, 30, 30, 0, 50],
        [30, 30, 30, 0, -50], [40, 60, 40, 3.4, 0], [40, 60, 40, -3.6, -20], [40, 50, 40, 4, 20], [60, 130, 60, -0.8, 0], [40, 60, 40, 3, -30], [40, 60, 40, -3, 30], [40, 80, 40, 2.4, -20], [40, 110, 40, 0, 0]] },
    { id: 'dubai', name: 'DUBAI', title: 'DESERT RUN', event: 'TOKEN OASIS', grip: 1, traffic: 52, weavers: 4, seed: 41,
      road: [[30, 100, 30, 0, 0], [60, 160, 60, 0.8, 20], [50, 100, 50, 0, -20, SAND], [50, 90, 50, -2.4, 30], [40, 40, 40, 0, 60], [40, 40, 40, 0, -70], [60, 120, 60, 2, 0, SAND],
        [50, 200, 50, 0, 0], [40, 60, 40, 3.6, 20], [40, 60, 40, -3.6, -20], [50, 100, 50, 0, 40, SAND], [50, 100, 50, 1.4, -40], [40, 70, 40, -3, 0], [60, 220, 60, 0, 0],
        [40, 50, 40, 4, 30], [40, 80, 40, -1.2, -30, SAND], [40, 60, 40, 3, 0], [40, 60, 40, -4, 20], [60, 160, 60, 0.6, -20], [40, 70, 40, 2.8, 0, SAND], [40, 70, 40, -2.8, 0], [40, 140, 40, 0, 0]] },
    { id: 'tokyo', name: 'TOKYO', title: 'NEON RAIN', event: 'NEON BLOCK WEEK', grip: 0.88, traffic: 60, weavers: 8, seed: 53,
      road: [[30, 80, 30, 0, 0], [30, 50, 30, 3, 0], [30, 50, 30, -3.4, 30], [40, 80, 40, 0, -30], [30, 40, 30, 4, 0], [30, 40, 30, -4, 0], [30, 40, 30, 3.6, 40],
        [50, 100, 50, -1, 0], [30, 30, 30, 0, -40], [30, 60, 30, -3.8, 0], [30, 60, 30, 2.4, 20], [30, 40, 30, 4.4, -20], [50, 140, 50, 0, 0], [30, 50, 30, -4.2, 30],
        [30, 50, 30, 3.2, -30], [30, 40, 30, -3, 0], [30, 40, 30, 4.6, 0], [50, 90, 50, 0.8, 40], [30, 30, 30, 0, -40], [30, 50, 30, -4.4, 0], [30, 50, 30, 4, 0], [30, 60, 30, -2.6, 20],
        [30, 50, 30, 3.6, -20], [40, 120, 40, 0, 0]] },
    { id: 'grid', name: 'THE GRID', title: 'MAINNET', event: 'THE MAINNET', grip: 1, traffic: 56, weavers: 14, seed: 67,
      road: [[30, 80, 30, 0, 0], [40, 40, 40, 0, 80], [40, 40, 40, 0, -80], [40, 60, 40, 3.4, 60], [40, 60, 40, -3.4, -60], [30, 30, 30, 0, 70], [30, 30, 30, 0, -70],
        [30, 30, 30, 0, 70], [30, 30, 30, 0, -70], [40, 70, 40, 4.4, 0], [40, 70, 40, -4.4, 0], [50, 160, 50, 0, 90], [40, 50, 40, 5, -50], [40, 50, 40, -5, -40],
        [30, 40, 30, 3, 80], [30, 40, 30, -3, -80], [60, 140, 60, 1, 0], [30, 40, 30, -4.8, 60], [30, 40, 30, 4.8, -60], [30, 40, 30, -4, 50], [30, 40, 30, 4, -50],
        [40, 40, 40, 0, 100], [40, 40, 40, 0, -100], [40, 60, 40, 5.2, 0], [40, 60, 40, -3.6, 0], [40, 140, 40, 0, 0]] }
  ];
  var stageIdx = {}, carIdx = {};
  STAGES.forEach(function (s, i) { stageIdx[s.id] = i; s.i = i; });
  CARS.forEach(function (c, i) { carIdx[c.id] = i; c.i = i; });

  function rng(seed) {   // mulberry32: whole numbers only
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function easeIn(a, b, t) { return a + (b - a) * t * t; }
  function easeInOut(a, b, t) { return a + (b - a) * t * t * (3 - 2 * t); }

  var RUNOUT = 320, tracks = {};
  function track(id) {
    if (tracks[id]) return tracks[id];
    var st = STAGES[stageIdx[id]], curve = [], y = [0], flag = [], n, k;
    function seg(c, yy, f) { curve.push(c); y.push(yy); flag.push(f || 0); }
    st.road.forEach(function (p) {
      var enter = p[0], hold = p[1], leave = p[2], c = p[3], y0 = y[y.length - 1], y1 = y0 + p[4] * SEG, total = enter + hold + leave, f = p[5] || 0;
      for (n = 0; n < enter; n++) seg(easeIn(0, c, n / enter), easeInOut(y0, y1, (n + 1) / total), f);
      for (n = 0; n < hold; n++) seg(c, easeInOut(y0, y1, (enter + n + 1) / total), f);
      for (n = 0; n < leave; n++) seg(easeInOut(c, 0, n / leave), easeInOut(y0, y1, (enter + hold + n + 1) / total), f);
    });
    var finishSeg = curve.length - 40, yEnd = y[y.length - 1];
    for (n = 0; n < RUNOUT; n++) seg(0, yEnd, 0);
    var T = { id: id, stage: st, n: curve.length, curve: curve, y: y, flag: flag, finishSeg: finishSeg, finishZ: finishSeg * SEG, startSeg: 6, grip: st.grip, cars: [] };
    // Traffic. Every car's place is a formula of the tick, so nothing about it has to be stored or replayed.
    var r = rng(st.seed * 7919 + 13), lanes = [-0.66, 0, 0.66], span = finishSeg - 60;
    for (k = 0; k < st.traffic; k++) {
      var lane = Math.floor(r() * 3), c2 = { x0: lanes[lane] + (r() - 0.5) * 0.08, x1: 0, z0: (50 + (k + r() * 0.8) * span / st.traffic) * SEG, v: MAX * (0.3 + r() * 0.22), period: 0, phase: 0, look: Math.floor(r() * 1000) };
      c2.x1 = c2.x0;
      if (k % Math.max(1, Math.floor(st.traffic / Math.max(1, st.weavers))) === 0 && st.weavers) {   // a lane changer
        var other = lane === 1 ? (r() < 0.5 ? 0 : 2) : 1;
        c2.x1 = lanes[other]; c2.period = 240 + Math.floor(r() * 180); c2.phase = Math.floor(r() * c2.period);
      }
      T.cars.push(c2);
    }
    return (tracks[id] = T);
  }
  // Where a traffic car is at a tick: straight down the road, lane changers slide across and back.
  function carZ(c, tick) { return c.z0 + c.v * tick * DT; }
  function carX(c, tick) {
    if (!c.period) return c.x0;
    var t = ((tick + c.phase) % (c.period * 2)) / c.period;       // 0..2
    var u = t < 1 ? t : 2 - t;                                    // 0..1..0
    u = u < 0.3 ? 0 : u > 0.7 ? 1 : (u - 0.3) / 0.4;
    return c.x0 + (c.x1 - c.x0) * u * u * (3 - 2 * u);
  }

  function newRun(stageId, carId, cruise) {
    var T = track(stageId);
    return { T: T, car: CARS[carIdx[carId]], cruise: !!cruise, pos: T.startSeg * SEG, x: 0, sv: 0, speed: 0, tick: 0, boost: 0, crashes: 0, drafts: 0, done: false, ms: 0,
      passed: new Uint8Array(T.cars.length), rec: [], ev: [] };
  }
  // One tick. inp = (steer + 1) * 2 + brake, steer is -1, 0 or 1.
  function step(S, inp) {
    if (S.done) return;
    var T = S.T, car = S.car, steer = (inp >> 1) - 1, brake = inp & 1, r = S.rec;
    if (r.length && r[r.length - 1][0] === inp) r[r.length - 1][1]++; else r.push([inp, 1]);
    var me = S.pos + PZ, si = Math.floor(me / SEG), curve = T.curve[si] || 0, f = T.flag[si] || 0;
    var grip = car.grip * T.grip * (f & SAND ? 0.62 : 1), pct = S.speed / MAX;
    S.sv += (steer - S.sv) * 0.22;
    var dx = DT * 2.4 * pct;
    S.x += dx * S.sv * (0.82 + 0.18 * grip);
    S.x -= dx * pct * curve * CENT / grip;
    var top = MAX * car.top * (S.boost > 0 ? 1.09 : 1) * (S.cruise ? 0.7 : 1);
    if (brake) S.speed -= MAX * 0.6 * DT;
    else if (S.speed < top) S.speed = Math.min(top, S.speed + ACCEL * car.acc * (1.12 - 0.8 * pct) * (S.boost > 0 ? 1.6 : 1) * DT);
    else S.speed = Math.max(top, S.speed - MAX * 0.12 * DT);
    if ((S.x < -1 || S.x > 1) && S.speed > OFF_LIMIT) S.speed -= MAX * 0.6 * DT;
    if ((f & SAND) && S.speed > MAX * 0.8) S.speed -= MAX * 0.1 * DT;
    if (S.speed < 0) S.speed = 0;
    if (S.x < -2.2) S.x = -2.2; else if (S.x > 2.2) S.x = 2.2;
    if (S.boost > 0) S.boost--;
    var z0 = me;
    S.pos += S.speed * DT; S.tick++; me = S.pos + PZ;
    if (!S.cruise) {
      var cars = T.cars;
      for (var i = 0; i < cars.length; i++) {
        var c = cars[i], cz = carZ(c, S.tick);
        if (S.passed[i]) continue;
        var d = me - cz;
        if (d < -HIT_BACK) continue;
        var ddx = Math.abs(S.x - carX(c, S.tick));
        if (d > HIT_FRONT) {                                   // gone past it
          S.passed[i] = 1;
          if (ddx < NEAR && S.speed > c.v) { S.boost = BOOST_TICKS; S.drafts++; S.ev.push('draft'); }
        } else if (ddx < CAR_HALF && S.speed > c.v) {          // ran into the back of it
          S.speed = c.v * car.shove; S.pos = cz - HIT_BACK - PZ; me = S.pos + PZ; S.crashes++; S.boost = 0; S.ev.push('crash');
        }
      }
      if (me >= T.finishZ) {
        var frac = me > z0 ? (T.finishZ - z0) / (me - z0) : 1;
        S.ms = Math.round((S.tick - 1 + frac) * 1000 / TPS); S.done = true; S.ev.push('finish');
      } else if (S.tick >= MAX_TICKS) { S.done = true; S.ms = 0; }
    } else if (me >= T.finishZ) { S.done = true; S.ev.push('finish'); }
  }

  // ---- A recorded run as text: w1.<stage>.<car>.<ms>.<steering> ----
  var IN = 'ABCDEF';
  function encode(S) {
    return 'w1.' + S.T.stage.i + '.' + S.car.i + '.' + S.ms + '.' + S.rec.map(function (p) { return IN[p[0]] + (p[1] > 1 ? p[1].toString(36) : ''); }).join('');
  }
  function decode(code) {
    var m = /^w1\.(\d)\.(\d)\.(\d{1,7})\.((?:[A-F][0-9a-z]{0,4})+)$/.exec(String(code || ''));
    if (!m || !STAGES[+m[1]] || !CARS[+m[2]]) return null;
    var rec = [], total = 0, re = /([A-F])([0-9a-z]*)/g, q;
    while ((q = re.exec(m[4]))) { var n = q[2] ? parseInt(q[2], 36) : 1; if (!(n > 0)) return null; total += n; if (total > MAX_TICKS) return null; rec.push([IN.indexOf(q[1]), n]); }
    return { stage: STAGES[+m[1]].id, car: CARS[+m[2]].id, ms: +m[3], rec: rec, ticks: total };
  }
  // Steering of a recorded run, tick by tick (for ghosts).
  function player(rec) { var i = 0, left = rec.length ? rec[0][1] : 0; return function () { while (left <= 0 && i < rec.length - 1) { i++; left = rec[i][1]; } if (left <= 0) return 2; left--; return rec[i][0]; }; }
  function replay(R) {
    var S = newRun(R.stage, R.car, false), next = player(R.rec);
    for (var n = 0; n < R.ticks && !S.done; n++) { step(S, next()); S.ev.length = 0; }
    return S;
  }

  // ---- A simple driver, for balance testing (tools/wl-sim.js) and the demo ----
  function bot(S, skill) {
    var T = S.T, me = S.pos + PZ, si = Math.floor(me / SEG), look = Math.floor(8 + 24 * S.speed / MAX), c = 0, i;
    for (i = 0; i < look; i++) c += T.curve[si + i] || 0;
    c /= look;
    var want = Math.max(-0.7, Math.min(0.7, c * 0.22 * skill));          // lean to the inside of what is coming
    var cars = T.cars, lanes = [want, -0.66, 0, 0.66, -0.3, 0.3], best = want, bestCost = 1e9;
    for (var L = 0; L < lanes.length; L++) {
      var lx = lanes[L], cost = Math.abs(lx - S.x) * 0.5 + Math.abs(lx - want) * 0.6;
      for (i = 0; i < cars.length; i++) {
        if (S.passed[i]) continue;
        var d = carZ(cars[i], S.tick) - me; if (d < -200 || d > 2600 + S.speed * 0.25) continue;
        var gap = Math.abs(lx - carX(cars[i], S.tick + 20));
        if (gap < 0.42) cost += 10; else if (skill >= 1 && gap < 0.6) cost -= 0.3;   // the sharp driver skims past for the draft
      }
      if (cost < bestCost) { bestCost = cost; best = lx; }
    }
    var e = best - S.x, steer = e > 0.04 ? 1 : e < -0.04 ? -1 : 0;
    var grip = S.car.grip * T.grip, hard = Math.abs(T.curve[si + 6] || 0) * CENT / grip * (S.speed / MAX);
    var brake = (hard > 1.02 && Math.abs(S.x) > 0.55 * skill + 0.1 && S.x * (T.curve[si + 6] || 0) < 0) ? 1 : 0;
    return (steer + 1) * 2 + brake;
  }

  function fmt(ms) { var m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60, t = Math.floor(ms / 10) % 100; return m + ':' + (s < 10 ? '0' : '') + s + '.' + (t < 10 ? '0' : '') + t; }
  // Medal times per stage, set from tools/wl-sim.js (the best bot run in any car, plus 3%, 10% and 22%).
  var PAR = { miami: [69000, 74000, 82000], denver: [60000, 64000, 71000], riviera: [62000, 66000, 73500], dubai: [78000, 83500, 92500], tokyo: [62500, 66500, 74000], grid: [69500, 74500, 82500] };
  function medal(stage, ms) { var p = PAR[stage]; return !ms ? 0 : ms <= p[0] ? 3 : ms <= p[1] ? 2 : ms <= p[2] ? 1 : 0; }

  var C = { TPS: TPS, DT: DT, SEG: SEG, ROAD_W: ROAD_W, PZ: PZ, MAX: MAX, SAND: SAND, MAX_TICKS: MAX_TICKS, CARS: CARS, STAGES: STAGES, PAR: PAR, stageIdx: stageIdx, carIdx: carIdx,
    track: track, carZ: carZ, carX: carX, newRun: newRun, step: step, encode: encode, decode: decode, replay: replay, player: player, bot: bot, fmt: fmt, medal: medal, rng: rng };
  if (typeof module !== 'undefined' && module.exports) module.exports = C; else root.POF_WL_CORE = C;
})(typeof window !== 'undefined' ? window : this);
