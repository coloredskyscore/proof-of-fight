/* Mempool (/mempool/): the rules. No drawing here, so this file also runs in node (tools/mp-sim.js) and
   on the score server (worker/), which replays every posted run.

   You are the miner. Transactions wait in three mempool slots, each a shape with a fee. Drag them into the
   block (7 x 7) before the timer mines it. A full block pays +50%, a 90% block +20%. A transaction left
   in its slot too long is taken by another miner and replaced. A RUG pays a lot, but every transaction
   touching it pays nothing. Daily: six blocks, the same mempool for everybody. Endless: three lives, and
   a block mined under the fill target is orphaned (pays nothing, costs a life).

   Time is counted in ticks (20 a second) and every move is logged with its tick, so a run can be replayed
   exactly from its code. */
(function (root) {
  'use strict';
  var W = 7, H = 7, CELLS = W * H, TPS = 20;
  var RULES = {
    W: W, H: H, TPS: TPS,
    dailyBlocks: 6,
    expire: 5 * TPS,          // a transaction waits this long in its slot
    refill: 5,                // ticks before an empty slot gets the next one
    between: 34,              // ticks the mined block takes to join the chain
    fullMult: 1.5, fatMult: 1.2, fatFill: 0.9,
    lives: 3
  };
  // Seconds on the clock, by block (0 = first).
  function blockTime(mode, b) { return mode === 'daily' ? [26, 24, 22, 20, 18, 16][b] : Math.max(11, 26 - b * 1.5); }
  // Fees rise as the chain grows.
  function blockMult(b) { return 1 + 0.15 * Math.min(b, 20); }
  // Endless: the share of the block you must fill or it is orphaned.
  function target(b) { return Math.min(0.88, 0.55 + 0.03 * b); }

  // ---------- Shapes (no turning; each direction is its own shape) ----------
  // awk: 0 fits anywhere, 1 takes some thought, 2 awkward. Awkward shapes pay better.
  var SHAPE_SRC = [
    ['dust', 0, 15, ['#']],
    ['two', 0, 14, ['##', '#/#']],
    ['bar3', 0, 8, ['###', '#/#/#']],
    ['bend', 1, 12, ['##/#.', '##/.#', '#./##', '.#/##']],
    ['box', 0, 7, ['##/##']],
    ['bar4', 1, 6, ['####', '#/#/#/#']],
    ['tee', 1, 10, ['###/.#.', '.#./###', '#./##/#.', '.#/##/.#']],
    ['ell', 1, 12, ['#./#./##', '.#/.#/##', '##/#./#.', '##/.#/.#', '###/#..', '###/..#', '#../###', '..#/###']],
    ['zig', 2, 8, ['.##/##.', '##./.##', '#./##/.#', '.#/##/#.']],
    ['plus', 2, 3, ['.#./###/.#.']],
    ['cup', 2, 4, ['#.#/###', '###/#.#', '##/#./##', '##/.#/##']],
    ['corner', 2, 4, ['#../#../###', '..#/..#/###', '###/#../#..', '###/..#/..#']],
    ['slab', 1, 4, ['###/###', '##/##/##']],
    ['whale', 2, 2, ['###/###/###']]
  ];
  var SHAPES = [], PICK = [], pickTotal = 0;
  SHAPE_SRC.forEach(function (src) {
    src[3].forEach(function (pat) {
      var rows = pat.split('/'), cells = [];
      rows.forEach(function (r, y) { for (var x = 0; x < r.length; x++) if (r[x] === '#') cells.push([x, y]); });
      SHAPES.push({ id: SHAPES.length, kind: src[0], awk: src[1], cells: cells, w: rows[0].length, h: rows.length });
      var wgt = src[2] / src[3].length;
      PICK.push(wgt); pickTotal += wgt;
    });
  });
  var TIER = [1, 2, 3.5, 6];                                      // fee per cell, in hundreds of sats
  var TIER_ODDS = [[0.45, 0.36, 0.16, 0.03], [0.35, 0.4, 0.2, 0.05], [0.1, 0.3, 0.4, 0.2]];
  var RUG_RATE = 10;

  // ---------- Dice ----------
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) {
    var a = hash(String(seed)) || 1;
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  function nextTx(G) {
    var r = G.rng() * pickTotal, i = 0;
    while (i < PICK.length - 1 && r >= PICK[i]) { r -= PICK[i]; i++; }
    var sh = SHAPES[i], n = sh.cells.length, odds = TIER_ODDS[sh.awk], t = 0, q = G.rng();
    while (t < 3 && q >= odds[t]) { q -= odds[t]; t++; }
    var rugOdds = G.block === 0 ? 0 : Math.min(0.15, 0.07 + 0.015 * G.block);
    var rug = n >= 2 && n <= 4 && G.rng() < rugOdds;
    var wob = 0.9 + 0.2 * G.rng();
    var fee = Math.round(n * 100 * (rug ? RUG_RATE : TIER[t]) * blockMult(G.block) * wob / 10) * 10;
    return { n: G.made++, shape: sh.id, fee: fee, tier: rug ? 4 : t, rug: rug };
  }

  // ---------- A run ----------
  function create(opt) {
    var G = {
      mode: opt.mode === 'daily' ? 'daily' : 'endless', seed: String(opt.seed),
      tick: 0, block: 0, made: 0, score: 0, lives: RULES.lives, state: 'play', wait: 0,
      grid: new Array(CELLS), placed: [], slots: [null, null, null], blocks: [], log: [], events: []
    };
    G.rng = rng('mempool:' + G.mode + ':' + G.seed);
    openBlock(G);
    for (var s = 0; s < 3; s++) G.slots[s] = { tx: nextTx(G), age: -s * 30, gap: 0 };
    return G;
  }
  function openBlock(G) {
    for (var i = 0; i < CELLS; i++) G.grid[i] = -1;
    G.placed = []; G.filled = 0;
    G.time = Math.round(blockTime(G.mode, G.block) * TPS); G.timeMax = G.time;
    for (var s = 0; s < 3; s++) if (G.slots[s] && G.slots[s].tx) G.slots[s].age = -s * 30;
  }
  function fits(G, tx, x, y) {
    var sh = SHAPES[tx.shape];
    if (x < 0 || y < 0 || x + sh.w > W || y + sh.h > H) return false;
    for (var i = 0; i < sh.cells.length; i++) if (G.grid[(y + sh.cells[i][1]) * W + x + sh.cells[i][0]] !== -1) return false;
    return true;
  }
  function anyFit(G, tx) { for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) if (fits(G, tx, x, y)) return true; return false; }

  // Which placed transactions pay nothing: anything touching a rug (another rug included).
  function rugged(G) {
    var out = [], i, k, c, d, j, DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (i = 0; i < G.placed.length; i++) out.push(false);
    for (i = 0; i < G.placed.length; i++) {
      if (!G.placed[i].tx.rug) continue;
      var sh = SHAPES[G.placed[i].tx.shape];
      for (k = 0; k < sh.cells.length; k++) for (d = 0; d < 4; d++) {
        var x = G.placed[i].x + sh.cells[k][0] + DIRS[d][0], y = G.placed[i].y + sh.cells[k][1] + DIRS[d][1];
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        j = G.grid[y * W + x];
        if (j !== -1 && j !== i) out[j] = true;
      }
    }
    return out;
  }
  // What the open block would pay if it were mined now.
  function worth(G) {
    var dead = rugged(G), fees = 0, lost = 0;
    for (var i = 0; i < G.placed.length; i++) { if (dead[i]) lost += G.placed[i].tx.fee; else fees += G.placed[i].tx.fee; }
    var fill = G.filled / CELLS, full = G.filled === CELLS;
    var mult = full ? RULES.fullMult : fill >= RULES.fatFill ? RULES.fatMult : 1;
    var orphan = G.mode === 'endless' && fill < target(G.block);
    return { fees: fees, lost: lost, fill: fill, full: full, mult: mult, orphan: orphan, pay: orphan ? 0 : Math.round(fees * mult), dead: dead };
  }

  function place(G, slot, x, y) {
    var s = G.slots[slot];
    if (G.state !== 'play' || G.wait > 0 || !s || !s.tx || !fits(G, s.tx, x, y)) return false;
    var tx = s.tx, sh = SHAPES[tx.shape], idx = G.placed.length;
    for (var i = 0; i < sh.cells.length; i++) G.grid[(y + sh.cells[i][1]) * W + x + sh.cells[i][0]] = idx;
    G.placed.push({ tx: tx, x: x, y: y });
    G.filled += sh.cells.length;
    G.log.push([G.tick, slot, x, y]);
    s.tx = null; s.gap = RULES.refill;
    G.events.push({ t: 'place', slot: slot, tx: tx, x: x, y: y });
    if (G.filled === CELLS) mine(G);
    return true;
  }
  function mineNow(G) {
    if (G.state !== 'play' || G.wait > 0) return false;
    G.log.push([G.tick, 3, 0, 0]);
    mine(G);
    return true;
  }
  function mine(G) {
    var v = worth(G), cells = [];
    for (var i = 0; i < CELLS; i++) { var p = G.grid[i]; cells.push(p === -1 ? -1 : v.dead[p] ? 5 : G.placed[p].tx.tier); }
    if (v.orphan) G.lives--;
    G.score += v.pay;
    var b = { no: G.block, fees: v.fees, lost: v.lost, fill: v.fill, full: v.full, mult: v.mult, orphan: v.orphan, pay: v.pay, cells: cells, txs: G.placed.length, left: G.time };
    G.blocks.push(b);
    G.wait = RULES.between;
    G.events.push({ t: 'mine', block: b, dead: v.dead });
  }
  function step(G) {
    if (G.state !== 'play') return;
    G.tick++;
    if (G.wait > 0) {
      if (--G.wait === 0) {
        G.block++;
        if ((G.mode === 'daily' && G.block >= RULES.dailyBlocks) || G.lives <= 0) { G.state = 'over'; G.events.push({ t: 'over' }); return; }
        openBlock(G);
        G.events.push({ t: 'open' });
      }
      return;
    }
    for (var s = 0; s < 3; s++) {
      var sl = G.slots[s];
      if (sl.tx) {
        if (++sl.age >= RULES.expire) { G.events.push({ t: 'expire', slot: s, tx: sl.tx }); sl.tx = null; sl.gap = RULES.refill; }
      } else if (--sl.gap <= 0) {
        sl.tx = nextTx(G); sl.age = 0;
        G.events.push({ t: 'arrive', slot: s, tx: sl.tx });
      }
    }
    if (--G.time <= 0) mine(G);
  }

  // ---------- A run as text (for the leaderboard) ----------
  // mp1.<d|e>.<seed>.<score>.<moves>; a move is the ticks since the last one in base 36, then A, B or C
  // for the slot plus the column and row, or M for "mine now".
  function encode(G) {
    var last = 0, out = '';
    G.log.forEach(function (m) { out += (m[0] - last).toString(36) + (m[1] === 3 ? 'M' : 'ABC'[m[1]] + m[2] + m[3]); last = m[0]; });
    return ['mp1', G.mode === 'daily' ? 'd' : 'e', G.seed, G.score, out].join('.');
  }
  function decode(code) {
    var p = String(code).split('.');
    if (p.length !== 5 || p[0] !== 'mp1' || !/^[de]$/.test(p[1]) || !/^[0-9a-z-]{1,16}$/.test(p[2]) || !/^\d{1,12}$/.test(p[3])) return null;
    var re = /([0-9a-z]+)(M|[ABC][0-6][0-6])/y, moves = [], t = 0, m;
    re.lastIndex = 0;
    while (re.lastIndex < p[4].length) {
      m = re.exec(p[4]);
      if (!m) return null;
      t += parseInt(m[1], 36);
      moves.push(m[2] === 'M' ? [t, 3, 0, 0] : [t, 'ABC'.indexOf(m[2][0]), +m[2][1], +m[2][2]]);
    }
    return { mode: p[1] === 'd' ? 'daily' : 'endless', seed: p[2], score: +p[3], moves: moves };
  }
  // Plays a decoded run again. Returns the finished game, or null if the moves aren't a real run.
  function replay(R, maxTicks) {
    var G = create({ mode: R.mode, seed: R.seed }), i = 0;
    maxTicks = maxTicks || TPS * 60 * 60;
    while (G.state === 'play') {
      while (i < R.moves.length && R.moves[i][0] === G.tick) {
        var m = R.moves[i++];
        if (!(m[1] === 3 ? mineNow(G) : place(G, m[1], m[2], m[3]))) return null;
      }
      if (i < R.moves.length && R.moves[i][0] < G.tick) return null;
      if (G.tick > maxTicks) return null;
      step(G); G.events.length = 0;
    }
    return i === R.moves.length ? G : null;
  }

  // ---------- A player for the balance check and the title screen ----------
  // Returns the move it would make now: {slot, x, y}, {mine: true} or null (wait).
  function bot(G, skill, rnd) {
    if (G.state !== 'play' || G.wait > 0) return null;
    rnd = rnd || Math.random;
    var best = null, bestV = -1e9, DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    function at(x, y) { return x < 0 || y < 0 || x >= W || y >= H ? -2 : G.grid[y * W + x]; }
    for (var s = 0; s < 3; s++) {
      var tx = G.slots[s].tx; if (!tx) continue;
      var sh = SHAPES[tx.shape];
      for (var y = 0; y <= H - sh.h; y++) for (var x = 0; x <= W - sh.w; x++) {
        if (!fits(G, tx, x, y)) continue;
        var mine = {}, k, d, v = tx.fee, touch = 0, seen = {}, holes = 0;
        for (k = 0; k < sh.cells.length; k++) mine[(y + sh.cells[k][1]) * W + x + sh.cells[k][0]] = 1;
        for (k = 0; k < sh.cells.length; k++) for (d = 0; d < 4; d++) {
          var nx = x + sh.cells[k][0] + DIRS[d][0], ny = y + sh.cells[k][1] + DIRS[d][1], g = at(nx, ny);
          if (g === -2) touch++;
          else if (g >= 0) {
            touch++;
            if (!seen[g]) {
              seen[g] = 1;
              if (skill !== 'casual') {
                if (tx.rug) v -= G.placed[g].tx.fee; else if (G.placed[g].tx.rug) v -= tx.fee;
              }
            }
          } else if (!mine[ny * W + nx]) {
            // an empty neighbour: is it now boxed in?
            var open = 0;
            for (var e = 0; e < 4; e++) { var ax = nx + DIRS[e][0], ay = ny + DIRS[e][1]; if (at(ax, ay) === -1 && !mine[ay * W + ax]) open++; }
            if (open === 0) holes += 1; else if (open === 1) holes += 0.3;
            if (tx.rug && skill !== 'casual') v -= 120;      // room next to a rug is poisoned
          }
        }
        v += touch * 22 - holes * (skill === 'casual' ? 60 : 260);
        if (skill === 'casual') v += rnd() * 500;
        if (v > bestV) { bestV = v; best = { slot: s, x: x, y: y }; }
      }
    }
    if (best) return best;
    // Nothing fits. Wait for the mempool to turn over if there is time, else mine.
    return G.time < 3 * TPS || G.filled >= CELLS - 1 ? { mine: true } : null;
  }

  var api = { RULES: RULES, SHAPES: SHAPES, W: W, H: H, CELLS: CELLS, TPS: TPS, create: create, step: step, place: place, mineNow: mineNow, fits: fits, anyFit: anyFit,
    worth: worth, rugged: rugged, blockTime: blockTime, blockMult: blockMult, target: target, encode: encode, decode: decode, replay: replay, bot: bot, rng: rng };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.POF_MP_CORE = api;
})(typeof window !== 'undefined' ? window : this);
