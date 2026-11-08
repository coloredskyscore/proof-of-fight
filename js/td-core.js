/* Tower Defense (?td): the rules, with no drawing in them, so node can run them too (tools/td-sim.js).
   Real time. Enemies walk a path of tiles from the spawn to your base; towers on the open tiles shoot them.
   Kills pay tokens, and tokens buy towers. Every unit here is in tiles and seconds.

   The map is a grid of tiles, each with a height of 0, 1 or 2. A tower gets +1 range for each level it
   stands above the lawn. Enemies follow the path's centerline: `dist` is how far along it they are. */
(function (root, factory) {
  var td = factory();
  if (typeof module === 'object' && module.exports) module.exports = td;
  else root.POF_TD_CORE = td;
})(this, function () {
  'use strict';

  // ---------- Towers ----------
  // range in tiles, dmg per hit, rate in shots a second, cost in tokens. air: can it hit flyers.
  var TOWERS = {
    strike:  { cost: 100, range: 3,   dmg: 12, rate: 2.5,     air: true,  shot: 16 },          // tracer speed, tiles/s
    privacy: { cost: 80,  range: 2.5, dps: 5,  slow: 0.4,     air: false },                    // a field, always on
    mint:    { cost: 150, range: 4.5, dmg: 40, rate: 1 / 1.6, air: false, splash: 1, minRange: 1, flight: 0.8 }
  };
  var ORDER = ['strike', 'privacy', 'mint'];
  var SELL = 0.7;

  // ---------- Upgrades ----------
  // Tier 2 is one straight upgrade; tier 3 is a choice of two paths, a or b. `set` replaces those numbers
  // (a tier 3 sits on top of tier 2). What you pay adds to what the tower sells for.
  //   strike  crit: chance of a 2.5x hit.   privacy  freeze: seconds frozen, every freezeEvery seconds;
  //   doxx: extra damage taken inside the fog.   mint  cluster: bomblets that land along the path after
  //   the blast; burn: damage a second in the fire it leaves, for burnT seconds.
  var UPGRADES = {
    strike: {
      2: { cost: 90, name: 'Hot Rounds', set: { dmg: 21, range: 3.5 } },
      a: { cost: 220, name: 'Minigun', blurb: 'Fires twice as fast, shorter reach', set: { rate: 5, range: 3 } },
      b: { cost: 220, name: 'Sniper', blurb: 'Huge hits from far away, can crit', set: { dmg: 110, rate: 0.5, range: 6, crit: 0.25, shot: 34 } }
    },
    privacy: {
      2: { cost: 70, name: 'Thick Fog', set: { dps: 10, slow: 0.5, range: 3 } },
      a: { cost: 180, name: 'Freeze', blurb: 'Freezes everyone in it for 1s, every 6s', set: { freeze: 1, freezeEvery: 6 } },
      b: { cost: 180, name: 'Doxx', blurb: 'Enemies in the fog take 25% more damage', set: { doxx: 0.25 } }
    },
    mint: {
      2: { cost: 120, name: 'Heavy Coins', set: { dmg: 70, splash: 1.2 } },
      a: { cost: 240, name: 'Cluster', blurb: 'Each bomb splits into 4 more', set: { cluster: 4, bomblet: 30 } },
      b: { cost: 240, name: 'Mega Mint', blurb: 'One huge blast that leaves fire', set: { dmg: 150, splash: 1.6, rate: 1 / 2.4, burn: 20, burnT: 3 } }
    }
  };
  var BOMBLET = { splash: 0.7, flight: 0.35, spacing: 0.8 };

  // ---------- The node ----------
  // The 4th button upgrades the node itself, any time. From level 1 it sends block runners: while enemies are
  // out, a block leaves the node every `every` seconds, races up the path at `speed` tiles a second and slams
  // into the first enemy it meets for dmg (armor counts), then breaks. Level 3 is a choice: train (that many
  // blocks in a row) or burst (the crash hits everyone within `burst` tiles). Flyers pass over them.
  var NODE = {
    1: { cost: 200, name: 'Block Runners', blurb: 'Sends a block up the path every 3s', set: { every: 3, dmg: 35, speed: 5 } },
    2: { cost: 200, name: 'Faster Blocks', blurb: 'A block every 2s, harder and faster', set: { every: 2, dmg: 50, speed: 6.5 } },
    a: { cost: 300, name: 'Block Train', blurb: 'Sends 3 blocks in a row', set: { train: 3 } },
    b: { cost: 300, name: 'Block Burst', blurb: 'Each block bursts, hitting everyone near it', set: { burst: 1.1, dmg: 70 } }
  };
  var BLOCK_GAP = 0.5;     // tiles between the blocks of a train
  function nodeStats(level, path) {
    var s = { train: 1, burst: 0 };
    if (level >= 1) Object.assign(s, NODE[1].set);
    if (level >= 2) Object.assign(s, NODE[2].set);
    if (level >= 3 && path) Object.assign(s, NODE[path].set);
    return s;
  }
  var BURN_R = 1;
  function towerStats(type, tier, path) {
    var s = Object.assign({}, TOWERS[type]);
    if (tier >= 2) Object.assign(s, UPGRADES[type][2].set);
    if (tier >= 3 && path) Object.assign(s, UPGRADES[type][path].set);
    return s;
  }

  // ---------- Enemies ----------
  // hp at wave 1, speed in tiles/s, armor comes off every hit (not the fog), reward in tokens, leak = integrity lost.
  var ENEMIES = {
    walker:   { hp: 100,  speed: 1.0,  armor: 0,  reward: 5,  leak: 1 },
    swarm:    { hp: 30,   speed: 1.25, armor: 0,  reward: 2,  leak: 1 },
    sprinter: { hp: 60,   speed: 2.0,  armor: 0,  reward: 6,  leak: 1 },
    armored:  { hp: 400,  speed: 0.6,  armor: 8,  reward: 20, leak: 3, heavy: true },
    flyer:    { hp: 80,   speed: 1.1,  armor: 0,  reward: 8,  leak: 1, fly: true },
    support:  { hp: 150,  speed: 0.85, armor: 0,  reward: 12, leak: 1, heal: 12, healR: 1.6 },
    boss:     { hp: 1300, speed: 0.45, armor: 6, reward: 80, leak: 8, heavy: true, mini: true }
  };
  var GROWTH = 0.12;        // enemy hp grows this much a wave (compounding)

  var RULES = {
    tokens: 300,            // to start
    integrity: 20,
    countdown: 15,          // seconds between waves, then the next one starts by itself
    earlyPay: 2,            // tokens per second left on the countdown when you call a wave early
    release: 1.2,           // seconds between a wave's call (the Capitol's shout) and the first enemy out the door
    clearBonus: function (w) { return 20 + 4 * w; }
  };

  // ---------- The Hearing ----------
  // Rows top to bottom. '#' the Capitol and its steps, 't' trees, 'w' the reflecting pool, 'B' your base,
  // '.' open ground. The path is laid over this from `path`; its tiles can't be built on.
  // The grid is fitted to Grok's painting (tools/td_map.py): `art` is where the painting sits, in tiles
  // from the grid's top left corner (it runs past the grid: the sky and dome above, the border walls).
  var HEARING = {
    id: 'hearing', name: 'The Hearing', boss: 'warren',
    cols: 12, rows: 20,
    art: { pic: 'hearing-map', x: -0.538, y: -1.587, w: 12.949, h: 21.638 },
    tiles: [
      'tt#########t',
      'tt#########t',
      '....##.##...',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '.t........t.',
      '............',
      '............',
      'ww..........',
      'ww..........',
      'ww..........',
      '............',
      '...........t',
      't...........',
      '...BBB......',
      '...BBB....t.'
    ],
    heights: [
      '222222222222',
      '222222222222',
      '222222222222',
      '222222222222',
      '222222222222',
      '111111111111',
      '111111111111',
      '111111111111',
      '111111111111',
      '000000000000',
      '000000000000',
      '000011110000',
      '000011110000',
      '000000000011',
      '000000000011',
      '000000000011',
      '000000000000',
      '000000000000',
      '000000000000',
      '000000000000'
    ],
    // Waypoints, tile coordinates (the path runs through tile centers). Starts at the Capitol door.
    path: [[6, 1], [6, 4], [2, 4], [2, 7], [9, 7], [9, 10], [3, 10], [3, 13], [8, 13], [8, 16], [4, 16], [4, 18]],
    base: [4, 18.8],        // where the node stands (center), tile coordinates: on the round pad
    // Each wave: [type, count, gap between them (s), start (s into the wave)].
    waves: [
      [['walker', 8, 1.4, 0]],
      [['walker', 6, 1.2, 0], ['swarm', 10, 0.35, 8]],
      [['sprinter', 6, 1.0, 0], ['walker', 8, 1.1, 3]],
      [['swarm', 16, 0.3, 0], ['walker', 6, 1.0, 2], ['armored', 1, 0, 9]],
      [['walker', 10, 0.9, 0], ['armored', 2, 4, 4], ['boss', 1, 0, 14]],
      [['flyer', 6, 1.2, 0], ['walker', 10, 0.8, 2]],
      [['sprinter', 10, 0.6, 0], ['support', 2, 5, 2], ['walker', 10, 0.8, 3]],
      [['armored', 4, 3, 0], ['swarm', 20, 0.25, 3], ['support', 2, 4, 6]],
      [['flyer', 10, 0.8, 0], ['sprinter', 10, 0.5, 4]],
      [['walker', 14, 0.6, 0], ['armored', 4, 2.5, 2], ['support', 2, 5, 6], ['boss', 1, 0, 12]],
      [['swarm', 30, 0.2, 0], ['flyer', 8, 1.0, 5]],
      [['armored', 6, 2, 0], ['sprinter', 14, 0.4, 4], ['support', 3, 3, 3]],
      [['flyer', 14, 0.6, 0], ['walker', 16, 0.5, 3]],
      [['boss', 2, 10, 0], ['swarm', 24, 0.2, 3], ['armored', 5, 2, 6]],
      [['walker', 16, 0.4, 0], ['sprinter', 12, 0.4, 4], ['support', 4, 3, 5], ['armored', 6, 2, 6], ['flyer', 10, 0.7, 8], ['boss', 2, 8, 14]]
    ]
  };
  var MAPS = { hearing: HEARING };

  // ---------- Map setup ----------
  function prepMap(M) {
    var pts = M.path.map(function (p) { return { x: p[0] + 0.5, y: p[1] + 0.5 }; });
    var segs = [], total = 0, onPath = {};
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y);
      segs.push({ a: a, b: b, len: len, at: total });
      total += len;
      // every tile the segment crosses (the path only runs straight across or down)
      var c0 = Math.floor(a.x), r0 = Math.floor(a.y), c1 = Math.floor(b.x), r1 = Math.floor(b.y);
      for (var c = Math.min(c0, c1); c <= Math.max(c0, c1); c++)
        for (var r = Math.min(r0, r1); r <= Math.max(r0, r1); r++) onPath[c + ',' + r] = true;
    }
    function tile(c, r) { return (M.tiles[r] || '')[c] || '#'; }
    function height(c, r) { return +((M.heights[r] || '')[c] || 0); }
    // A tile you can build on: open ground, not the path.
    function open(c, r) { return c >= 0 && r >= 0 && c < M.cols && r < M.rows && tile(c, r) === '.' && !onPath[c + ',' + r]; }
    // tiles touching the path (corners too)
    var nearPath = {};
    Object.keys(onPath).forEach(function (k) {
      var p = k.split(',').map(Number);
      for (var dc = -1; dc <= 1; dc++) for (var dr = -1; dr <= 1; dr++) nearPath[(p[0] + dc) + ',' + (p[1] + dr)] = true;
    });
    return {
      def: M, pts: pts, segs: segs, length: total, onPath: onPath, nearPath: nearPath,
      tile: tile, height: height, open: open,
      // the point `d` tiles along the path
      at: function (d) {
        d = Math.max(0, Math.min(total, d));
        for (var i = 0; i < segs.length; i++) {
          var s = segs[i];
          if (d <= s.at + s.len || i === segs.length - 1) {
            var t = s.len ? (d - s.at) / s.len : 0;
            return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t, dx: (s.b.x - s.a.x) / s.len, dy: (s.b.y - s.a.y) / s.len };
          }
        }
      }
    };
  }

  // ---------- A game ----------
  function create(opts) {
    opts = opts || {};
    var map = prepMap(MAPS[opts.map || 'hearing']);
    var G = {
      map: map, time: 0,
      tokens: RULES.tokens, integrity: RULES.integrity, maxIntegrity: RULES.integrity,
      wave: 0,                      // waves started
      waves: map.def.waves.length,
      phase: 'ready',               // ready (before wave 1), wave, break (countdown), won, lost
      countdown: 0,
      enemies: [], towers: [], shots: [], patches: [], blocks: [], events: [],
      node: { type: 'node', level: 0, path: null, s: nodeStats(0), cool: 0, spent: 0, kills: 0, dealt: 0 },
      spawns: [], waveT: 0, nextId: 1, kills: 0, leaks: 0
    };

    function emit(type, data) { data = data || {}; data.type = type; G.events.push(data); }
    function hpMult(w) { return Math.pow(1 + GROWTH, w - 1); }

    function spawn(type) {
      var E = ENEMIES[type], hp = Math.round(E.hp * hpMult(G.wave));
      var e = { id: G.nextId++, type: type, hp: hp, maxHp: hp, speed: E.speed, armor: E.armor || 0, fly: !!E.fly,
        heavy: !!E.heavy, dist: 0, slowT: 0, alive: true, lane: (Math.random() - 0.5) * (type === 'boss' ? 0 : 0.36), born: G.time };
      var p = map.at(0);
      e.x = p.x; e.y = p.y; e.dx = p.dx; e.dy = p.dy;
      G.enemies.push(e);
      emit('spawn', { e: e });
      return e;
    }

    function startWave() {
      if (G.phase !== 'ready' && G.phase !== 'break') return false;
      if (G.phase === 'break' && G.countdown > 0.5) {
        var pay = Math.ceil(G.countdown) * RULES.earlyPay;
        G.tokens += pay;
        emit('early', { tokens: pay });
      }
      G.wave++;
      G.phase = 'wave';
      G.waveT = -RULES.release;
      G.spawns = [];
      map.def.waves[G.wave - 1].forEach(function (g) {
        for (var k = 0; k < g[1]; k++) G.spawns.push({ t: g[3] + k * g[2], type: g[0] });
      });
      G.spawns.sort(function (a, b) { return a.t - b.t; });
      emit('wave', { wave: G.wave, boss: G.spawns.some(function (s) { return s.type === 'boss'; }) });
      return true;
    }

    function damage(e, amount, pierce, by) {
      if (!e.alive) return;
      var d = pierce ? amount : Math.max(1, amount - e.armor);
      if (e.doxxT > 0) d *= 1 + e.doxx;
      e.hp -= d;
      if (by) by.dealt = (by.dealt || 0) + d;
      if (e.hp <= 0) {
        e.alive = false;
        var R = ENEMIES[e.type].reward;
        G.tokens += R;
        G.kills++;
        if (by) by.kills = (by.kills || 0) + 1;
        emit('kill', { e: e, tokens: R, by: by && by.type });
      }
    }

    function inRange(t, e, range) {
      return Math.hypot(e.x - t.x, e.y - t.y) <= range;
    }
    // The enemy furthest along the path that the tower can hit.
    function firstTarget(t, range, air, minRange) {
      var best = null;
      for (var i = 0; i < G.enemies.length; i++) {
        var e = G.enemies[i];
        if (!e.alive || (e.fly && !air)) continue;
        var d = Math.hypot(e.x - t.x, e.y - t.y);
        if (d > range || (minRange && d < minRange)) continue;
        if (!best || e.dist > best.dist) best = e;
      }
      return best;
    }

    function canBuild(type, c, r) {
      if (!TOWERS[type] || !map.open(c, r)) return false;
      if (G.towers.some(function (t) { return t.c === c && t.r === r; })) return false;
      return true;
    }
    function build(type, c, r) {
      var T = TOWERS[type];
      if (!canBuild(type, c, r) || G.tokens < T.cost) return null;
      G.tokens -= T.cost;
      var h = map.height(c, r);
      var t = { id: G.nextId++, type: type, c: c, r: r, x: c + 0.5, y: r + 0.5, h: h, tier: 1, path: null, s: towerStats(type, 1),
        range: T.range + h, cool: 0, angle: Math.PI / 5, spent: T.cost, kills: 0, dealt: 0, fired: 0 };
      G.towers.push(t);
      emit('build', { t: t });
      return t;
    }
    // What a tower can become next: [{ key, tier, cost, name, blurb }]. Tier 1 has one, tier 2 has two, tier 3 none.
    function upgradeOptions(t) {
      var U = UPGRADES[t.type];
      if (t.tier === 1) return [{ key: '2', tier: 2, cost: U[2].cost, name: U[2].name }];
      if (t.tier === 2) return ['a', 'b'].map(function (k) { return { key: k, tier: 3, cost: U[k].cost, name: U[k].name, blurb: U[k].blurb }; });
      return [];
    }
    function upgrade(id, key) {
      var t = G.towers.find(function (x) { return x.id === id; });
      if (!t) return null;
      var o = upgradeOptions(t).find(function (x) { return x.key === String(key); });
      if (!o || G.tokens < o.cost) return null;
      G.tokens -= o.cost;
      t.spent += o.cost;
      t.tier = o.tier;
      if (o.tier === 3) t.path = o.key;
      t.s = towerStats(t.type, t.tier, t.path);
      t.range = t.s.range + t.h;
      if (t.s.freeze) t.freezeCool = 1;
      emit('upgrade', { t: t, tier: t.tier, path: t.path, name: o.name });
      return t;
    }
    function sell(id) {
      var k = G.towers.findIndex(function (t) { return t.id === id; });
      if (k < 0) return 0;
      var t = G.towers[k], back = Math.floor(t.spent * SELL);
      G.towers.splice(k, 1);
      G.tokens += back;
      emit('sell', { t: t, tokens: back });
      return back;
    }

    function stepTowers(dt) {
      G.towers.forEach(function (t) {
        var T = t.s;
        t.cool = Math.max(0, t.cool - dt);
        if (t.type === 'privacy') {
          t.active = false;
          var held = [];
          G.enemies.forEach(function (e) {
            if (!e.alive || e.fly || !inRange(t, e, t.range)) return;
            e.slowT = 0.15;
            e.slowK = Math.max(e.slowK || 0, T.slow);
            if (T.doxx) { e.doxxT = 0.15; e.doxx = T.doxx; }
            t.active = true;
            held.push(e);
            damage(e, T.dps * dt, true, t);
          });
          if (T.freeze) {
            t.freezeCool = Math.max(0, t.freezeCool - dt);
            if (held.length && t.freezeCool <= 0) {
              held.forEach(function (e) { e.stunT = Math.max(e.stunT || 0, e.heavy ? T.freeze / 2 : T.freeze); });
              t.freezeCool = T.freezeEvery;
              emit('freeze', { t: t, n: held.length });
            }
          }
          return;
        }
        var e = firstTarget(t, t.range, T.air, T.minRange);
        if (!e) return;
        t.angle = Math.atan2(e.y - t.y, e.x - t.x);
        if (t.cool > 0) return;
        t.cool = 1 / T.rate;
        t.fired++;
        if (t.type === 'strike') {
          var crit = !!T.crit && Math.random() < T.crit;
          G.shots.push({ kind: 'bullet', from: t, target: e, x: t.x, y: t.y, speed: T.shot, dmg: T.dmg * (crit ? 2.5 : 1), crit: crit, big: !!T.crit });
          emit('fire', { t: t, e: e });
        } else if (t.type === 'mint') {
          // Lead the target: aim where it will be when the coin lands.
          var slow = e.stunT > 0 ? 0 : e.slowT > 0 ? 1 - (e.slowK || TOWERS.privacy.slow) : 1;
          var ahead = e.dist + e.speed * slow * T.flight;
          var p = map.at(ahead);
          G.shots.push({ kind: 'coin', from: t, x0: t.x, y0: t.y, tx: p.x, ty: p.y, ahead: ahead, t: 0, dur: T.flight, dmg: T.dmg, s: T });
          emit('fire', { t: t, tx: p.x, ty: p.y, dur: T.flight });
        }
      });
    }


    // ---------- The node's blocks ----------
    // What the node can become next: [{ key, level, cost, name, blurb }].
    function nodeOptions() {
      var n = G.node;
      if (n.level < 2) { var k = String(n.level + 1); return [{ key: k, level: n.level + 1, cost: NODE[k].cost, name: NODE[k].name, blurb: NODE[k].blurb }]; }
      if (n.level === 2) return ['a', 'b'].map(function (k) { return { key: k, level: 3, cost: NODE[k].cost, name: NODE[k].name, blurb: NODE[k].blurb }; });
      return [];
    }
    function upgradeNode(key) {
      var o = nodeOptions().find(function (x) { return x.key === String(key); });
      if (!o || G.tokens < o.cost) return null;
      G.tokens -= o.cost;
      var n = G.node;
      n.spent += o.cost;
      n.level = o.level;
      if (o.level === 3) n.path = o.key;
      n.s = nodeStats(n.level, n.path);
      if (o.level === 1) n.cool = 0.6;
      emit('node', { level: n.level, path: n.path, name: o.name });
      return n;
    }
    function stepNode(dt) {
      var n = G.node;
      if (!n.level) return;
      n.cool = Math.max(0, n.cool - dt);
      if (n.cool > 0 || !G.enemies.some(function (e) { return e.alive && !e.fly; })) return;
      n.cool = n.s.every;
      // a train comes out one after another: the later ones start further back inside the node
      for (var k = 0; k < n.s.train; k++) G.blocks.push({ id: G.nextId++, dist: map.length + k * BLOCK_GAP, speed: n.s.speed, dmg: n.s.dmg, burst: n.s.burst });
      emit('block', { n: n.s.train });
    }
    function stepBlocks(dt) {
      // the ground enemy closest to the node is the first one a block meets
      var front = null;
      G.enemies.forEach(function (e) { if (e.alive && !e.fly && (!front || e.dist > front.dist)) front = e; });
      G.blocks = G.blocks.filter(function (b) {
        b.dist -= b.speed * dt;
        if (b.dist <= 0) return false;
        if (!front || !front.alive || b.dist > front.dist + 0.25 || b.dist > map.length) return true;
        var x = front.x, y = front.y, hit = 0;
        if (b.burst) G.enemies.forEach(function (e) {
          if (e.alive && !e.fly && Math.hypot(e.x - x, e.y - y) <= b.burst) { damage(e, b.dmg, false, G.node); hit++; }
        });
        else { damage(front, b.dmg, false, G.node); hit = 1; }
        emit('blockhit', { x: x, y: y, n: hit, burst: b.burst, b: b });
        front = null;
        G.enemies.forEach(function (e) { if (e.alive && !e.fly && (!front || e.dist > front.dist)) front = e; });
        return false;
      });
    }

    function stepShots(dt) {
      G.shots = G.shots.filter(function (s) {
        if (s.kind === 'bullet') {
          var e = s.target;
          if (!e.alive) { emit('fizzle', { x: s.x, y: s.y }); return false; }
          var dx = e.x - s.x, dy = e.y - s.y, d = Math.hypot(dx, dy), step = s.speed * dt;
          if (d <= step + 0.15) {
            damage(e, s.dmg, false, s.from);
            emit('hit', { x: e.x, y: e.y, e: e, armor: e.armor > 0, crit: s.crit, big: s.big });
            return false;
          }
          s.x += dx / d * step; s.y += dy / d * step;
          return true;
        }
        s.t += dt;
        if (s.t < s.dur) return true;
        if (s.kind === 'coin' || s.kind === 'bomblet') {
          var R = s.kind === 'coin' ? s.s.splash : BOMBLET.splash, n = 0;
          G.enemies.forEach(function (e) {
            if (!e.alive || e.fly) return;
            if (Math.hypot(e.x - s.tx, e.y - s.ty) <= R) { damage(e, s.dmg, false, s.from); n++; }
          });
          emit('boom', { x: s.tx, y: s.ty, n: n, r: R, small: s.kind === 'bomblet', mega: s.kind === 'coin' && !!s.s.burn });
          if (s.kind === 'coin' && s.s.cluster) {
            // Cluster: bomblets scatter along the path ahead of and behind the blast
            for (var k = 0; k < s.s.cluster; k++) {
              var off = (k - (s.s.cluster - 1) / 2) * BOMBLET.spacing;
              var q = map.at(s.ahead + off);
              born.push({ kind: 'bomblet', from: s.from, x0: s.tx, y0: s.ty, tx: q.x, ty: q.y, t: -k * 0.04, dur: BOMBLET.flight, dmg: s.s.bomblet });
            }
          }
          if (s.kind === 'coin' && s.s.burn) G.patches.push({ x: s.tx, y: s.ty, r: BURN_R, dps: s.s.burn, t: s.s.burnT, max: s.s.burnT, by: s.from });
        }
        return false;
      });
      if (born.length) { G.shots = G.shots.concat(born); born = []; }
    }
    var born = [];    // shots made by other shots this frame (Cluster's bomblets)

    // Mega Mint's fire: a patch on the path that burns whoever walks through it.
    function stepPatches(dt) {
      G.patches = G.patches.filter(function (f) {
        f.t -= dt;
        G.enemies.forEach(function (e) {
          if (e.alive && !e.fly && Math.hypot(e.x - f.x, e.y - f.y) <= f.r) damage(e, f.dps * dt, true, f.by);
        });
        return f.t > 0;
      });
    }

    function stepEnemies(dt) {
      // Healers first, so a heal lands this frame.
      G.enemies.forEach(function (e) {
        var E = ENEMIES[e.type];
        if (!e.alive || !E.heal) return;
        G.enemies.forEach(function (o) {
          if (o.alive && o !== e && o.hp < o.maxHp && Math.hypot(o.x - e.x, o.y - e.y) <= E.healR) o.hp = Math.min(o.maxHp, o.hp + E.heal * dt);
        });
      });
      G.enemies.forEach(function (e) {
        if (!e.alive) return;
        var slow = e.slowT > 0 ? 1 - (e.slowK || TOWERS.privacy.slow) : 1;
        e.slowT = Math.max(0, e.slowT - dt);
        e.slowK = 0;                          // the fog sets it again each frame
        e.doxxT = Math.max(0, (e.doxxT || 0) - dt);
        if (e.stunT > 0) { e.stunT -= dt; slow = 0; }
        e.dist += e.speed * slow * dt;
        if (e.dist >= map.length) {
          e.alive = false;
          e.leaked = true;
          var L = ENEMIES[e.type].leak;
          G.integrity = Math.max(0, G.integrity - L);
          G.leaks += L;
          emit('leak', { e: e, lost: L });
          return;
        }
        var p = map.at(e.dist);
        e.x = p.x; e.y = p.y; e.dx = p.dx; e.dy = p.dy;
      });
      G.enemies = G.enemies.filter(function (e) { return e.alive; });
    }

    function step(dt) {
      if (G.phase === 'won' || G.phase === 'lost') return;
      G.time += dt;
      if (G.phase === 'wave') {
        G.waveT += dt;
        while (G.spawns.length && G.spawns[0].t <= G.waveT) spawn(G.spawns.shift().type);
      }
      stepEnemies(dt);
      stepTowers(dt);
      stepNode(dt);
      stepBlocks(dt);
      stepShots(dt);
      stepPatches(dt);
      if (G.integrity <= 0) { G.phase = 'lost'; emit('lost'); return; }
      if (G.phase === 'wave' && !G.spawns.length && !G.enemies.length) {
        var bonus = RULES.clearBonus(G.wave);
        G.tokens += bonus;
        emit('clear', { wave: G.wave, tokens: bonus });
        if (G.wave >= G.waves) { G.phase = 'won'; emit('won'); return; }
        G.phase = 'break';
        G.countdown = RULES.countdown;
      } else if (G.phase === 'break') {
        G.countdown -= dt;
        if (G.countdown <= 0) startWave();
      }
    }

    function stars() { return G.integrity >= G.maxIntegrity ? 3 : G.integrity > G.maxIntegrity / 2 ? 2 : 1; }
    // What the next wave holds, for the preview: [[type, count], ...]
    function preview(w) {
      var list = map.def.waves[(w || G.wave + 1) - 1];
      if (!list) return [];
      var out = {};
      list.forEach(function (g) { out[g[0]] = (out[g[0]] || 0) + g[1]; });
      return Object.keys(out).map(function (k) { return [k, out[k]]; });
    }

    G.step = step; G.startWave = startWave; G.build = build; G.sell = sell; G.canBuild = canBuild;
    G.upgrade = upgrade; G.upgradeOptions = upgradeOptions; G.nodeOptions = nodeOptions; G.upgradeNode = upgradeNode;
    G.stars = stars; G.preview = preview;
    G.sellValue = function (t) { return Math.floor(t.spent * SELL); };
    return G;
  }

  return { TOWERS: TOWERS, ORDER: ORDER, UPGRADES: UPGRADES, NODE: NODE, ENEMIES: ENEMIES, RULES: RULES, MAPS: MAPS, GROWTH: GROWTH, SELL: SELL,
    create: create, prepMap: prepMap, towerStats: towerStats };
});
